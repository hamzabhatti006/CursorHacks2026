# TabMind extension (P1: Extension Systems Lead)

Chrome Manifest V3 extension: tab monitoring, distraction score, nudge, Shield Mode, storage.

## Role owner

**P1 — Extension Systems Lead.** Implements: `manifest.json`, `background.js`, `blocker.js`, `notifications.js`, `storage.js`.

## What to implement

- **manifest.json:** Add icons when ready (or keep without icons for dev). Adjust permissions if needed.
- **background.js:** Tab listeners, score calculation, nudge trigger (with cooldown), Shield Mode flow, message handlers for popup (`GET_STATE`, `ACTIVATE_SHIELD`).
- **blocker.js:** Distraction domain list, URL classification, logic to close/suppress tabs.
- **notifications.js:** Nudge notification UI, cooldown check.
- **storage.js:** getState/setState, default state shape per `shared/schema/stateSchema.json`.

## Loading in Chrome

`chrome://extensions` → Load unpacked → select `/Users/omerbhatti/Documents/ZOOTech/tabmind/extension`.

There is no separate build or `dist` folder in this repo. Chrome should be loading the raw files from `tabmind/extension`, and after code changes you should click `Reload` on the unpacked extension so the MV3 service worker and content scripts pick up the latest source.
