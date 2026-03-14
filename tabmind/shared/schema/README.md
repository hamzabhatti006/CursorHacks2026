# TabMind shared state schema (P3: UX / Product / Demo Lead)

**Purpose:** Defines the state shape shared between extension (background, popup) and used by the backend response contract.

**stateSchema.json** documents the fields:
- `distractionScore` (number): 0–3 low, 4–7 drifting, 8+ overloaded.
- `focusLabel` (string): `"low"` | `"drifting"` | `"overloaded"`.
- `inferredGoal` (string): From backend `/infer-goal`.
- `shieldModeActive` (boolean).
- `quest`: `questTitle`, `questDescription`, `missions` (array of `{ "text", "done" }`), `rationale`, `estimatedFocusMinutes`.
- `lastNotificationAt` (number): timestamp for nudge cooldown.

TODO (P3): Expand this README with any extra conventions (e.g. mission item shape, how popup and background sync).
