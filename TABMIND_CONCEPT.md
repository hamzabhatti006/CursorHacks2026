# TabMind Focus Shield — Hackathon Concept Document

**Product:** TabMind  
**Tagline:** From tab chaos to one clear next step.  
**Stack:** Chrome Extension (Manifest V3, JS) + FastAPI (Python) + Claude/LLM API

---

## 1. Problem Framing

**Problem**
- Users get overwhelmed through tab thrashing, distracting-site drift, too many open contexts, and decision fatigue.
- Existing blockers remove distractions but do not restore direction.
- Existing productivity tools require manual organization instead of intervening at the moment of overload.

**Why this matters now**
- Modern work and study are browser-heavy.
- Overwhelm is visible directly in browsing behavior.
- The browser is the best place to detect and intervene on attention breakdown.

**Measurable impact**
- Reduce time-to-refocus after distraction.
- Reduce number of distracting tabs open during active work.
- Increase likelihood the user resumes a meaningful task.
- Reduce decision fatigue via one clear next action.

---

## 2. Target Users

**Primary:** Students, hackathon participants, developers, knowledge workers, anyone doing browser-heavy work.

**Best early user:** A student or builder with docs, slides, GitHub, tutorials, research tabs, plus YouTube, Reddit, or shopping — i.e. mixed work + distraction.

---

## 3. Core Value Proposition

**What it does:** TabMind detects when focus is breaking down, clears noise, and gives one specific thing to do next.

**Core promise:** From tab chaos to one clear next step.

**Differentiation**
- Unlike blockers: does not only remove distractions; it restores context.
- Unlike planners: does not ask the user to organize their life; it intervenes in the moment.
- Unlike generic LLM helpers: does not wait for a description; it reads browsing context and acts.

**Positioning:** TabMind is a browser-native focus shield that detects overwhelm, clears distraction, and generates one immediate, practical task so users can restart without thinking from scratch.

---

## 4. Feature Breakdown

### MVP (must ship)
- Real-time distraction detection.
- Distraction score (0–3 low, 4–7 drifting, 8+ overloaded).
- Gentle nudge notification when threshold crossed.
- Shield Mode: close or suppress distracting tabs.
- Goal inference from remaining tabs.
- Quest generation: one Quest with 3–5 missions.
- Popup: score, inferred goal, Quest, mission checklist.

### Stretch (if time)
- Session history.
- Resume previous Quest.
- Custom blocklist.
- Multiple Shield presets.
- Better work vs distraction tab classification.
- Progress persistence across popup reopens.

---

## 5. Technical Architecture

### Frontend — Chrome Extension
- **Platform:** Chrome Extension, Manifest V3, JavaScript.
- **UI:** Popup (HTML/CSS/JS); calm, modern, low-noise.
- **Core files:**
  - `manifest.json`
  - `background.js` — tab monitoring, score, nudge, Shield orchestration
  - `blocker.js` — block/suppress distracting tabs
  - `notifications.js` — nudge UI
  - `storage.js` — local state, Quest, score
  - `popup/popup.html`, `popup/popup.js`, `popup/popup.css`

### Backend
- **Framework:** FastAPI (Python).
- **Files:** `main.py`, `claude.py`, `prompts.py`.
- **Responsibilities:** Infer likely goal from tab context; optionally summarize tabs; generate Quest; return structured JSON; provide deterministic fallback if AI fails.

### AI usage
- **Use AI for:** Likely-goal inference, Quest generation, short structured summaries.
- **Do not use AI for:** Distraction score, core browser logic, or anything that must always work.

### Performance
- Nudge and Shield Mode: near-instant.
- Quest generation: 1–3 s max; show loading state; fallback if timeout/failure.

---

## 6. Distraction Detection Logic

**Inputs**
- Tab switch frequency.
- Revisit rate to distracting domains.
- Presence of known distracting tabs.
- Optional: total tab count above threshold.

**Scoring (increment then decay over time)**
| Event | Points |
|-------|--------|
| Fast tab switch | +2 |
| Open or return to known distraction domain | +4 |
| Repeat revisit to same distraction domain | +1 |
| Tab count exceeds threshold (e.g. 12) | +1 |

**Labels**
- **Low:** 0–3  
- **Drifting:** 4–7  
- **Overloaded:** 8+

**Known distraction domains (MVP):** youtube.com, reddit.com, x.com, twitter.com, instagram.com, tiktok.com.

**Decay:** Gradual decay so score does not stay high forever without new signals.

---

## 7. Shield Mode Logic

1. Read all open tabs.
2. Classify tabs: likely work vs likely distraction (URL/domain + optional heuristics).
3. Close or suppress distraction tabs; preserve work tabs.
4. Send remaining tab titles + URLs to backend.
5. Backend returns inferred goal + Quest (or fallback).
6. Store Quest locally; render in popup.

**Product meaning:** Shield Mode is focus recovery, not just “block mode.”

---

## 8. Quest Generation Logic

**Input to backend:** Remaining tab titles, URLs, optional distraction score, optional pre-inferred goal.

