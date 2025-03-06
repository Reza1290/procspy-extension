chrome.runtime.sendMessage({
    type: "page_title",
    title: document.title
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "get_title") {
        sendResponse({ title: document.title });
    }
});
