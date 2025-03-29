import { globalConfig } from "./src/config/globalConfig.js"
import { DeviceInfo } from "./src/modules/DeviceInfo.js"
import { PlatformInfo } from "./src/modules/PlatformInfo.js"
import { SystemRequirementValidator } from "./src/modules/SystemRequirementValidator.js"


const requirement = new SystemRequirementValidator()
// const platformInfo = new PlatformInfo()

//do initialize here! -author
// platformInfo.setSpecifiedPlatform('quizizz.com')
// platformInfo.checkPlatform()

const storageCache = {}
const iniStorageCache = chrome.storage.local.get().then((items) => {
  Object.assign(storageCache, items)
})




chrome.runtime.onInstalled.addListener(async () => {
  console.log("Service Worker Installed")




})


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))


chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {

  if (!tab.url) return
  const url = new URL(tab.url)

  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: true
  })

})


let lockedTabId = null;


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "INIT_PROCTORING") {
    (async () => {
      const proctorState = await chrome.storage.session.get(["proctor_state"])
      const device = new DeviceInfo();
      const deviceInfo = await device.getAllInfo()

      sendResponse({status: true, data: {
        proctor_state: proctorState.proctor_state,
        deviceInfo
      }})
    })()

    return true
  }
  if (message.action === "START_PROCTORING") {
    (async () => {
      const tab = await chrome.tabs.create({
        pinned: true,
        url: chrome.runtime.getURL("main.html")
      });

      const tabId = tab.id;
      lockedTabId = tab.id;
      const mainUrl = chrome.runtime.getURL("main.html");

      const sendProctorMessage = (updatedTabId) => {
        if (updatedTabId === lockedTabId) {
          chrome.runtime.sendMessage({
            action: "PROCTOR_STARTED",
            tabId: lockedTabId
          });
        }
      };

      chrome.tabs.onUpdated.addListener((updatedTabId, changeInfo, tab) => {
        if (updatedTabId === lockedTabId) {
          if (changeInfo.status === "complete") {
            sendProctorMessage(updatedTabId);
          }


          if (tab.url && tab.url !== mainUrl) {
            chrome.tabs.update(updatedTabId, { url: mainUrl });
          }
        }
      });

      chrome.tabs.onRemoved.addListener((tabId) => {
        if (tabId === lockedTabId) {
          chrome.tabs.create({
            pinned: true,
            url: mainUrl
          }).then(newTab => {
            lockedTabId = newTab.id;
            chrome.tabs.onUpdated.addListener((updatedTabId, changeInfo) => {
              if (updatedTabId === newTab.id && changeInfo.status === "complete") {
                sendProctorMessage(updatedTabId);
              }
            });
          });
        }
      });

      sendResponse({ status: true, tabId: tabId });
    })();

    return true;
  }

  if(message.action === "RESTART_PROCTORING"){
    (async()=>{
      const tab = await chrome.tabs.reload(lockedTabId)
      await chrome.tabs.update(lockedTabId, {active: true})
    })()
    return true
  }

  if (message.action === "INIT_DEVICE") {
    (async () => {

      // const globalServerConfig = await fetch(globalConfig.testEndpoint ?? globalConfig.defaultTestEndpoint)
      const globalServerConfig = {
        testEndpoint: "https://dev.ciptakode.biz.id",
        authMethod: "token",
        testPlatform: "Ciptakode Exam Platform"
      }

      const config = {
        ...globalConfig,
        ...globalServerConfig
      }


      const result = await chrome.storage.local.get(["areRequirementsPassed"]);
      // console.log("ASOLOLE");
      sendResponse({
        status: true, data: {
          appInit: result.areRequirementsPassed || false,
          ...config
        },
      });
    })();
    return true;

  }
  if (message.action === "IS_AUTHENTICATED") {
    (async () => {
      const session = await chrome.storage.session.get(["user"])
      if (session.user !== undefined) {
        await sendResponse({
          status: true, data: {
            user: session.user,
            isAuthenticated: true
          }
        })
      } else {
        await sendResponse({
          status: true, data: {
            isAuthenticated: false
          }
        })
      }
    })()
    return true
  }

  if (message.action === "AUTH_USER") {

    (async () => {
      await chrome.storage.session.set({
        user: {
          identifier: "3122500024",
          name: "reza",
          room: "2",
          token: "0Xc1514423d",
        }
      })
      //TODO: MAKE ENDPOINT 
      // // const userAuth = await fetch('endpoint user auth')
      // const res = await userAuth.data

      // await chrome.storage.session.set({ token: message.token })
      sendResponse({
        status: true, data: {
          user: {
            identifier: "3122500024",
            name: "reza",
            room: "2",
            token: "0Xc1514423d",
          },
          testPlatform: "ELERANING"
        }
      })

    })()

    return true

  }

  if (message.action === "MEDIA_DEVICES_LIST") {

    (async () => {
      console.log("Received media devices list:", message);
      requirement.setDevicesList(message.stream);

      const resultRequirements = await requirement.checkAllRequirements();
      await chrome.storage.local.set({ areRequirementsPassed: resultRequirements.allPassed });

      chrome.runtime.sendMessage({ action: "REQUIREMENT_RESULT", data: resultRequirements });

      sendResponse({ status: true, data: true });
    })();
    return true;
  }

  if (message.action === "PROCTOR_STATE") {
    (async () => {
      const state = await chrome.storage.session.get(["proctor_state"])

      if(state.proctor_state){

        sendResponse({
          status: true, data: {
            proctor_state: state.proctor_state
          }
        })
      }else{
        sendResponse({
          status: true, data: {
          }
        })

      }
    })()
    return true
  }

  if (message.action === "UPDATE_PROCTOR_STATE") {
    (async () => {
      const state = await chrome.storage.session.set({
        proctor_state: message.data.proctor_state
      })

      sendResponse({
        status: true, data: {
          proctor_state: state
        }
      })
    })()
    return true
  }
});

