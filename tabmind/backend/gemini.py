"""
TabMind — Gemini API client (P2: Backend / AI Quest Lead)

Purpose: Call Gemini API for goal inference, tab summarization, and Quest generation.
Set GEMINI_API_KEY in environment. Use prompts from prompts.py.

TODO (P2):
- Configure google.generativeai with GEMINI_API_KEY.
- Implement infer_goal(tabs: list[dict]) -> str | None using PROMPT_INFER_GOAL.
- Implement summarize_tabs(tabs: list[dict]) -> list[str] using PROMPT_SUMMARIZE_TABS.
- Implement generate_quest(tabs, inferred_goal?, distraction_score?) -> dict using PROMPT_GENERATE_QUEST; return shape: quest_title, quest_description, missions[], rationale, estimated_focus_minutes.
- Implement get_fallback_next_steps() -> dict returning deterministic fallback Quest (from prompts.FALLBACK_QUEST or equivalent).
- Handle API errors/timeouts; return fallback Quest on failure.
"""

# P2: add imports (google.generativeai, os, etc.) and implement functions above
