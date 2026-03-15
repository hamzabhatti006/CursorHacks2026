/**
 * TabMind — Storage (P1: Extension Systems Lead)
 *
 * Purpose: Read/write extension state (distraction score, focus label, inferred goal,
 * shield mode flag, quest, lastNotificationAt) via chrome.storage.local. Single
 * source of truth for popup and background.
 *
 * TODO (P1):
 * - Define storage keys (align with shared/schema/stateSchema.json).
 * - Implement getState(): async, returns full state object.
 * - Implement setState(partial): async, merges partial into stored state.
 * - Ensure default values when keys are missing (e.g. score 0, focusLabel "low", empty quest).
 */

"use strict";

const STORAGE_KEY = "tabmindState";

const DEFAULT_STATE = {
  distractionScore: 0,
  lastNudgeAt: 0,
  lastActiveTabId: null,
  lastActiveAt: 0,
  recentSwitches: [],
  shieldModeActive: false,
  currentQuest: null,
  lastGoal: null,
  blockedHosts: [],
};

const getState = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const savedState = result?.[STORAGE_KEY];

  return {
    ...DEFAULT_STATE,
    ...(savedState || {}),
  };
};

const setState = async (partial) => {
  const currentState = await getState();
  const nextState = {
    ...currentState,
    ...partial,
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: nextState,
  });

  return nextState;
};

const resetState = async () => {
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...DEFAULT_STATE },
  });

  return { ...DEFAULT_STATE };
};
