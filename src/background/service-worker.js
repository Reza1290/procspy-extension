import { globalConfig } from '../config/globalConfig.js';
import { DeviceInfo } from '../modules/DeviceInfo.js';
let state = {
  isWebRtcTabWatcherInitialized: false,
  isProctorMessageSent: false,
  webRtcShareScreenTab: null,
  testPageTab: null,
  proctoringMode: false,
  focusMode: 0
}

loadState()

let deviceInfo = new DeviceInfo()

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

  if (changeInfo.status === 'complete' && tabId !== state.testPageTab?.id && tabId != state.webRtcShareScreenTab?.id && state.proctoringMode != false) {
    sendServerLogMessage("SWITCH_TAB", {
      title: tab.title,
      url: tab.url,
    });

    if (changeInfo.status === 'complete' && tab.url && !tab.url?.startsWith("chrome://") && !tab.url?.startsWith("chrome-extension://")) {

      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ["scripts/keystroke.js"],
        })
        
    }

    return true
  }



  return true
})

chrome.windows.onBoundsChanged.addListener((event) => {

  if (event.state != 'minimized' && state.proctoringMode && state.testPageTab != null) {
    sendServerLogMessage("MINIMIZE_WINDOW", {
      width: event.width
    })
    return true
  }

  return true
})

chrome.system.display.onDisplayChanged.addListener(() => {

  deviceInfo.getAllInfo().then((e) => {
    if (e.displays.length > 1 && state.proctoringMode && state.focusMode) {
      sendServerLogMessage("MULTIPLE_MONITORS", { displays: e.displays })
    }
    return true
  })
  return true
})

chrome.windows.onFocusChanged.addListener((event) => {
  state.focusMode += 1
  if (event < 0 && state.proctoringMode && state.focusMode > 5) {
    sendServerLogMessage("WINDOW_OFF", { id: event })
  }
  saveState()
  return true
})

const updateDeviceInfo = async () => {
  const res = await deviceInfo.getAllInfo()
  const response = await sendDeviceUpdateMessage(res)
  const {authenticate} = response.data
  return authenticate ?? false
}

const sendDeviceUpdateMessage = (deviceInfo) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "UPDATE_DEVICE_INFO", deviceInfo }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError)
      }
      resolve(response)
    })
  })
}

const onTabRemoved = () => async (closedTabId) => {
  if (state.webRtcShareScreenTab && closedTabId === state.webRtcShareScreenTab.id) {
    console.warn("state.webRtcShareScreenTab closed — recreating...");

    chrome.tabs.onRemoved.removeListener(boundOnTabRemoved)
    chrome.tabs.onUpdated.removeListener(boundOnTabUpdated)
    state.isWebRtcTabWatcherInitialized = false;
    state.focusMode = 0
    saveState()
    if (state.proctoringMode) {
      await recreateWebRtcTab();
      initWebRtcTabWatcher();
    }
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
      state.focusMode = 0
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

      if (state.testPageTab) {
        try {
          await chrome.tabs.update(state.testPageTab.id, {
            active: true
          })
        } catch (e) {
          state.testPageTab = await createTab({ url: data.settings.PLATFORM_DOMAIN.value })
          saveState()
        }
      }
      // }, 1000);


    }
  }
};


let boundOnTabRemoved = onTabRemoved();
let boundOnTabUpdated = onTabUpdated();


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
    state.focusMode = 0
    saveState()
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
      try {
        await chrome.tabs.update(state.testPageTab.id, {
          active: true
        })
      } catch (e) {
        state.testPageTab = await createTab({ url: data.settings.PLATFORM_DOMAIN.value })
        saveState()
      }
    }


  } catch (e) {
    console.error("Failed to recreate WebRTC tab:", e)
  }
}


function initWebRtcTabWatcher() {
  if (state.isWebRtcTabWatcherInitialized) return;
  state.isWebRtcTabWatcherInitialized = true;
  state.focusMode = 0
  saveState()
  chrome.tabs.onRemoved.addListener(boundOnTabRemoved);
  chrome.tabs.onUpdated.addListener(boundOnTabUpdated);
}




chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "START_PROCTORING") {
    (async () => {
      try {
        state.focusMode = 0
        saveState()
        // chrome.windows.create({state: 'fullscreen'})
        const data = await signIn()
        

        if (!data || !data?.session.roomId) {
          sendResponse({ ok: false, error: "Ask Proctor!" });
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
        state.proctoringMode = true;


        const res = await sendProctorMessage(data.session.roomId, data.session.token);

        if (res.ok && data?.settings?.PLATFORM_DOMAIN?.value) {
          state.testPageTab = await createTab({ url: data.settings.PLATFORM_DOMAIN.value });
          const authenticate = await updateDeviceInfo()
          if(!authenticate){
            stopOrAbortProctoring({notifyServer: false, sendResponse, init: false})
            sendResponse({ ok: false, error: "Ask Proctor!" })
            return
          }          
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
      await stopOrAbortProctoring({ notifyServer: true, sendResponse });
    })();
    return true;
  }

  if (message.action === "ABORT_PROCTORING") {
    (async () => {
      await stopOrAbortProctoring({ notifyServer: false, sendResponse });
    })();
    return true;
  }

  if (message.action === "RESTART_PROCTORING") {
    restartProctoring()
  }

  if (message.action === "GET_DEVICE_INFO") {
    (async()=>{
      const res = await deviceInfo.getAllInfo()
      sendResponse(res)
    })()
  }
  return true
})



const restartProctoring = async () => {
  await chrome.tabs.reload(state.webRtcShareScreenTab.id)
  await chrome.notifications.create('alert', {
    type: 'basic',
    iconUrl: '../../assets/images/icon-16.png',
    title: 'Something Went Wrong!',
    message: 'Click to open the panel.',
    requireInteraction: false
  });

  setTimeout(() => {
    chrome.notifications.clear('alert');
  }, 4000)

}

const stopOrAbortProctoring = async ({ notifyServer = false, sendResponse, init = false }) => {
  const tabIdWebRtcShareScreenTab = state.webRtcShareScreenTab?.id;
  const tabIdTestPage = state.testPageTab?.id;

  state.isWebRtcTabWatcherInitialized = false;
  state.webRtcShareScreenTab = null;
  state.testPageTab = null;

  try {
    await chrome.tabs.onRemoved.removeListener(boundOnTabRemoved);
    await chrome.tabs.onUpdated.removeListener(boundOnTabUpdated);

    let response = { ok: true };

    if (notifyServer) {
      response = await chrome.runtime.sendMessage({ action: "PROCTOR_STOPPED" });
    }

    if (response.ok) {
      if (tabIdTestPage != null) {
        try {
          await chrome.tabs.remove(tabIdTestPage);
        } catch (e) {}
      }

      if (notifyServer) {
        await chrome.tabs.create({ url: "https://procspy.link/thankyou" });
      }else{
        await chrome.tabs.create({ url: "http://procspy.link/aborted_page"})
      }

      if (tabIdWebRtcShareScreenTab != null) {
        try {
          await chrome.tabs.remove(tabIdWebRtcShareScreenTab);
        } catch (e) {}
      }

      await chrome.storage.session.remove([
        "auth",
        "settings",
        "proctor_session",
        "isProctorMessageSent",
        "isWebRtcTabWatcherInitialized",
        "testPageTab",
        "webRtcShareScreenTab",
        "proctoringMode"
      ]);

      if(!init){
        sendResponse({ ok: true });
      }
      
    } else {
      if (notifyServer) {
        await chrome.tabs.create({ url: "https://procspy.link/thankyou" });
      }
      sendResponse({ ok: false, error: response.error });
    }

    state.proctoringMode = false;
  } catch (e) {
    console.error(e);
    sendResponse({ ok: false, error: e });
  }

  saveState();
};

function saveState() {
  chrome.storage.session.set(state, function () {
  });
}

function loadState() {
  chrome.storage.session.get(null, function (data) {
    if (data) {
      state = { ...state, ...data };
      if (state.proctoringMode) {
        initWebRtcTabWatcher()
      }
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
      return;
    }

    const { token } = auth;
    const response = await fetch(`${globalConfig.authEndpoint || "http://192.168.2.5:5050"}/api/signin/${token}`);
    const data = await response.json();
    if (!response.ok) return null
    return data
  } catch (e) {
    console.error(e)
  }
  return null
}


chrome.notifications.onClicked.addListener((notificationId) => {

  (async () => {
    await chrome.sidePanel.open({ tabId: state.webRtcShareScreenTab.id })
  })()

})