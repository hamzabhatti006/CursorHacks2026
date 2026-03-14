"""
TabMind — Prompt templates and fallback Quest (P2: Backend / AI Quest Lead)

Purpose: Store prompt strings for Gemini (goal inference, tab summary, Quest generation)
and the deterministic fallback Quest used when API fails or no goal is found.
Language: practical, productivity-oriented. No RPG/gamification.

TODO (P2):
- Define PROMPT_INFER_GOAL: given tabs (title + url per line), output one short sentence for user's likely goal.
- Define PROMPT_SUMMARIZE_TABS: one-line summary per tab, same order.
- Define PROMPT_GENERATE_QUEST: from tabs + optional inferred_goal + optional distraction_score → one Quest title, description, 3–5 missions, rationale, estimated minutes. Specify output format (e.g. plain text or JSON).
- Define FALLBACK_QUEST: dict with quest_title, quest_description, missions (list of { "text", "done": false }), rationale, estimated_focus_minutes. Used when Gemini fails or /next-steps.
"""

# P2: add PROMPT_* constants and FALLBACK_QUEST dict
