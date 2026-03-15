/**
 * TabMind - Popup UI (P3: UX / Product / Demo Lead)
 *
 * Purpose: Display distraction score, focus label, inferred goal, and Quest with missions.
 * Primary integration path is chrome.runtime.sendMessage to the background worker.
 * If that contract is not ready yet, fall back to chrome.storage.local or a local preview state
 * so the popup remains demoable while P1/P2 finish their implementation.
 */

(() => {
  'use strict';

  const CORE_STORAGE_KEY = 'tabmindState';
  const UI_STORAGE_KEY = 'tabmindPopupState';
  const MESSAGE_TIMEOUT_MS = 1500;
  const SHIELD_REQUEST_TIMEOUT_MS = 20000;

  const ui = {};

  const labelFromScore = (score) => {
    if (score >= 8) {
      return 'overloaded';
    }
    if (score >= 4) {
      return 'drifting';
    }
    return 'low';
  };

  const normalizeFocusLabel = (label) => {
    if (label === 'low' || label === 'drifting' || label === 'overloaded') {
      return label;
    }
    return 'low';
  };

  const clampNumber = (value, min, max) => {
    const number = typeof value === 'number' ? value : Number(value) || 0;
    return Math.max(min, Math.min(max, Math.round(number)));
  };

  const normalizeMission = (mission) => {
    if (typeof mission === 'string' && mission.trim()) {
      return {
        text: mission.trim(),
        done: false
      };
    }

    if (!mission || typeof mission !== 'object') {
      return null;
    }

    const text = typeof mission.text === 'string' ? mission.text.trim() : '';
    if (!text) {
      return null;
    }

    return {
      text,
      done: Boolean(mission.done ?? mission.completed)
    };
  };

  const normalizeQuest = (questInput) => {
    const quest = questInput && typeof questInput === 'object' ? questInput : {};
    const missions = Array.isArray(quest.missions) ? quest.missions : [];

    return {
      questTitle: typeof quest.questTitle === 'string'
        ? quest.questTitle
        : typeof quest.title === 'string'
          ? quest.title
          : typeof quest.quest_title === 'string'
            ? quest.quest_title
            : '',
      questDescription: typeof quest.questDescription === 'string'
        ? quest.questDescription
        : typeof quest.summary === 'string'
          ? quest.summary
          : typeof quest.description === 'string'
            ? quest.description
            : '',
      missions: missions.map(normalizeMission).filter(Boolean),
      rationale: typeof quest.rationale === 'string' ? quest.rationale : '',
      estimatedFocusMinutes: clampNumber(
        quest.estimatedFocusMinutes ?? quest.estimated_minutes,
        0,
        240
      )
    };
  };

  const normalizeState = (input) => {
    const source = input && typeof input === 'object' ? input : {};
    const score = clampNumber(source.distractionScore, 0, 12);
    const focusLabel = normalizeFocusLabel(source.focusLabel || labelFromScore(score));
    const quest = normalizeQuest(source.quest || source.currentQuest);

    return {
      distractionScore: score,
      focusLabel,
      inferredGoal: typeof source.inferredGoal === 'string'
        ? source.inferredGoal
        : typeof source.lastGoal === 'string'
          ? source.lastGoal
          : typeof source.goal === 'string'
            ? source.goal
            : '',
      shieldModeActive: Boolean(source.shieldModeActive),
      quest,
      lastNotificationAt: typeof source.lastNotificationAt === 'number'
        ? source.lastNotificationAt
        : typeof source.lastNudgeAt === 'number'
          ? source.lastNudgeAt
          : 0
    };
  };

  let currentState = normalizeState({});

  const PREVIEW_STATE = {
    distractionScore: 6,
    focusLabel: 'drifting',
    inferredGoal: 'Finish the strongest work thread already open in your tabs.',
    shieldModeActive: false,
    quest: {
      questTitle: 'Regain a clean working lane',
      questDescription: 'Collapse the current tab sprawl into a single, realistic push you can start now.',
      missions: [
        { text: 'Keep only the tabs directly needed for the next 20 minutes.', done: false },
        { text: 'Choose the one deliverable that matters most before opening anything new.', done: false },
        { text: 'Work on that deliverable uninterrupted for 10 minutes.', done: false }
      ],
      rationale: 'Your browser already contains enough context to restart without planning from scratch.',
      estimatedFocusMinutes: 20
    },
    lastNotificationAt: 0
  };

  const isStateLike = (value) =>
    Boolean(
      value &&
        typeof value === 'object' &&
        (
          (
            Object.prototype.hasOwnProperty.call(value, 'distractionScore') &&
            Object.prototype.hasOwnProperty.call(value, 'focusLabel') &&
            Object.prototype.hasOwnProperty.call(value, 'quest')
          ) ||
          (
            Object.prototype.hasOwnProperty.call(value, 'distractionScore') &&
            (
              Object.prototype.hasOwnProperty.call(value, 'currentQuest') ||
              Object.prototype.hasOwnProperty.call(value, 'lastGoal')
            )
          )
        )
    );

  const extractState = (response) => {
    if (!response) {
      return null;
    }

    if (isStateLike(response)) {
      return response;
    }

    if (isStateLike(response.state)) {
      return response.state;
    }

    if (isStateLike(response.data)) {
      return response.data;
    }

    return null;
  };

  const countCompleted = (missions) => missions.filter((mission) => mission.done).length;

  const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

  const getFocusCaption = (label, score) => {
    if (label === 'overloaded') {
      return 'High tab thrash detected. Time to clear noise before context slips further.';
    }
    if (label === 'drifting') {
      return 'A few distractions are competing with the main task. Shield can tighten the lane.';
    }
    if (score === 0) {
      return 'Quiet session. Keep momentum while the lane is still clear.';
    }
    return 'Still recoverable. A small cleanup now prevents a bigger reset later.';
  };

  const setStatus = (message, tone = 'neutral') => {
    ui.statusMessage.textContent = message || '';
    ui.statusMessage.dataset.tone = tone;
  };

  const setButtonBusy = (isBusy) => {
    ui.shieldButton.disabled = isBusy;
    ui.shieldButton.classList.toggle('is-busy', isBusy);
  };

  const storageGet = (key) =>
    new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (key === null) {
          resolve(result);
          return;
        }

        resolve(result[key]);
      });
    });

  const storageSet = (key, value) =>
    new Promise((resolve, reject) => {
      const payload = { [key]: value };

      chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      });
    });

  const sendMessage = (payload, timeoutMs = MESSAGE_TIMEOUT_MS) =>
    new Promise((resolve, reject) => {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error('Runtime messaging is unavailable.'));
        return;
      }

      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error('Timed out waiting for background response.'));
      }, timeoutMs);

      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (settled) {
            return;
          }

          settled = true;
          window.clearTimeout(timeoutId);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          resolve(response);
        });
      } catch (error) {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);
          reject(error);
        }
      }
    });

  const cacheElements = () => {
    ui.brandLogo = document.getElementById('brand-logo');
    ui.brandTitle = document.getElementById('brand-title');
    ui.preShieldPanel = document.getElementById('pre-shield-panel');
    ui.shieldBadge = document.getElementById('shield-badge');
    ui.scoreValue = document.getElementById('score-value');
    ui.focusLabel = document.getElementById('focus-label');
    ui.focusCaption = document.getElementById('focus-caption');
    ui.scoreMeter = document.getElementById('score-meter');
    ui.shieldButton = document.getElementById('shield-btn');
    ui.shieldButtonTitle = document.getElementById('shield-btn-title');
    ui.statusMessage = document.getElementById('status-message');
    ui.inferredGoal = document.getElementById('inferred-goal');
    ui.questTitle = document.getElementById('quest-title');
    ui.questDescription = document.getElementById('quest-description');
    ui.questRationale = document.getElementById('quest-rationale');
    ui.focusMinutes = document.getElementById('focus-minutes');
    ui.progressBar = document.getElementById('progress-bar');
    ui.progressFill = document.getElementById('progress-fill');
    ui.progressCopy = document.getElementById('progress-copy');
    ui.missionsList = document.getElementById('missions-list');
  };

  const buildPreviewShieldState = (previousState) => {
    const baseState = normalizeState(previousState);

    return {
      distractionScore: Math.max(2, baseState.distractionScore - 3),
      focusLabel: baseState.distractionScore >= 8 ? 'drifting' : 'low',
      inferredGoal: baseState.inferredGoal || 'Finish the strongest work thread already open in your browser.',
      shieldModeActive: true,
      quest: {
        questTitle: 'Stabilize your workspace',
        questDescription: 'Use the remaining work tabs as a narrow lane, then move one concrete output forward.',
        missions: [
          { text: 'Keep only the tabs tied to the next deliverable.', done: false },
          { text: 'Write down the very next concrete change, answer, or section to finish.', done: false },
          { text: 'Spend 10 uninterrupted minutes on that task before opening anything else.', done: false }
        ],
        rationale: 'Even without the live backend, the fallback quest preserves the product promise of one clear next step.',
        estimatedFocusMinutes: 15
      },
      lastNotificationAt: Date.now()
    };
  };

  const renderMissions = (missions) => {
    ui.missionsList.innerHTML = '';

    if (!missions.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'mission-empty';
      emptyItem.textContent = 'Your quest missions will appear here after Shield Mode runs.';
      ui.missionsList.appendChild(emptyItem);
      return;
    }

    missions.forEach((mission, index) => {
      const item = document.createElement('li');
      item.className = 'mission-item' + (mission.done ? ' is-done' : '');

      const label = document.createElement('label');
      label.className = 'mission-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = mission.done;
      checkbox.dataset.index = String(index);
      checkbox.addEventListener('change', handleMissionToggle);

      const copy = document.createElement('span');
      copy.className = 'mission-text';
      copy.textContent = mission.text;

      label.appendChild(checkbox);
      label.appendChild(copy);
      item.appendChild(label);
      ui.missionsList.appendChild(item);
    });
  };

  const renderState = (rawState) => {
    currentState = normalizeState(rawState);

    const { distractionScore, focusLabel, shieldModeActive, inferredGoal, quest } = currentState;
    const scorePercent = Math.max(0, Math.min(100, Math.round((distractionScore / 12) * 100)));
    const completedMissions = countCompleted(quest.missions);
    const totalMissions = quest.missions.length;
    const progressPercent = totalMissions ? Math.round((completedMissions / totalMissions) * 100) : 0;

    document.body.dataset.focus = focusLabel;
    document.body.dataset.shieldActive = shieldModeActive ? 'true' : 'false';

    if (ui.scoreValue) ui.scoreValue.textContent = String(distractionScore);
    if (ui.focusLabel) ui.focusLabel.textContent = titleCase(focusLabel);
    if (ui.focusCaption) ui.focusCaption.textContent = getFocusCaption(focusLabel, distractionScore);
    if (ui.scoreMeter) ui.scoreMeter.style.width = scorePercent + '%';

    if (ui.shieldBadge) {
      ui.shieldBadge.textContent = shieldModeActive ? 'Shield on' : 'Shield off';
      ui.shieldBadge.dataset.variant = shieldModeActive ? 'active' : 'idle';
    }
    if (ui.shieldButtonTitle) {
      ui.shieldButtonTitle.textContent = shieldModeActive ? 'Refresh Shield Plan' : 'Activate Shield Mode';
    }

    if (ui.inferredGoal) ui.inferredGoal.textContent = inferredGoal || 'No clear goal inferred yet.';
    ui.questTitle.textContent = quest.questTitle || 'No quest yet';
    ui.questDescription.textContent =
      quest.questDescription || 'Activate Shield Mode to trim distractions and get a clean next step.';
    ui.questRationale.textContent =
      quest.rationale || 'Once the backend is connected, this area explains why the quest fits your remaining tabs.';
    ui.focusMinutes.textContent = (quest.estimatedFocusMinutes || 0) + ' min';

    ui.progressCopy.textContent = completedMissions + ' of ' + totalMissions + ' missions complete';
    ui.progressBar.setAttribute('aria-valuenow', String(progressPercent));
    ui.progressFill.style.width = progressPercent + '%';

    renderMissions(quest.missions);
    setButtonBusy(false);
  };

  const writeStoredState = async (state) => {
    if (!chrome.storage || !chrome.storage.local) {
      return;
    }

    try {
      await storageSet(UI_STORAGE_KEY, normalizeState(state));
    } catch (error) {
      // If local storage fails, keep the popup responsive and continue rendering in memory.
    }
  };

  const requestRuntimeState = async () => {
    try {
      return extractState(await sendMessage({ type: 'GET_STATE' }));
    } catch (error) {
      return null;
    }
  };

  const readStoredState = async () => {
    if (!chrome.storage || !chrome.storage.local) {
      return null;
    }

    try {
      const stored = await storageGet(UI_STORAGE_KEY);
      if (isStateLike(stored)) {
        return stored;
      }

      const coreState = await storageGet(CORE_STORAGE_KEY);
      if (isStateLike(coreState)) {
        return coreState;
      }

      const allValues = await storageGet(null);
      if (isStateLike(allValues)) {
        return allValues;
      }
    } catch (error) {
      return null;
    }

    return null;
  };

  const handleMissionToggle = async (event) => {
    const index = Number(event.target.dataset.index);
    const isChecked = event.target.checked;

    if (!currentState.quest.missions[index]) {
      return;
    }

    currentState.quest.missions[index].done = isChecked;
    currentState = normalizeState(currentState);
    await writeStoredState(currentState);
    renderState(currentState);
    setStatus('Progress saved.', 'success');

    const completed = countCompleted(currentState.quest.missions);
    const total = currentState.quest.missions.length;
    if (total > 0 && completed === total) {
      setStatus('All done! Fetching next steps...', 'neutral');
      setButtonBusy(true);
      try {
        const response = await sendMessage({ type: 'REQUEST_NEXT_QUEST' }, SHIELD_REQUEST_TIMEOUT_MS);
        const extracted = extractState(response);
        if (extracted) {
          await writeStoredState(extracted);
          renderState(extracted);
          setStatus('Next set of goals loaded.', 'success');
        }
      } catch (err) {
        setStatus('Could not load next steps. Try activating Shield again.', 'warning');
      }
      setButtonBusy(false);
    }
  };

  const activateShieldMode = async () => {
    setButtonBusy(true);
    setStatus('Activating Shield Mode...', 'neutral');

    try {
      const runtimeState = await sendMessage({ type: 'ACTIVATE_SHIELD' }, SHIELD_REQUEST_TIMEOUT_MS);
      const extractedState = extractState(runtimeState);

      if (extractedState) {
        await writeStoredState(extractedState);
        renderState(extractedState);
        setStatus('Shield Mode activated and refreshed from live state.', 'success');
      } else {
        const previewState = buildPreviewShieldState(currentState);
        await writeStoredState(previewState);
        renderState(previewState);
        setStatus('Preview quest loaded. P1 still needs to wire the live Shield action.', 'warning');
      }
    } catch (error) {
      const previewState = buildPreviewShieldState(currentState);
      await writeStoredState(previewState);
      renderState(previewState);
      setStatus('Preview quest loaded. P1 still needs to wire the live Shield action.', 'warning');
    }
    setButtonBusy(false);
  };

  const bindEvents = () => {
    if (ui.brandLogo) {
      ui.brandLogo.addEventListener('load', () => {
        ui.brandLogo.classList.remove('is-hidden');
        ui.brandTitle.classList.add('is-hidden');
      });

      ui.brandLogo.addEventListener('error', () => {
        ui.brandLogo.classList.add('is-hidden');
        ui.brandTitle.classList.remove('is-hidden');
      });

      if (ui.brandLogo.complete) {
        if (ui.brandLogo.naturalWidth > 0) {
          ui.brandTitle.classList.add('is-hidden');
        } else {
          ui.brandLogo.classList.add('is-hidden');
        }
      }
    }

    ui.shieldButton.addEventListener('click', activateShieldMode);
  };

  const subscribeToStorage = () => {
    if (!chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      if (changes[CORE_STORAGE_KEY] && changes[CORE_STORAGE_KEY].newValue) {
        renderState(changes[CORE_STORAGE_KEY].newValue);
      }

      if (changes[UI_STORAGE_KEY] && changes[UI_STORAGE_KEY].newValue) {
        renderState(changes[UI_STORAGE_KEY].newValue);
      }
    });
  };

  const loadState = async () => {
    setStatus('Loading current session...', 'neutral');

    let state = await requestRuntimeState();
    if (state) {
      await writeStoredState(state);
      renderState(state);
      setStatus('Live state loaded from the extension background.', 'success');
      return;
    }

    state = await readStoredState();
    if (state) {
      renderState(state);
      setStatus('Loaded the last saved local state.', 'neutral');
      return;
    }

    renderState(PREVIEW_STATE);
    setStatus('Preview mode: waiting for background wiring from P1.', 'warning');
  };

  const init = async () => {
    cacheElements();
    bindEvents();
    subscribeToStorage();
    await loadState();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
