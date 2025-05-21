let state = {
  isWebRtcTabWatcherInitialized: false,
  isProctorMessageSent: false,
  webRtcShareScreenTab: null,
  testPageTab: null
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("page/ask.html")
    })
  }

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

})

const sendServerLogMessage = (flagKey, attachment = "") => {
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    (tab.url === `chrome-extension://${chrome.runtime.id}/`)
  ) {
    chrome.tabs.update(tabId, { url: `index.html` })
  }

  if (changeInfo.status === 'complete' && tabId !== state.testPageTab?.id && tabId != state.webRtcShareScreenTab?.id) {

    sendServerLogMessage("SWITCH_TAB", {
      title: tab.title,
      url: tab.url
    })
  }

  if (changeInfo.status === 'complete') {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["src/scripts/keystroke.js"],
      })
      .then(() => console.log("script injected in all frames"));
  }
})



loadState()
console.log('load')

// let isWebRtcTabWatcherInitialized = false;
// let state.isProctorMessageSent = false;


const onTabRemoved = () => async (closedTabId) => {
  if (state.webRtcShareScreenTab && closedTabId === state.webRtcShareScreenTab.id) {
    console.warn("state.webRtcShareScreenTab closed — recreating...");

    chrome.tabs.onRemoved.removeListener(boundOnTabRemoved)
    chrome.tabs.onUpdated.removeListener(boundOnTabUpdated)
    state.isWebRtcTabWatcherInitialized = false;
    saveState()

    await recreateWebRtcTab();
    initWebRtcTabWatcher();
  }
};

const onTabUpdated = () => async (updatedTabId, changeInfo, tab) => {
  if (
    state.webRtcShareScreenTab &&
    updatedTabId === state.webRtcShareScreenTab.id &&
    changeInfo.status === "complete"
  ) {
    if (!state.isProctorMessageSent) {
      console.warn("state.webRtcShareScreenTab loaded — sending message");
      state.isProctorMessageSent = true;
      saveState()


      // setTimeout(async () => {
      await chrome.tabs.update(state.webRtcShareScreenTab.id, { active: true })
      const data = await signIn();
      await sendProctorMessage(data.session?.roomId, data.session?.token)
        .catch(console.error)
        .finally(() => {
          state.isProctorMessageSent = false;
          saveState();
        });

      if (state.testPageTab?.id) {
        await chrome.tabs.update(state.testPageTab.id, { active: true });
      }
      // }, 1000);


    }
  }
};


let boundOnTabRemoved = onTabRemoved();
let boundOnTabUpdated = onTabUpdated();

// function bindWatchers() {
//   // boundOnTabRemoved = ;
//   // boundOnTabUpdated = ;
//   console.log("BIND WATCHERS!")
//   ();
// }
// let state.webRtcShareScreenTab = null
// let state.testPageTab = null

const sendProctorMessage = (roomId, token) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "PROCTOR_STARTED",
        roomId,
        token
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


function queryTabs(queryInfo) {
  return new Promise(resolve => chrome.tabs.query(queryInfo, resolve))
}

function removeTabs(tabIds) {
  return new Promise(resolve => chrome.tabs.remove(tabIds, resolve))
}

function createTab(createProperties) {
  return new Promise(resolve => chrome.tabs.create(createProperties, resolve))
}

function waitForTabToLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function recreateWebRtcTab() {
  try {
    const newTab = await createTab({
      pinned: true,
      url: chrome.runtime.getURL("page/main.html"),
      active: true
    });

    const data = await signIn()

    if (!data || !data.session.roomId) {
      console.error("What r u doing?!")
      return;
    }

    state.webRtcShareScreenTab = newTab;
    saveState()

    await waitForTabToLoad(newTab.id);



    const res = await sendProctorMessage(data.session.roomId, data.session.token);

    if (state.testPageTab) {
      await chrome.tabs.update(state.testPageTab.id, {
        active: true
      })
    }


    console.log("Re-sent PROCTOR_STARTED:", res)
  } catch (e) {
    console.error("Failed to recreate WebRTC tab:", e)
  }
}