**Output (structured JSON):**
- One Quest.
- Short Quest description.
- 3–5 missions (ordered steps).
- Brief rationale.
- Optional: estimated focus time.

**Rules**
- One immediate task, not a full work plan.
- Language practical and productivity-oriented; no cheesy RPG, no coins/XP.
- Missions small enough to start immediately.
- No motivational fluff.

---

## 9. Data Flow

```
[User browses] 
    → Background script monitors tab activity (switches, domains, count)
    → Distraction score updated (with decay)
    → If score crosses threshold → nudge notification
[User opens popup] 
    → Sees score, focus label, “Activate Shield” (or similar)
[User activates Shield Mode]
    → Background: get all tabs → classify → close/suppress distractions → keep work tabs
    → Send (titles, URLs) to backend
[Backend]
    → Infer goal → generate Quest + missions → return JSON (or fallback)
[Extension]
    → Store Quest in local storage
[Popup]
    → Display inferred goal, Quest, missions, progress (checkboxes)
```

Critical path: detection → nudge → Shield → cleanup → API call → store → render. Fallback ensures cleanup + default Quest work even when API fails.

---

## 10. Fallback Behavior (AI or Backend Fails)

**Required:** Product must still feel useful.

- Shield Mode still runs: close/suppress distracting tabs.
- If backend timeout or error: do not show blank state; show fallback Quest.
- **Fallback Quest example:**
  - **Title:** “Stabilize your workspace”
  - **Missions:**
    1. Keep only the tab most related to your work open.
    2. Write down the next concrete task.
    3. Spend 10 uninterrupted minutes on that task.

Popup always shows either AI-generated or fallback Quest so the narrative of “one clear next step” holds.

---

## 11. Demo Script (2–3 minutes)

1. **Setup:** Browser with ~15 tabs: docs, GitHub, slides, YouTube, Reddit, shopping, random noise.
2. **Show thrashing:** Switch quickly between tabs; point out distraction score rising in popup.
3. **Nudge:** When score crosses threshold, show notification: “Focus might be slipping. Open TabMind?”
4. **Popup:** Open extension; show score, focus label (e.g. “Drifting”), and Shield button.
5. **Shield:** Activate Shield Mode; distracting tabs close or suppress; work tabs remain.
6. **Quest:** Quest appears with 3–5 missions; briefly read one mission.
7. **Progress:** Check off one mission; show progress updating.
8. **Closing line:** “TabMind doesn’t just block distractions. It turns overload into one immediate action.”

---

## 12. Why This Wins

| Criterion | How TabMind addresses it |
|-----------|---------------------------|
| **Innovation** | Combines detection + workspace cleanup + context-aware next-step generation; distinct from plain blockers and generic AI productivity tools. |
| **Technical depth** | Extension lifecycle, event-driven tab monitoring, local state, API integration, structured AI output, fallback logic. |
| **Demo clarity** | Messy tabs → score spike → nudge → Shield → Quest in a linear, easy-to-follow flow. |
| **Feasibility** | Deterministic detection, small FastAPI service, local or simple deploy; no heavy infra. |
| **Differentiation** | Not a planner, not a generic chatbot, not a raw blocker; positioned as a focus recovery system. |

---

## 13. Three-Person Role Breakdown

| Role | Responsibility | Deliverables |
|------|----------------|--------------|
| **Extension lead** | Chrome extension core: manifest, background script, tab monitoring, distraction score, nudge, Shield orchestration (close/suppress tabs), storage, popup shell and wiring. Ensures detection and Shield work without backend. | `manifest.json`, `background.js`, `blocker.js`, `notifications.js`, `storage.js`, popup structure and data binding. |
| **Backend + AI** | FastAPI app, single endpoint for “infer goal + generate Quest.” Claude/LLM integration, prompts, structured JSON response, fallback Quest when AI fails or times out. | `main.py`, `claude.py`, `prompts.py`, fallback payload, API contract (request/response shape). |
| **Frontend + integration** | Popup UI/UX: score display, focus label, Shield button, Quest and missions list, checkboxes, loading state, error/fallback handling. Integration: call backend from extension, parse response, update storage and UI. | `popup.html`, `popup.css`, `popup.js`, API client in extension, end-to-end flow from Shield to Quest on screen. |

**Handoffs**
- Extension lead exposes: “get current tabs after Shield,” “store Quest,” “get stored Quest.”
- Backend + AI exposes: POST body (titles, URLs), response schema (goal, Quest, missions).
- Frontend consumes storage and API; renders score, Quest, and progress.

**Day-of priorities**
- Hour 0–6: Detection + score + nudge + popup shell (Extension + Frontend).
- Hour 6–12: Shield logic + backend endpoint + fallback (Extension + Backend).
- Hour 12–18: Quest in popup, API integration, polish (Frontend + Backend).
- Hour 18–24: Demo run-through, fallback test, edge cases.

---

*Document version: hackathon-ready. Use as single source of truth for scope and roles.*
