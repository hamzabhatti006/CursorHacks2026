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

(function () {
  'use strict';
  // P1: implement nudge display and cooldown logic
})();
