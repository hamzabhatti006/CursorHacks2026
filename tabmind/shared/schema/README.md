# TabMind shared state schema (P3: UX / Product / Demo Lead)

This folder defines the single state contract shared by the extension background, popup, and backend-derived Quest data.

## Canonical storage shape

`stateSchema.json` is the default object shape the extension should store and return.

| Field | Type | Notes |
|------|------|------|
| `distractionScore` | number | Integer score. `0-3 = low`, `4-7 = drifting`, `8+ = overloaded`. |
| `focusLabel` | string | One of `"low"`, `"drifting"`, `"overloaded"`. |
| `inferredGoal` | string | Short sentence inferred from remaining work tabs. |
| `shieldModeActive` | boolean | `true` after Shield Mode runs for the current session. |
| `quest.questTitle` | string | One clear task label, not a broad project name. |
| `quest.questDescription` | string | 1-2 sentence explanation of what to do next. |
| `quest.missions` | array | Ordered checklist of 3-5 items. |
| `quest.rationale` | string | Brief reason the quest fits the remaining tabs. |
| `quest.estimatedFocusMinutes` | number | Integer estimate for one focused push. |
| `lastNotificationAt` | number | Unix timestamp in milliseconds for nudge cooldown logic. |

## Mission item contract

Each entry in `quest.missions` should follow this shape:

```json
{
  "text": "Write the popup render function for score, goal, and missions.",
  "done": false
}
```

Conventions:

- `text` should be specific enough to act on immediately.
- `done` is controlled by the popup checklist UI and persisted locally.
- Missions should stay ordered from easiest first move to more committed follow-through.

## Extension contract

The popup is built around two background message types:

- `GET_STATE` -> returns the current full state object, or an envelope containing that object.
- `ACTIVATE_SHIELD` -> runs Shield Mode, updates storage, and returns the refreshed full state object.

Recommended storage convention for P1:

- Persist the full object at `chrome.storage.local["tabmindState"]`.
- If P1 prefers separate keys internally, `GET_STATE` should still return the merged full object in the schema shape above.

## Backend mapping

P2 does not need to return the whole state object. The backend can return goal and quest payloads that P1 merges into extension state:

```json
{
  "inferred_goal": "Finish the architecture section for the hackathon demo.",
  "quest_title": "Lock the architecture story",
  "quest_description": "Turn the open tabs into one clear explanation of how TabMind works.",
  "missions": [
    { "text": "List the extension, backend, and schema pieces.", "done": false },
    { "text": "Describe Shield Mode end to end.", "done": false },
    { "text": "Tighten the final wording for judges.", "done": false }
  ],
  "rationale": "The remaining tabs all point to product explanation and demo readiness.",
  "estimated_focus_minutes": 20
}
```

P1 should normalize backend field names into the popup-facing state shape:

- `inferred_goal` -> `inferredGoal`
- `quest_title` -> `quest.questTitle`
- `quest_description` -> `quest.questDescription`
- `estimated_focus_minutes` -> `quest.estimatedFocusMinutes`

## Fallback behavior

If the backend is unavailable:

- Shield Mode should still close or suppress distracting tabs.
- The popup should still render a deterministic fallback quest.
- The state object should never be returned with a missing `quest` object, even if its strings are blank.
