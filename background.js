async function setIcon(tabId, hidden) {
    try {
        await chrome.action.setIcon({
            tabId,
            path: {
                16: hidden ? "icons/icon-off-16.png" : "icons/icon-16.png",
                32: hidden ? "icons/icon-off-32.png" : "icons/icon-32.png",
                48: hidden ? "icons/icon-off-48.png" : "icons/icon-48.png",
                128: hidden ? "icons/icon-off-128.png" : "icons/icon-128.png"
            }
        });
    } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "SET_ICON" && sender?.tab?.id != null) {
        setIcon(sender.tab.id, !!msg.hidden);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Optional: if the URL changes, ask the page what the state is.
    // We'll ping the content script; if it replies, set the icon.
    if (changeInfo.status === "complete") {
        chrome.tabs.sendMessage(tabId, { type: "PING_STATE" }, (resp) => {
            if (chrome.runtime.lastError) return; // no content script on this page
            if (resp && typeof resp.hidden === "boolean") {
                setIcon(tabId, resp.hidden);
            }
        });
    }
});