const updateProctorState = async (state) => {
  let stateNow = await chrome.storage.session.get(["proctor_state"])

  if (stateNow.proctor_state != undefined) {
    let stateNow = await chrome.storage.session.set({
      proctor_state: state
    })

  }

  return stateNow
}




// chrome.commands.onCommand.addListener((command) => {
//   console.warn(`⚠️ Shortcut Detected: ${command}`)
//   chrome.runtime.sendMessage({ type: "flag", flag: command })
// })

// chrome.tabs.onActivated.addListener(async (activeInfo) => {
//   if (lastTabId === activeInfo.tabId) return
//   lastTabId = activeInfo.tabId

//   console.log(`🚨 Tab Switched | Tab ID: ${activeInfo.tabId}`)

//   chrome.scripting.executeScript({
//     target: { tabId: activeInfo.tabId },
//     files: ["content.js"]
//   })
//     .then(() => {
//       console.log("✅ Content script injected")
//     })
//     .catch((err) => console.error("❌ Injection Failed:", err))
// })

// chrome.windows.onFocusChanged.addListener(async (windowId) => {
//   if (windowId === chrome.windows.WINDOW_ID_NONE) {
//     console.warn(`Window Lost Focus (Alt + Tab Detected)`)
//   }

//   if (windowId !== lastWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
//     lastWindowId = windowId

//     console.log(`🔄 Window Switched | Window ID: ${windowId}`)

//     const [tab] =  chrome.tabs.query({ active: true, windowId: windowId })
//     if (tab) {
//       console.log(`🚨 Active Tab Title: ${tab.title}`)
//       chrome.scripting.executeScript({
//         target: { tabId: tab.id },
//         files: ["content.js"]
//       })
//     }
//   }
// })

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "page_title") {
//     console.warn(`🎯 Page Title Detected: ${message.title}`)
//     reportFlag("page_title", message.title)
//   }
// })

// function checkCommandShortcuts() {
//   chrome.commands.getAll((commands) => {
//     const missing = commands.filter((cmd) => cmd.shortcut === "")
//     if (missing.length) {
//       console.warn(`⚠️ Missing Shortcuts: ${missing.map((cmd) => cmd.name).join(", ")}`)
//     }
//   })
// }

// async function reportFlag(flag, value) {
//   console.warn(`🚨 Flag Reported: ${flag} | Value: ${value}`)
//   // Example: send to backend
//   //  fetch("https://your-api-endpoint/report", { method: "POST", body: JSON.stringify({ flag, value }) })
// }
