# TabMind demo script (P3: UX / Product / Demo Lead)

This is the short, repeatable judge-facing flow. Aim for about 30 to 45 seconds.

## Demo setup

Before presenting, have these ready:

- One Chrome window with a messy mix of tabs: docs, GitHub, slides, a tutorial, YouTube, Reddit, and one or two obvious distraction tabs.
- The extension loaded from `tabmind/extension`.
- The backend running locally on port `8000`.
- The popup already tested once so the visual flow is smooth.

## Talk track

### Step 1: Show the problem

Open the noisy browser window and say:

> This is what browser overload actually looks like: too many tabs, mixed intent, and no clear next move.

If needed, quickly switch between a few tabs to reinforce the sense of thrash.

### Step 2: Show the intervention signal

Open the popup and point to the score and focus label.

Say:

> TabMind watches for tab thrashing and distraction patterns, then detects when focus is drifting.

If the notification is available, mention it briefly:

> When the score crosses a threshold, it nudges instead of waiting for the user to notice the breakdown themselves.

### Step 3: Trigger Shield Mode

Click `Activate Shield Mode`.

Say:

> Shield Mode clears the obvious distraction tabs and keeps the work context that still matters.

While it runs, keep the pacing calm and short.

### Step 4: Show the quest

As soon as the popup updates, point to:

- inferred goal
- quest title
- one mission item
- progress bar

Say:

> Instead of just blocking tabs, TabMind turns the remaining browser context into one clear next step with a few small missions.

### Step 5: Show progress

Check off one mission.

Say:

> The plan is immediately actionable, and progress is visible without opening another tool.

## Closing line

Use this sentence to land the demo:

> TabMind does not just remove distraction. It turns overload into one immediate action.

## Backup plan

If the backend is slow or unavailable:

- Still show Shield Mode cleaning up tabs.
- Let the popup display the fallback quest.
- Say: `The AI layer is optional for resilience; the focus recovery flow still works with deterministic fallback output.`
