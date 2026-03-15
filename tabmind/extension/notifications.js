/**
 * TabMind — Notifications (P1: Extension Systems Lead)
 *
 * Purpose: Show a gentle nudge when distraction score crosses threshold. Enforce
 * cooldown (e.g. 5 minutes) so the user is not spammed.
 *
 * TODO (P1):
 * - Implement showNudge(): use chrome.notifications API with title/message (e.g. "Focus might be slipping. Open TabMind?").
 * - Implement canShowNudge(lastNotificationAt): return true only if cooldown has elapsed.
 * - Store lastNotificationAt in extension storage after each nudge; read it before showing.
 */

"use strict";

const NUDGE_COOLDOWN_MS = 5 * 60 * 1000;

const canShowNudge = async () => {
  const state = await getState();
  return Date.now() - state.lastNudgeAt >= NUDGE_COOLDOWN_MS;
};

const showNudge = async () => {
  const allowed = await canShowNudge();
  if (!allowed) return false;

  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "TabMind",
      message:
        "Focus might be slipping. Open TabMind and activate Shield Mode?",
      priority: 2,
    });

    await setState({
      lastNudgeAt: Date.now(),
    });

    return true;
  } catch (error) {
    console.log("[TabMind] notification failed", error);
    return false;
  }
};
