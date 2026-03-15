# TabMind architecture (P3: UX / Product / Demo Lead)

TabMind is a browser-native focus recovery loop. The extension detects attention breakdown, Shield Mode removes obvious distractions, and the backend converts the remaining work context into one small, actionable quest.

## System overview

### 1. Extension core

- `background.js` monitors tab activity, updates `distractionScore`, and exposes popup message handlers.
- `blocker.js` classifies work tabs versus distraction tabs during Shield Mode.
- `notifications.js` sends a gentle nudge when the score crosses the intervention threshold.
- `storage.js` persists the shared state object in `chrome.storage.local`.

### 2. Popup experience

- `popup/popup.html` defines the focused single-screen UI.
- `popup/popup.css` provides the visual hierarchy judges will actually see.
- `popup/popup.js` requests current state, triggers Shield Mode, renders the quest, and persists mission checklist progress.

### 3. Backend and AI

- `backend/main.py` exposes `GET /health` and the Quest-related endpoints.
- The backend infers likely intent from remaining work tabs and returns structured quest data.
- If the model fails, the backend should return deterministic fallback output rather than an empty response.

### 4. Shared contract

- `shared/schema/stateSchema.json` is the popup-facing state shape.
- P1 owns state production and storage.
- P2 owns goal and quest generation.
- P3 owns how that state is presented and explained.

## End-to-end flow

```text
User opens and switches tabs
  -> background.js tracks switch rate, revisit rate, and tab count
  -> distractionScore and focusLabel update in local state
  -> notifications.js nudges when threshold and cooldown rules allow
  -> popup opens and requests GET_STATE
  -> user clicks ACTIVATE_SHIELD
  -> background.js gathers tabs and blocker.js removes obvious distractions
  -> remaining work tabs are sent to backend
  -> backend infers goal and generates one quest with 3-5 missions
  -> extension stores inferredGoal + quest in chrome.storage.local
  -> popup renders the updated state and tracks checklist progress
```

## Key data contracts

### Popup <-> background

- `GET_STATE` returns the full state object used by the popup.
- `ACTIVATE_SHIELD` runs the cleanup flow and returns the refreshed state.

### Background <-> storage

- Storage should persist the full state contract, ideally at `chrome.storage.local["tabmindState"]`.
- The popup can reopen at any time and should see the same quest and mission progress.

### Background <-> backend

- Input: remaining tab `title` and `url`, with optional `distraction_score` and `inferred_goal`.
- Output: `inferred_goal`, `quest_title`, `quest_description`, `missions`, `rationale`, `estimated_focus_minutes`.

## Fallback and resilience

TabMind should still feel helpful when AI is unavailable:

- Distraction detection still works without the backend.
- Shield Mode still closes or suppresses distraction tabs.
- The user still sees a deterministic fallback quest instead of a blank panel.
- Popup mission progress is local-first so the visible experience stays stable during demo conditions.

## Demo-critical path

The judging narrative depends on four moments landing cleanly:

1. The distraction score visibly rises.
2. Shield Mode feels immediate.
3. The popup switches from overload to one calm quest.
4. Checking off a mission visibly updates progress.
