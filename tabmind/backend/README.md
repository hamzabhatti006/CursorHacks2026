# TabMind backend (P2: Backend / AI Quest Lead)

FastAPI + Gemini API. Goal inference, tab summarization, Quest generation.

## Role owner

**P2 — Backend / AI Quest Lead.** Implements: `main.py`, `gemini.py`, `prompts.py`.

## What to implement

- **main.py:** FastAPI app, CORS, `/health`, `/infer-goal`, `/summarize-tabs`, `/generate-quest`, `/next-steps`. Request/response models; call gemini and return fallback on error.
- **gemini.py:** Gemini client; infer_goal, summarize_tabs, generate_quest, get_fallback_next_steps.
- **prompts.py:** Prompt templates and FALLBACK_QUEST dict.

## Setup (after implementation)

```bash
cd tabmind/backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
