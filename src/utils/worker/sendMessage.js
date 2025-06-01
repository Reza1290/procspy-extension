export const sendMessageToWorker = async (action, payload) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: action, payload }, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve(response);
        });
    });
};

