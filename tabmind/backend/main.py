"""
TabMind — FastAPI backend (P2: Backend / AI Quest Lead)

Purpose: HTTP API for goal inference, tab summarization, and Quest generation.
Uses Gemini API via gemini.py. Runs locally (e.g. uvicorn main:app --reload --port 8000).

TODO (P2):
- Add CORS middleware so extension can call from browser.
- Implement GET /health → {"status": "ok"}.
- Implement POST /infer-goal: body { "tabs": [{ "title", "url" }] } → { "inferred_goal": "..." }.
- Implement POST /summarize-tabs: body { "tabs": [...] } → { "summaries": [...] }.
- Implement POST /generate-quest: body { "tabs", "inferred_goal?", "distraction_score?" } → Quest (title, description, missions[], rationale, estimated_focus_minutes).
- Implement GET /next-steps → fallback Quest when no clear goal.
- Define Pydantic request/response models; return deterministic fallback if Gemini fails.
"""

from fastapi import FastAPI

app = FastAPI(title="TabMind API", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "tabmind"}
