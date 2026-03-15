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
const DECAY_INTERVAL_MS = 15 * 1000;
const DECAY_AMOUNT = 1;
const SWITCH_WINDOW_MS = 60 * 1000;
const FAST_SWITCH_WINDOW_MS = 12 * 1000;
const FAST_SWITCH_PROMPT_COUNT = 4;
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

const countSwitchesInWindow = (timestamps, windowMs, now = Date.now()) => {
  const cutoff = now - windowMs;
  return timestamps.filter((timestamp) => timestamp >= cutoff).length;
};

const calculateScoreDelta = ({
  isDistraction,
  fastSwitchCount,
  recentSwitchCount,
  openTabCount,
}) => {
  let delta = 1; // every tab switch adds at least 1 (rapid switching = higher score)

  if (recentSwitchCount >= 3) delta += 1;
  if (recentSwitchCount >= 5) delta += 2;
  if (fastSwitchCount >= 3) delta += 2;
  if (fastSwitchCount >= 5) delta += 2;
  if (isDistraction) delta += 4;
  if (openTabCount >= 10) delta += 1;
  if (openTabCount >= 15) delta += 1;

  return delta;
};

const shouldOfferShield = ({
  distractionScore,
  fastSwitchCount,
  isDistraction,
}) => {
  if (distractionScore >= DISTRACTION_THRESHOLD) return true;
  if (fastSwitchCount >= FAST_SWITCH_PROMPT_COUNT) return true;
  if (isDistraction && fastSwitchCount >= 3) return true;
  return false;
};

const decayScore = async () => {
  const state = await getState();
  const cutoff = Date.now() - SWITCH_WINDOW_MS;
  const recentSwitches = state.recentSwitches.filter((timestamp) => timestamp >= cutoff);

  if (state.shieldModeActive) {
    if (recentSwitches.length !== state.recentSwitches.length) {
      await setState({ recentSwitches });
    }
    return;
  }

  if (state.distractionScore <= 0 && recentSwitches.length === state.recentSwitches.length) return;

  await setState({
    recentSwitches,
    distractionScore: Math.max(0, state.distractionScore - DECAY_AMOUNT),
  });
};

const trackTabSwitch = async (activeInfo) => {
  const activeTab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  if (!activeTab) return;

  const recentSwitches = await recordRecentSwitch();
  const fastSwitchCount = countSwitchesInWindow(recentSwitches, FAST_SWITCH_WINDOW_MS);
  const allTabs = await chrome.tabs.query({});

  const isDistraction = isDistractionUrl(activeTab.url);
  const scoreDelta = calculateScoreDelta({
    isDistraction,
    fastSwitchCount,
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

  if (
    shouldOfferShield({
      distractionScore: nextState.distractionScore,
      fastSwitchCount,
      isDistraction,
    })
  ) {
    const promptShown = await sendShieldPromptToActiveTab();
    if (!promptShown) {
      await showNudge();
    }
  }
};

const PROMPT_COOLDOWN_MS = 5 * 60 * 1000;
let lastShieldPromptSentAt = 0;

const sendShieldPromptToActiveTab = async () => {
  const now = Date.now();
  if (now - lastShieldPromptSentAt < PROMPT_COOLDOWN_MS) return true;
  lastShieldPromptSentAt = now;
  try {
    const win = await chrome.windows.getLastFocused();
    if (!win?.id) return false;
    const tabs = await chrome.tabs.query({ active: true, windowId: win.id });
    const tab = tabs[0];
    if (!tab?.id) return false;
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_SHIELD_PROMPT" });
    return true;
  } catch (e) {
    return false;
  }
};

const showShieldControlOnWindow = async (windowId) => {
  if (!windowId) return false;
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    const activeTab = tabs[0];
    if (!activeTab?.id) return false;

    await chrome.tabs.sendMessage(activeTab.id, { type: "SHOW_SHIELD_CONTROL" });
    return true;
  } catch (e) {
    return false;
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
    const promptShown = await sendShieldPromptToActiveTab();
    if (!promptShown) {
      await showNudge();
    }
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

const buildQuestFromNextSteps = (payload, lastGoal) => {
  const missions = (Array.isArray(payload?.next_steps) ? payload.next_steps : payload?.missions)
    ?.map((step) => String(step || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    title:
      payload?.quest_title ||
      payload?.title ||
      "Keep the current work moving",
    summary:
      payload?.description ||
      payload?.summary ||
      "Use the next few concrete steps to keep momentum without reopening distractions.",
    missions:
      missions && missions.length
        ? missions
        : [
            "Re-open the main work tab only if you need it",
            "Pick the next concrete change to make",
            "Stay on that task for 10 minutes",
          ],
    rationale:
      payload?.rationale ||
      "Generated from your remaining work tabs after finishing the previous checklist.",
    estimated_minutes: Number(payload?.estimated_minutes) > 0 ? Number(payload.estimated_minutes) : 10,
    goal: payload?.goal || lastGoal || "Continue your current task",
  };
};

const requestNextStepsFromBackend = async (tabs, lastGoal) => {
  const payload = {
    tabs: tabs.map((tab) => ({
      title: tab?.title ?? "",
      url: normalizeUrl(tab?.url),
    })),
    inferred_goal: lastGoal || undefined,
  };

  const response = await fetch(`${BACKEND_BASE_URL}/next-steps`, {
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
  return buildQuestFromNextSteps(data, lastGoal);
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
          await showShieldControlOnWindow(senderWindowId);
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
          const previousState = await getState();
          let goal = "Continue with your task";
          let quest = {
            title: "Keep the current work moving",
            summary: "Your next set of focused actions.",
            missions: [
              "Open the main work tab",
              "Identify the next concrete step",
              "Work on it for 10 minutes",
            ],
            rationale: "Fallback next-step set used because the backend could not refresh the plan.",
            estimated_minutes: 10,
          };
          try {
            const backendResult = await requestNextStepsFromBackend(tabs, previousState.lastGoal);
            goal = backendResult.goal || previousState.lastGoal || goal;
            quest = backendResult;
          } catch (e) {
            console.log("[TabMind] REQUEST_NEXT_QUEST backend failed", e);
            goal = previousState.lastGoal || goal;
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
}, DECAY_INTERVAL_MS);
