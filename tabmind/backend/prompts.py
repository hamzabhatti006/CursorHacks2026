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


# -----------------------------
# Goal Inference Prompt
# -----------------------------

# -----------------------------
# Goal Inference Prompt
# -----------------------------

GOAL_INFERENCE_PROMPT = """
You are analyzing a user's open browser tabs to infer their immediate work goal.

Tabs:
{tabs}

Rules:
- Infer ONE practical short-term work goal.
- Prioritize tabs related to coding, documents, slides, research, or project work.
- Ignore obvious distraction tabs unless most tabs are distractions.
- Keep the goal specific and short.
- Return STRICT JSON.
- Do not wrap the response in markdown.

Return JSON:

{{
  "goal": "short description of the user's likely task"
}}
"""



# -----------------------------
# Tab Summarization Prompt
# -----------------------------

TAB_SUMMARY_PROMPT = """
You are summarizing a browser workspace.

Tabs:
{tabs}

Create a short summary of the user's browsing context.

Rules:
- Keep it under 20 words
- Mention the type of work
- Ignore distraction tabs

Return JSON:

{{
  "summary": "..."
}}
"""


# -----------------------------
# Quest Generation Prompt
# -----------------------------

QUEST_GENERATION_PROMPT = """
You convert browser context into one immediate actionable focus task.

User tabs:
{tabs}

Inferred goal:
{goal}

Your job:
Generate ONE focus quest that helps the user make progress on the inferred goal.

Rules:
- The quest must align with the inferred goal.
- Prioritize work-related tabs over distraction tabs.
- Choose ONE immediate next task, not a full project plan.
- Missions must be small, concrete, and immediately actionable.
- Do not use motivational language.
- Do not sound like a game.
- Keep the quest practical and professional.
- Return STRICT JSON.
- Do not wrap the response in markdown.

Schema:

{{
  "goal": "...",
  "quest_title": "...",
  "description": "...",
  "missions": [
    "...",
    "...",
    "..."
  ],
  "estimated_minutes": 10,
  "rationale": "..."
}}
"""





# -----------------------------
# Next Steps Prompt
# -----------------------------

NEXT_STEPS_PROMPT = """
Based on the user's tabs:

{tabs}

Generate three immediate steps the user should take.

Return JSON:

{{
  "next_steps": [
    "...",
    "...",
    "..."
  ]
}}
"""


# -----------------------------
# Fallback Responses
# -----------------------------

def fallback_goal():
    return {
        "goal": "Return to the most relevant work tab"
    }


def fallback_summary():
    return {
        "summary": "User appears to be working across documentation, project materials, and related resources."
    }


def fallback_quest():
    return {
        "goal": "Regain focus",
        "quest_title": "Stabilize your workspace",
        "description": "Reduce browser noise and resume work with one clear task.",
        "missions": [
            "Keep only the most relevant work tab open",
            "Identify the next concrete task",
            "Work on it for 10 minutes without switching tabs"
        ],
        "estimated_minutes": 10,
        "rationale": "Fallback quest used because AI generation failed"
    }


def fallback_next_steps():
    return {
        "next_steps": [
            "Select the main work tab",
            "Define the next concrete action",
            "Work for 10 minutes without switching tabs"
        ]
    }
