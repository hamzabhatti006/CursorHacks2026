# TabMind

**From tab chaos to one clear next step.**

Chrome extension + FastAPI backend. Detects distraction, nudges when focus slips, uses Shield Mode to clear noise, and turns the remaining browser context into one focused quest with 3-5 missions.

---

## Repository structure

```
tabmind/
├── extension/          # P1 — Extension Systems Lead
│   ├── manifest.json
│   ├── background.js
│   ├── blocker.js
│   ├── notifications.js
│   ├── storage.js
│   ├── README.md
│   └── popup/          # P3 — UX / Product / Demo Lead
│       ├── popup.html
│       ├── popup.js
│       └── popup.css
├── backend/            # P2 — Backend / AI Quest Lead
│   ├── main.py
│   ├── gemini.py
│   ├── prompts.py
│   ├── requirements.txt
│   └── README.md
├── shared/
│   └── schema/         # P3 — state contract
│       ├── stateSchema.json
│       └── README.md
├── docs/               # P3 — architecture, demo script, positioning
│   ├── architecture.md
│   ├── demo_script.md
│   └── product_positioning.md
├── ROLE_3.md           # P3 — personal working brief
└── README.md (this file)
```

---

## Role ownership

| Role | Owns | README |
|------|------|--------|
| **P1 — Extension Systems Lead** | manifest, background.js, blocker.js, notifications.js, storage.js | `extension/README.md` |
| **P2 — Backend / AI Quest Lead** | main.py, gemini.py, prompts.py | `backend/README.md` |
| **P3 — UX / Product / Demo Lead** | popup/*, shared/schema/*, docs/* | per-folder |

P3 now owns the visible product layer:

- popup UI and checklist interactions
- shared state contract documentation
- architecture, demo, and positioning docs

P1 and P2 still own the browser core and backend implementation behind those contracts.

---

## Core product loop

1. User thrashes between work and distraction tabs.
2. Extension updates `distractionScore` and `focusLabel`.
3. TabMind nudges when the score crosses the intervention threshold.
4. User opens the popup and activates Shield Mode.
5. Distraction tabs close or suppress.
6. Backend infers likely goal from the remaining tabs and returns one quest.
7. Popup renders the goal, missions, and progress in one calm screen.

---

## Shared contracts

- Popup expects background message handlers for `GET_STATE` and `ACTIVATE_SHIELD`.
- Shared state shape lives in `shared/schema/stateSchema.json`.
- Recommended local storage key is `chrome.storage.local["tabmindState"]`.
- Backend should return structured quest data that P1 maps into the popup-facing state shape.

---

## Quick start

### Backend

```bash
cd tabmind/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Extension

Chrome -> `chrome://extensions` -> Load unpacked -> select `tabmind/extension`

See `docs/architecture.md`, `docs/demo_script.md`, and `docs/product_positioning.md` for the current product story.
