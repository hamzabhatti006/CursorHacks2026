/**
 * TabMind — Extension core (P1: Extension Systems Lead)
 *
 * Purpose: Service worker for tab monitoring, distraction score, nudge triggering,
 * and Shield Mode orchestration. Coordinates with blocker, notifications, and storage.
 *
 * TODO (P1):
 * - Subscribe to tab events (onCreated, onUpdated, onActivated) and track switch frequency.
 * - Compute distraction score from: fast tab switches, open/return to known distraction domains, tab count.
 * - Apply score decay over time.
 * - When score crosses threshold, trigger nudge (respect 5min cooldown).
 * - Handle message "ACTIVATE_SHIELD": get all tabs → classify work vs distraction → close/suppress distractions → call backend for goal + Quest → store result.
 * - Handle message "GET_STATE": return current state from storage for popup.
 * - Expose clean state shape for popup (see shared/schema/stateSchema.json).
 */

/**
 * TabMind — Service Worker / Background Core
 *
 * Responsibilities
 * - Monitor tab behavior
 * - Track distraction score
 * - Trigger nudges
 * - Orchestrate Shield Mode
 * - Respond to popup/content messages
 *
 * Notes
 * - This is intentionally scaffold-first: handlers are wired, logic is mostly empty.
 * - Fill in one section at a time.
 * - Keep popup state shape stable as you build.
 */

"use strict";

importScripts("storage.js", "blocker.js", "notifications.js");

const DISTRACTION_THRESHOLD = 8;
const SWITCH_WINDOW_MS = 60 * 1000;
const MAX_RECENT_SWITCHES_TRACKED = 50;
const BACKEND_BASE_URL = "http://localhost:8000";

const recordRecentSwitch = async () => {
  const state = await getState();
  const now = Date.now();
  const cutoff = now - SWITCH_WINDOW_MS;

  const recentSwitches = [...state.recentSwitches, now]
    .filter((timestamp) => timestamp >= cutoff)
    .slice(-MAX_RECENT_SWITCHES_TRACKED);

  await setState({ recentSwitches });
  return recentSwitches;
};

const calculateScoreDelta = ({
  isDistraction,
  recentSwitchCount,
  openTabCount,
}) => {
  let delta = 1; // every tab switch adds at least 1 (rapid switching = higher score)

  if (recentSwitchCount >= 4) delta += 2;
  if (recentSwitchCount >= 8) delta += 2;
  if (isDistraction) delta += 4;
  if (openTabCount >= 10) delta += 1;
  if (openTabCount >= 15) delta += 1;

  return delta;
};

const decayScore = async () => {
  const state = await getState();
  if (state.distractionScore <= 0) return;
  await setState({
    distractionScore: Math.max(0, state.distractionScore - 1),
  });
};

const trackTabSwitch = async (activeInfo) => {
  const activeTab = await chrome.tabs.get(activeInfo.tabId);
  const recentSwitches = await recordRecentSwitch();
  const allTabs = await chrome.tabs.query({});

  const isDistraction = isDistractionUrl(activeTab.url);
  const scoreDelta = calculateScoreDelta({
    isDistraction,
    recentSwitchCount: recentSwitches.length,
    openTabCount: allTabs.length,
  });

  const state = await getState();

  await setState({
    lastActiveTabId: activeInfo.tabId,
    lastActiveAt: Date.now(),
    distractionScore: state.distractionScore + scoreDelta,
  });

  const nextState = await getState();

  if (nextState.distractionScore >= DISTRACTION_THRESHOLD) {
    await showNudge();
    await sendShieldPromptToActiveTab();
  }
};

const PROMPT_COOLDOWN_MS = 5 * 60 * 1000;
let lastShieldPromptSentAt = 0;

const sendShieldPromptToActiveTab = async () => {
  const now = Date.now();
  if (now - lastShieldPromptSentAt < PROMPT_COOLDOWN_MS) return;
  lastShieldPromptSentAt = now;
  try {
    const win = await chrome.windows.getLastFocused();
    if (!win?.id) return;
    const tabs = await chrome.tabs.query({ active: true, windowId: win.id });
    const tab = tabs[0];
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "SHOW_SHIELD_PROMPT" });
  } catch (e) {
    /* tab may not have content script ready or not injectable */
  }
};

const openSidePanelForWindow = async (windowId) => {
  if (!windowId) return;
  try {
    await chrome.sidePanel.open({ windowId });
  } catch (e) {
    console.log("[TabMind] Could not open side panel", e);
  }
};

