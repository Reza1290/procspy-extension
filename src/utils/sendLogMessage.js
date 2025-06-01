export const sendServerLogMessage = (flagKey, attachment = "") => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "LOG_MESSAGE",
        flagKey,
        attachment
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }
        resolve(response)
      }
    )
  })
}