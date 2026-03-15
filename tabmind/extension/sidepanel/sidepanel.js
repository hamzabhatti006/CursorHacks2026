/**
 * TabMind — Side panel: goals only.
 * Loads state from background and renders quest (title, description, missions).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "tabmindState";
  const CORE_STORAGE_KEY = "tabmindState";

  const clampNumber = (value, min, max) => {
    const n = typeof value === "number" ? value : Number(value) || 0;
    return Math.max(min, Math.min(max, Math.round(n)));
  };

  const normalizeMission = (mission) => {
    if (typeof mission === "string" && mission.trim()) {
      return { text: mission.trim(), done: false };
    }
    if (!mission || typeof mission !== "object") return null;
    const text = typeof mission.text === "string" ? mission.text.trim() : "";
    if (!text) return null;
    return {
      text,
      done: Boolean(mission.done ?? mission.completed),
    };
  };

  const normalizeQuest = (questInput) => {
    const quest = questInput && typeof questInput === "object" ? questInput : {};
    const missions = Array.isArray(quest.missions) ? quest.missions : [];

    return {
      questTitle:
        typeof quest.questTitle === "string"
          ? quest.questTitle
          : typeof quest.title === "string"
            ? quest.title
            : typeof quest.quest_title === "string"
              ? quest.quest_title
              : "",
      questDescription:
        typeof quest.questDescription === "string"
          ? quest.questDescription
          : typeof quest.summary === "string"
            ? quest.summary
            : typeof quest.description === "string"
              ? quest.description
              : "",
      missions: missions.map(normalizeMission).filter(Boolean),
      rationale: typeof quest.rationale === "string" ? quest.rationale : "",
      estimatedFocusMinutes: clampNumber(
        quest.estimatedFocusMinutes ?? quest.estimated_minutes,
        0,
        240
      ),
    };
  };

  const getState = () =>
    new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const raw = result?.[STORAGE_KEY] || {};
        resolve(raw);
      });
    });

  const setState = (partial) =>
    new Promise((resolve) => {
      getState().then((current) => {
        const next = { ...current, ...partial };
        chrome.storage.local.set({ [STORAGE_KEY]: next }, resolve);
      });
    });

  const sendMessage = (payload) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });

  const ui = {
    questSection: document.getElementById("quest-section"),
    emptyState: document.getElementById("empty-state"),
    questTitle: document.getElementById("quest-title"),
    questDescription: document.getElementById("quest-description"),
    questRationale: document.getElementById("quest-rationale"),
    progressCopy: document.getElementById("progress-copy"),
    focusMinutes: document.getElementById("focus-minutes"),
    missionsList: document.getElementById("missions-list"),
  };

  const countCompleted = (missions) => missions.filter((m) => m.done).length;

  const renderMissions = (missions, onToggle) => {
    ui.missionsList.innerHTML = "";
    if (!missions.length) {
      const li = document.createElement("li");
      li.className = "mission-empty";
      li.textContent = "No missions yet.";
      ui.missionsList.appendChild(li);
      return;
    }
    missions.forEach((mission, index) => {
      const li = document.createElement("li");
      li.className = "mission-item" + (mission.done ? " is-done" : "");
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = mission.done;
      cb.dataset.index = String(index);
      cb.addEventListener("change", () => onToggle(index, cb.checked));
      const span = document.createElement("span");
      span.className = "mission-text";
      span.textContent = mission.text;
      label.appendChild(cb);
      label.appendChild(span);
      li.appendChild(label);
      ui.missionsList.appendChild(li);
    });
  };

  let currentQuest = normalizeQuest(null);

  const render = (state) => {
    const shieldActive = Boolean(state?.shieldModeActive);
    const quest = normalizeQuest(state?.currentQuest ?? state?.quest ?? null);

    if (!shieldActive || !quest.questTitle) {
      ui.questSection.classList.add("hidden");
      ui.emptyState.classList.add("visible");
      ui.emptyState.querySelector("p").textContent = shieldActive
        ? "Activate Shield using the shield button on any tab to get your focus plan."
        : "Shield is off. Click the shield on any tab to close distraction tabs and get your goals.";
      return;
    }

    currentQuest = quest;
    ui.questSection.classList.remove("hidden");
    ui.emptyState.classList.remove("visible");

    ui.questTitle.textContent = quest.questTitle || "No quest yet";
    ui.questDescription.textContent =
      quest.questDescription || "Your focus plan will appear here.";
    if (quest.rationale) {
      ui.questRationale.textContent = quest.rationale;
      ui.questRationale.removeAttribute("aria-hidden");
    } else {
      ui.questRationale.setAttribute("aria-hidden", "true");
    }

    const completed = countCompleted(quest.missions);
    const total = quest.missions.length;
    ui.progressCopy.textContent = `${completed} of ${total} complete`;
    ui.focusMinutes.textContent = (quest.estimatedFocusMinutes || 0) + " min";

    renderMissions(quest.missions, async (index, checked) => {
      if (!currentQuest.missions[index]) return;
      currentQuest.missions[index].done = checked;
      const previousState = await getState();
      const existingQuest = previousState?.currentQuest || previousState?.quest || {};
      const updatedQuest = {
        ...existingQuest,
        missions: currentQuest.missions,
      };
      const nextState = await setState({ currentQuest: updatedQuest });
      const completedNow = countCompleted(currentQuest.missions);
      if (total > 0 && completedNow === total) {
        try {
          const response = await sendMessage({ type: "REQUEST_NEXT_QUEST" });
          render(response?.state ?? nextState);
        } catch (e) {
          render(nextState);
        }
      } else {
        render(nextState);
      }
    });
  };

  const load = async () => {
    try {
      const response = await sendMessage({ type: "GET_STATE" });
      const state = response?.state ?? (await getState());
      render(state);
    } catch {
      const state = await getState();
      render(state);
    }
  };

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    render(changes[STORAGE_KEY].newValue || {});
  });

  load();
})();
