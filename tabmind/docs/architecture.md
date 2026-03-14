# TabMind architecture (P3: UX / Product / Demo Lead)

**Purpose:** Single place for high-level architecture so all roles stay aligned.

TODO (P3):
- Describe data flow: user browses → background tracks tabs/score → nudge → popup → Shield → backend (infer goal, generate Quest) → storage → popup renders Quest.
- List main components: extension (background, blocker, notifications, storage, popup), backend (FastAPI + Gemini), shared schema.
- Note fallback: if backend/AI fails, Shield still closes tabs; popup shows fallback Quest from backend.
