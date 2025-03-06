const GOOGLE_ORIGIN = 'https://www.google.com';
let lastTabId = null;
let lastWindowId = null;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.warn("Extension Installed");
    checkCommandShortcuts();
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.warn(`⚠️ Shortcut Detected: ${command}`);
  chrome.runtime.sendMessage({ type: "flag", flag: command });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (lastTabId === activeInfo.tabId) return;
  lastTabId = activeInfo.tabId;

  console.log(`🚨 Tab Switched | Tab ID: ${activeInfo.tabId}`);

  chrome.scripting.executeScript({
    target: { tabId: activeInfo.tabId },
    files: ["content.js"]
  })
    .then(() => {
      console.log("✅ Content script injected");
    })
    .catch((err) => console.error("❌ Injection Failed:", err));
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.warn(`Window Lost Focus (Alt + Tab Detected)`);
  }

  if (windowId !== lastWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
    lastWindowId = windowId;

    console.log(`🔄 Window Switched | Window ID: ${windowId}`);

    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tab) {
      console.log(`🚨 Active Tab Title: ${tab.title}`);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "page_title") {
    console.warn(`🎯 Page Title Detected: ${message.title}`);
    reportFlag("page_title", message.title);
  }
});

function checkCommandShortcuts() {
  chrome.commands.getAll((commands) => {
    const missing = commands.filter((cmd) => cmd.shortcut === "");
    if (missing.length) {
      console.warn(`⚠️ Missing Shortcuts: ${missing.map((cmd) => cmd.name).join(", ")}`);
    }
  });
}

async function reportFlag(flag, value) {
  console.warn(`🚨 Flag Reported: ${flag} | Value: ${value}`);
  // Example: send to backend
  // await fetch("https://your-api-endpoint/report", { method: "POST", body: JSON.stringify({ flag, value }) });
}