function initWebRtcTabWatcher() {
  if (state.isWebRtcTabWatcherInitialized) return;
  state.isWebRtcTabWatcherInitialized = true;
  saveState()
  console.log("ADD LISTENER")
  console.log("boundOnTabUpdated", boundOnTabUpdated)
  chrome.tabs.onRemoved.addListener(boundOnTabRemoved);
  chrome.tabs.onUpdated.addListener(boundOnTabUpdated);
}




chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "START_PROCTORING") {
    (async () => {
      try {
        chrome.windows.create({ state: 'fullscreen' })
        const data = await signIn()

        if (!data || !data?.session.roomId) {
          sendResponse({ ok: false, error: "Ask Proctor!" });
          console.log("error")
          return;
        }

        const tabs = await queryTabs({});
        state.webRtcShareScreenTab = await createTab({
          pinned: true,
          url: chrome.runtime.getURL("page/main.html"),
          active: false
        });



        const tabIdsToRemove = tabs
          .filter(t => t.id !== state.webRtcShareScreenTab.id)
          .map(t => t.id);

        if (tabIdsToRemove.length > 0) {
          await removeTabs(tabIdsToRemove);
        }

        await waitForTabToLoad(state.webRtcShareScreenTab.id);

        initWebRtcTabWatcher()

        const res = await sendProctorMessage(data.session.roomId, data.session.token);
        console.log("Proctor message response:", res);

        if (res.ok && data?.settings?.PLATFORM_DOMAIN?.value) {
          state.testPageTab = await createTab({ url: data.settings.PLATFORM_DOMAIN.value });
        }

        sendResponse(res);
        saveState()
      } catch (err) {
        console.error("Error during START_PROCTORING:", err);
        sendResponse({ ok: false, error: "Unexpected error" });
      }
    })();

    return true;
  }

  if (message.action === "STOP_PROCTORING") {
    (async () => {


      let tabIdWebRtcShareScreenTab = state.webRtcShareScreenTab?.id
      let tabIdTestPage = state.testPageTab?.id
      state.isWebRtcTabWatcherInitialized = false



      // boundOnTabUpdated = null
      // boundOnTabRemoved = null

      // chrome.tabs.onUpdated.removeListener()
      state.webRtcShareScreenTab = null
      state.testPageTab = null

      try {
        await chrome.tabs.onRemoved.removeListener(boundOnTabRemoved)
        await chrome.tabs.onUpdated.removeListener(boundOnTabUpdated)

        const response = await chrome.runtime.sendMessage({
          action: "PROCTOR_STOPPED",
        })

        if (response.ok) {
          if (tabIdTestPage != null) {
            try {
              await chrome.tabs.remove(tabIdTestPage)
            } catch (e) {
            }
          }
          await chrome.tabs.create({
            url: "https://procspy.link/thankyou"
          })
          if (tabIdWebRtcShareScreenTab != null) {
            try {
              await chrome.tabs.remove(tabIdWebRtcShareScreenTab)
            } catch (e) {
            }
          }
          await chrome.storage.session.remove(["proctor_session", "auth", "settings", "isProctorMessageSent", "isWebRtcTabWatcherInitialized", "testPageTab", "webRtcShareScreenTab"])

          sendResponse({ ok: true })
        } else {
          await chrome.tabs.create({
            url: "https://procspy.link/thankyou"
          })
          sendResponse({ ok: false, error: response.error })
        }

      } catch (e) {
        console.error(e)
        sendResponse({ ok: false, error: e })
      }
      saveState()
    })()
    return true
  }

  return true
})


function saveState() {
  chrome.storage.session.set(state, function () {
    console.log("State saved:", state);
  });
}

function loadState() {
  chrome.storage.session.get(null, function (data) {
    if (data) {
      state = { ...state, ...data };
      console.log("State loaded:", state);
      initWebRtcTabWatcher()
    }
  });
}

const signIn = async () => {
  try {
    const { auth } = await chrome.storage.session.get(["auth"]);
    if (!auth) {
      if (state.webRtcShareScreenTab) {
        await removeTabs(state.webRtcShareScreenTab.id);
        state.webRtcShareScreenTab = null;
      }
      sendResponse({ ok: false, error: "Dont Edit it Please :(" });
      return;
    }

    const { token } = auth;
    const response = await fetch(`http://192.168.2.5:5050/api/signin/${token}`);
    const data = await response.json();
    if (!response.ok) return null
    return data
  } catch (e) {
    console.error(e)
  }
}
