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

self.STORAGE_KEY = "tabmindState";

self.DEFAULT_STATE = {
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

self.getState = async () => {
  const result = await chrome.storage.local.get(self.STORAGE_KEY);
  const savedState = result?.[self.STORAGE_KEY];

  return {
    ...self.DEFAULT_STATE,
    ...(savedState || {}),
  };
};

self.setState = async (partial) => {
  const currentState = await self.getState();
  const nextState = {
    ...currentState,
    ...partial,
  };

  await chrome.storage.local.set({
    [self.STORAGE_KEY]: nextState,
  });

  return nextState;
};

self.resetState = async () => {
  await chrome.storage.local.set({
    [self.STORAGE_KEY]: { ...self.DEFAULT_STATE },
  });

  return { ...self.DEFAULT_STATE };
};