const trackTabUpdate = async (tabId, changeInfo, tab) => {
  if (!changeInfo?.url && changeInfo?.status !== "complete") return;

  const allTabs = await chrome.tabs.query({});
  const isDistraction = isDistractionUrl(changeInfo?.url || tab?.url);

  let scoreDelta = 0;
  if (isDistraction) scoreDelta += 2;
  if (allTabs.length >= 15) scoreDelta += 1;

  if (scoreDelta === 0) return;

  const state = await getState();
  await setState({
    distractionScore: state.distractionScore + scoreDelta,
  });

  const nextState = await getState();
  if (nextState.distractionScore >= DISTRACTION_THRESHOLD) {
    await showNudge();
    await sendShieldPromptToActiveTab();
  }
};

const requestQuestFromBackend = async (tabs) => {
  const payload = {
    tabs: tabs.map((tab) => ({
      title: tab?.title ?? "",
      url: normalizeUrl(tab?.url),
    })),
  };

  const response = await fetch(`${BACKEND_BASE_URL}/generate-quest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`backend error: ${response.status}`);
  }

  const data = await response.json();
  return {
    goal: data.goal ?? "Get back to your main task",
    quest: {
      title: data.quest_title ?? "Refocus",
      summary: data.description ?? "A short path back into the task.",
      missions: Array.isArray(data.missions) ? data.missions : [
        "Open the main work tab",
        "Identify the next concrete step",
        "Work on it for 10 minutes",
      ],
      rationale: data.rationale ?? "",
      estimated_minutes: data.estimated_minutes ?? 10,
    },
  };
};

const activateShieldMode = async () => {
  const tabs = await chrome.tabs.query({});
  const tabsToClose = getTabsToClose(tabs);

  await closeTabs(tabsToClose);

  const remainingTabs = await chrome.tabs.query({});
  let goal = "Get back to your main task";
  let quest = {
    title: "Refocus",
    summary: "A short path back into the task.",
    missions: [
      "Open the main work tab",
      "Identify the next concrete step",
      "Work on it for 10 minutes",
    ],
  };

  try {
    const backendResult = await requestQuestFromBackend(remainingTabs);
    goal = backendResult.goal || goal;
    quest = backendResult.quest || quest;
  } catch (error) {
    console.log("[TabMind] backend failed", error);
  }

  await setState({
    shieldModeActive: true,
    blockedHosts: [...KNOWN_DISTRACTION_HOSTS],
    lastGoal: goal,
    currentQuest: quest,
  });

  return {
    ok: true,
    shieldModeActive: true,
    lastGoal: goal,
    currentQuest: quest,
  };
};

const deactivateShieldMode = async () => {
  await setState({
    shieldModeActive: false,
    blockedHosts: [],
  });
  const state = await getState();
  return {
    ok: true,
    shieldModeActive: false,
    state,
  };
};

chrome.tabs.onActivated.addListener((activeInfo) => {
  void trackTabSwitch(activeInfo);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void trackTabUpdate(tabId, changeInfo, tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderWindowId = sender?.tab?.windowId;

  void (async () => {
    try {
      switch (message?.type) {
        case "GET_STATE": {
          const state = await getState();
          sendResponse({ ok: true, state });
          break;
        }

        case "ACTIVATE_SHIELD": {
          const result = await activateShieldMode();
          await openSidePanelForWindow(senderWindowId);
          sendResponse(result);
          break;
        }

        case "DEACTIVATE_SHIELD": {
          const result = await deactivateShieldMode();
          sendResponse(result);
          break;
        }

        case "REQUEST_NEXT_QUEST": {
          const tabs = await chrome.tabs.query({});
          let goal = "Continue with your task";
          let quest = {
            title: "Next steps",
            summary: "Your next set of actions.",
            missions: [
              "Open the main work tab",
              "Identify the next concrete step",
              "Work on it for 10 minutes",
            ],
          };
          try {
            const backendResult = await requestQuestFromBackend(tabs);
            goal = backendResult.goal || goal;
            quest = backendResult.quest || quest;
          } catch (e) {
            console.log("[TabMind] REQUEST_NEXT_QUEST backend failed", e);
          }
          await setState({
            lastGoal: goal,
            currentQuest: quest,
          });
          const state = await getState();
          sendResponse({ ok: true, state });
          break;
        }

        case "RESET_SCORE": {
          const state = await getState();
          await setState({
            ...state,
            distractionScore: 0,
          });
          sendResponse({ ok: true });
          break;
        }

        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || "Unhandled background error",
      });
    }
  })();

  return true;
});

setInterval(() => {
  void decayScore();
}, 20 * 1000);
