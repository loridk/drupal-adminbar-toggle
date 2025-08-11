(function () {
    const styleId = "__drupal_adminbar_toggle__";
    const SELECTORS = ["#toolbar-administration", "#toolbar-bar", ".gin-secondary-toolbar"];

    function applyHide() {
        if (document.getElementById(styleId)) return;
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
      ${SELECTORS.join(", ")} { display: none !important; }
      html.toolbar-fixed, body.toolbar-fixed { margin-top: 0 !important; padding-top: 0 !important; }
      body { --drupal-toolbar-offset: 0 !important; }
      html { scroll-margin-top: 0 !important; }
      [data-drupal-selector="toolbar-bar"] { display: none !important; }
      [data-drupal-toolbar="fixed"] { top: 0 !important; }
    `;
        (document.head || document.documentElement).appendChild(style);
    }

    function isHidden() {
        try {
            return !!window.sessionStorage.getItem("__drupal_adminbar_hidden__");
        } catch {
            return false;
        }
    }

    // On reload, if previously hidden in this tab, re-apply immediately.
    if (isHidden()) applyHide();

    // Tell the background to set the right icon for this tab.
    try {
        chrome.runtime.sendMessage({ type: "SET_ICON", hidden: isHidden() });
    } catch {}

    // Optional: respond to background pings so the icon updates on nav changes
    try {
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
            if (msg?.type === "PING_STATE") {
                const hidden = !!window.sessionStorage.getItem("__drupal_adminbar_hidden__");
                sendResponse({ hidden });
            }
        });
    } catch {}
})();