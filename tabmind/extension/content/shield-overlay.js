/**
 * TabMind — Shield prompt on the page.
 * Only runs when background sends SHOW_SHIELD_PROMPT (when distraction score is high).
 * Shows centered modal: "Would you like to enter Shield Mode?" Accept → activate shield and open side panel.
 */
(function () {
  "use strict";

  let modalShown = false;

  function showModal() {
    if (modalShown) return;
    modalShown = true;

    const overlay = document.createElement("div");
    overlay.id = "tabmind-shield-prompt-root";
    overlay.innerHTML = `
      <div class="tabmind-shield-prompt-backdrop"></div>
      <div class="tabmind-shield-prompt-box" role="dialog" aria-labelledby="tabmind-prompt-title" aria-modal="true">
        <h2 id="tabmind-prompt-title" class="tabmind-shield-prompt-title">Would you like to enter Shield Mode?</h2>
        <div class="tabmind-shield-prompt-actions">
          <button type="button" class="tabmind-shield-prompt-btn tabmind-shield-prompt-accept">Yes, enter Shield Mode</button>
          <button type="button" class="tabmind-shield-prompt-btn tabmind-shield-prompt-dismiss">Not now</button>
        </div>
      </div>
    `;

    const backdrop = overlay.querySelector(".tabmind-shield-prompt-backdrop");
    const acceptBtn = overlay.querySelector(".tabmind-shield-prompt-accept");
    const dismissBtn = overlay.querySelector(".tabmind-shield-prompt-dismiss");

    function close() {
      overlay.remove();
    }

    acceptBtn.addEventListener("click", async () => {
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
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SHOW_SHIELD_PROMPT") {
      showModal();
    }
  });
})();
