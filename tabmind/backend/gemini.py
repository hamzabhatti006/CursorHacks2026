import os
import json

from dotenv import load_dotenv
load_dotenv()

from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"

from prompts import (
    GOAL_INFERENCE_PROMPT,
    TAB_SUMMARY_PROMPT,
    QUEST_GENERATION_PROMPT,
    NEXT_STEPS_PROMPT,
    fallback_goal,
    fallback_summary,
    fallback_quest,
    fallback_next_steps
)


def format_tabs(tabs):
    """Convert tab objects into readable text for prompts."""
    return "\n".join([f"- {t.title} ({t.url})" for t in tabs])


def clean_json(text):
    """Remove markdown wrappers Gemini sometimes adds."""
    text = text.strip()

    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]

    text = text.replace("json", "").strip()

    return text


def safe_json_parse(text, fallback):
    """Ensure Gemini returns valid JSON."""
    try:
        text = clean_json(text)
        return json.loads(text)
    except Exception as e:
        print("JSON parse error:", e)
        return fallback()


# -----------------------------
# Goal Inference
# -----------------------------
def infer_goal(tabs):
    try:
        tab_text = format_tabs(tabs)
        prompt = GOAL_INFERENCE_PROMPT.format(tabs=tab_text)

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        return safe_json_parse(response.text, fallback_goal)

    except Exception as e:
        print("Gemini error:", e)
        return fallback_goal()


# -----------------------------
# Tab Summaries
# -----------------------------
def summarize_tabs(tabs):
    try:
        tab_text = format_tabs(tabs)
        prompt = TAB_SUMMARY_PROMPT.format(tabs=tab_text)

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        return safe_json_parse(response.text, fallback_summary)

    except Exception as e:
        print("Gemini error:", e)
        return fallback_summary()


# -----------------------------
# Quest Generation (CORE)
# -----------------------------
def generate_quest(tabs, inferred_goal=None):
    try:
        tab_text = format_tabs(tabs)

        if not inferred_goal:
            goal_result = infer_goal(tabs)
            inferred_goal = goal_result.get("goal", "Return to the most relevant work task")

        prompt = QUEST_GENERATION_PROMPT.format(
            tabs=tab_text,
            goal=inferred_goal
        )

        print("Sending prompt to Gemini")

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        print("Gemini raw response:")
        print(response.text)

        parsed = safe_json_parse(response.text, fallback_quest)
        validated = validate_quest(parsed)

        # make sure returned goal stays aligned
        validated["goal"] = inferred_goal
        return validated

    except Exception as e:
        print("Gemini error:", e)
        fallback = fallback_quest()
        if inferred_goal:
            fallback["goal"] = inferred_goal
        return fallback



def validate_quest(data):
    """Force Gemini output into a safe shape for the extension."""
    if not isinstance(data, dict):
        return fallback_quest()

    goal = data.get("goal") or "Regain focus"
    quest_title = data.get("quest_title") or "Stabilize your workspace"
    description = data.get("description") or "Reduce browser noise and resume work with one clear task."
    rationale = data.get("rationale") or "Generated from current browser context."

    missions = data.get("missions")
    if not isinstance(missions, list):
        missions = fallback_quest()["missions"]

    missions = [str(m).strip() for m in missions if str(m).strip()]

    if len(missions) < 3:
        fallback_missions = fallback_quest()["missions"]
        for item in fallback_missions:
            if len(missions) >= 3:
                break
            missions.append(item)

    missions = missions[:5]

    estimated_minutes = data.get("estimated_minutes", 10)
    try:
        estimated_minutes = int(estimated_minutes)
    except Exception:
        estimated_minutes = 10

    if estimated_minutes <= 0:
        estimated_minutes = 10

    return {
        "goal": goal,
        "quest_title": quest_title,
        "description": description,
        "missions": missions,
        "estimated_minutes": estimated_minutes,
        "rationale": rationale
    }




# -----------------------------
# Next Steps
# -----------------------------
def next_steps(tabs):
    try:
        tab_text = format_tabs(tabs)
        prompt = NEXT_STEPS_PROMPT.format(tabs=tab_text)

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        return safe_json_parse(response.text, fallback_next_steps)

    except Exception as e:
        print("Gemini error:", e)
        return fallback_next_steps()
