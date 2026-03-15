/**
 * TabMind — Shield prompt on the page.
 * Keeps the current centered Shield prompt, and after Shield Mode is activated
 * turns into a small anchored launcher + reopenable goals card.
 */
(function () {
  "use strict";

  const ROOT_ID = "tabmind-overlay-root";
  const PANEL_URL = chrome.runtime.getURL("popup/popup.html");
  const LOGO_URL = chrome.runtime.getURL("popup/assets/tabmind-logo-large.png");

  let modalShown = false;
  let root = null;
  let launcher = null;
  let panel = null;

  const ensureRoot = () => {
    if (root) return root;

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <button class="tabmind-shield-control" type="button" aria-label="Open TabMind goals">
        <span class="tabmind-shield-control-ring"></span>
        <span class="tabmind-shield-control-core">
          <img src="${LOGO_URL}" alt="TabMind" />
        </span>
      </button>
      <section class="tabmind-goals-card" aria-label="TabMind goals">
        <button class="tabmind-goals-card-close" type="button" aria-label="Close TabMind goals">&times;</button>
        <iframe class="tabmind-goals-card-frame" src="${PANEL_URL}" title="TabMind"></iframe>
      </section>
    `;

    launcher = root.querySelector(".tabmind-shield-control");
    panel = root.querySelector(".tabmind-goals-card");
    const closeButton = root.querySelector(".tabmind-goals-card-close");

    launcher.addEventListener("click", () => {
      panel.classList.toggle("open");
    });

    closeButton.addEventListener("click", () => {
      panel.classList.remove("open");
    });

    document.documentElement.appendChild(root);
    return root;
  };

  const showLauncher = ({ open = false } = {}) => {
    ensureRoot();
    launcher.classList.add("visible");
    if (open) {
      panel.classList.add("open");
    }
  };

  const hideLauncher = () => {
    if (!root) return;
    launcher.classList.remove("visible");
    panel.classList.remove("open");
  };

  const showModal = () => {
    if (modalShown) return;
    modalShown = true;

    const overlay = document.createElement("div");
    overlay.id = "tabmind-shield-prompt-root";
    overlay.innerHTML = `
      <div class="tabmind-shield-prompt-backdrop"></div>
      <div class="tabmind-shield-prompt-box" role="dialog" aria-labelledby="tabmind-prompt-title" aria-modal="true">
        <p class="tabmind-shield-prompt-kicker">Quick detour?</p>
        <h2 id="tabmind-prompt-title" class="tabmind-shield-prompt-title">Ready to get back to what matters?</h2>
        <div class="tabmind-shield-prompt-actions">
          <button type="button" class="tabmind-shield-prompt-btn tabmind-shield-prompt-accept">Yes! Let's refocus</button>
          <button type="button" class="tabmind-shield-prompt-btn tabmind-shield-prompt-dismiss">Not now</button>
        </div>
      </div>
    `;

    const backdrop = overlay.querySelector(".tabmind-shield-prompt-backdrop");
    const acceptBtn = overlay.querySelector(".tabmind-shield-prompt-accept");
    const dismissBtn = overlay.querySelector(".tabmind-shield-prompt-dismiss");

    const close = () => {
      modalShown = false;
      overlay.remove();
    };

    acceptBtn.addEventListener("click", async () => {
      acceptBtn.disabled = true;
      acceptBtn.textContent = "Entering Shield Mode...";
      close();
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "ACTIVATE_SHIELD" }, resolve);
        });
      } catch (e) {
        console.warn("[TabMind] Shield activate failed", e);
      }
    });

    dismissBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.body.appendChild(overlay);
  };

  const syncFromBackgroundState = () => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response?.state?.shieldModeActive) {
        showLauncher();
      } else {
        hideLauncher();
      }
    });
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SHOW_SHIELD_PROMPT") {
      showModal();
    }

    if (message?.type === "SHOW_SHIELD_CONTROL") {
      showLauncher();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes.tabmindState?.newValue) return;

    if (changes.tabmindState.newValue.shieldModeActive) {
      showLauncher();
      return;
    }

    hideLauncher();
  });

  syncFromBackgroundState();
})();
