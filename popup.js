// Runs a small function in the active tab that toggles a <style> element
// to hide/show Drupal's admin toolbar and clear the top offset it creates.

async function runInActiveTab(fn, args = []) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab.");
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fn,
        args
    });
    return result;
}

function toggleDrupalAdminBar() {
    try {
        const styleId = "__drupal_adminbar_toggle__";
        const doc = document;

        // Elements commonly used by Drupal Toolbar
        const SELECTORS = ["#toolbar-administration", "#toolbar-bar", ".gin-secondary-toolbar"];

        // If the style already exists, remove it (show bar again)
        const existing = doc.getElementById(styleId);
        if (existing) {
            existing.remove();
            try { window.sessionStorage.removeItem("__drupal_adminbar_hidden__"); } catch {}
            return { hidden: false };
        }

        // Otherwise, create it to hide the admin bar and neutralize offsets
        const style = doc.createElement("style");
        style.id = styleId;
        style.textContent = `
      /* Hide the admin toolbar elements */
      ${SELECTORS.join(", ")} { display: none !important; }

      /* Nuke any top offsets/margins Drupal adds when toolbar is fixed */
      html.toolbar-fixed, body.toolbar-fixed { margin-top: 0 !important; padding-top: 0 !important; }
      body { --drupal-toolbar-offset: 0 !important; }
      html { scroll-margin-top: 0 !important; }

      /* In case a site theme uses data attributes or inline offsets */
      [data-drupal-selector="toolbar-bar"] { display: none !important; }
      [data-drupal-toolbar="fixed"] { top: 0 !important; }
    `;
        doc.head.appendChild(style);
        try { window.sessionStorage.setItem("__drupal_adminbar_hidden__", "1"); } catch {}

        return { hidden: true };
    } catch (e) {
        return { error: String(e) };
    }
}

async function setIconForActiveTab(isHidden) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.action.setIcon({
      tabId: tab.id,
      path: {
        16: isHidden ? "icons/icon-off-16.png" : "icons/icon-16.png",
        32: isHidden ? "icons/icon-off-32.png" : "icons/icon-32.png",
        48: isHidden ? "icons/icon-off-48.png" : "icons/icon-48.png",
        128: isHidden ? "icons/icon-off-128.png" : "icons/icon-128.png"
      }
    });
  } catch (e) {
    // ignore icon errors
  }
}

async function getHiddenState() {
    // Peek at the current state without changing it:
    // we inject a small checker that looks for our style tag.
    function checkState() {
        return !!document.getElementById("__drupal_adminbar_toggle__");
    }
    try {
        return await runInActiveTab(checkState);
    } catch {
        return false;
    }
}

async function updateUI() {
    const btn = document.getElementById("toggle");
    const status = document.getElementById("status");
    const isHidden = await getHiddenState();

    btn.textContent = isHidden ? "Show admin bar" : "Hide admin bar";
    status.textContent = isHidden ? "Admin bar is currently hidden." : "Admin bar is currently visible.";
    await setIconForActiveTab(isHidden);
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("toggle");
    const status = document.getElementById("status");

    updateUI();

    btn.addEventListener("click", async () => {
        btn.disabled = true;
        status.textContent = "Working…";

        try {
            const result = await runInActiveTab(toggleDrupalAdminBar);
            if (result?.error) throw new Error(result.error);

            const isHidden = !!result?.hidden;
            btn.textContent = isHidden ? "Show admin bar" : "Hide admin bar";
            status.textContent = isHidden
                ? "Admin bar hidden on this page."
                : "Admin bar shown on this page.";
            await setIconForActiveTab(isHidden);
        } catch (err) {
            status.textContent = `Whoops: ${err.message || err}`;
        } finally {
            btn.disabled = false;
        }
    });
});