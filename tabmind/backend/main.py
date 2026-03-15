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
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from gemini import (
    infer_goal,
    summarize_tabs,
    generate_quest,
    next_steps
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Tab(BaseModel):
    title: str
    url: str


class TabRequest(BaseModel):
    tabs: List[Tab]
    inferred_goal: Optional[str] = None
    distraction_score: Optional[int] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/infer-goal")
def infer_goal_endpoint(data: TabRequest):
    return infer_goal(data.tabs)


@app.post("/summarize-tabs")
def summarize_tabs_endpoint(data: TabRequest):
    return summarize_tabs(data.tabs)


@app.post("/generate-quest")
def generate_quest_endpoint(data: TabRequest):
    return generate_quest(data.tabs, data.inferred_goal)


@app.post("/next-steps")
def next_steps_endpoint(data: TabRequest):
    return next_steps(data.tabs)
