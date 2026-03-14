# TabMind

**From tab chaos to one clear next step.**

Chrome extension + FastAPI backend (Gemini API). Detects distraction, nudges, Shield Mode clears noise, AI generates one focused Quest with 3–5 missions.

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
└── README.md (this file)
```

---

## Role ownership

| Role | Owns | README |
|------|------|--------|
| **P1 — Extension Systems Lead** | manifest, background.js, blocker.js, notifications.js, storage.js | `extension/README.md` |
| **P2 — Backend / AI Quest Lead** | main.py, gemini.py, prompts.py | `backend/README.md` |
| **P3 — UX / Product / Demo Lead** | popup/*, shared/schema/*, docs/* | per-folder |

Each role-owned file contains **comments and TODOs only**; no full implementation yet. Implement your owned files after first push.

---

## Quick start (after implementation)

1. **Backend:** `cd backend && pip install -r requirements.txt && export GEMINI_API_KEY=... && uvicorn main:app --reload --port 8000`
2. **Extension:** Chrome → `chrome://extensions` → Load unpacked → select `extension/`

See `TABMIND_CONCEPT.md` in repo root for full concept and feature list.
