const passedComponentClassList = `status rounded-full bg-white/90 px-4 py-[2px] text-xs font-semibold text-gray-950 italic`

const failedComponentClassList = `status rounded-full bg-red-400/75 px-4 py-[2px] text-xs font-semibold text-slate-100 italic`

const validateComponentClassList = `status rounded-full bg-white/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic`

const route = async (filePath) => {
  try {
    const response = await fetch(`../../src/page/${filePath}.html`);
    if (!response.ok) throw new Error("Error File Not Found / Path Not Found");

    const data = await response.text();
    document.getElementById("container").innerHTML = data;
  } catch (error) {
    console.error("Erorr: ", error);
  }
}

// const isAuthenticated = async () => {
//   return isLoggedIn
// }

const initApp = async () => {
  const initText = document.getElementById("init-text")
  let dots = 0;
  const loadingInterval = setInterval(() => {
    initText.textContent = "Loading" + ".".repeat(dots % 4); // "Loading.", "Loading..", "Loading..."
    dots++;
  }, 500);

  const startTime = Date.now();
  try {
    const proctorState = await sendMessageToWorker("PROCTOR_STATE")
    console.log(proctorState)
    if(proctorState?.data.proctor_state != undefined && ["resume","pause"].includes(proctorState?.data.proctor_state)){

      await route("proctoring")
      await initProctoring()
      return;
    }

    const initResponse = await sendMessageToWorker("INIT_DEVICE");

    clearInterval(loadingInterval);
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 4000 - elapsedTime);

    if (!initResponse?.data?.appInit) {
      setTimeout(() => {
        clearInterval(loadingInterval);
        initText.textContent = "Initialization Complete";
        route("requirements")
      }, remainingTime);
    } else {
      const isLoggedIn = await sendMessageToWorker("IS_AUTHENTICATED");
      console.log(isLoggedIn)
      if (isLoggedIn.data.isAuthenticated) {
        await route("identifier")
        await initIdentifier(isLoggedIn.data)
        return;
      }

      if (initResponse?.data?.authMethod === "token") {
        await route("token")
        await initTokenPage()
      } else {
        route("identifier")
      }
    }
  } catch (error) {
    clearInterval(loadingInterval);
    initText.textContent = "Error Initializing.";
    console.error("Initialization failed:", error);
  }


}

const initTokenPage = async () => {
  const tokenInput = document.getElementById('token')

  // tokenInput.addEventListener('')
  const buttonTokenSubmit = document.getElementById('btn-token-submit')

  buttonTokenSubmit.addEventListener('click', async () => {
    const response = await sendMessageToWorker("AUTH_USER", {
      token: tokenInput.value
    })

    await route("identifier")
    if (response.status) {
      await initIdentifier(response.data)
    } else {
      // TODO ERROR MESSAGE
    }
  })
}

const initIdentifier = async (response) => {

  const platformComponent = document.getElementById('platform')
  const idUserComponent = document.getElementById('id-user')
  const nameComponent = document.getElementById('name')
  const additionalInfoComponent = document.getElementById('additional-information')

  platformComponent.value = response.testPlatform
  idUserComponent.value = response.user.identifier
  nameComponent.value = response.user.name
  // idUserComponent.value = response.user.

  const startProctoringButton = document.getElementById("start-proctoring")

  startProctoringButton.addEventListener("click", async () => {
    const data = await sendMessageToWorker("START_PROCTORING")
    console.log(data)
    if (data.status) {
      route("proctoring")

    }
  })
}

const initProctoring = async () => {
  const proctoringData = await sendMessageToWorker("INIT_PROCTORING")
  console.log(proctoringData)
  const infoDetailButton = document.getElementById("info-detail-button")

  infoDetailButton.addEventListener("click", async () => {
    console.log('clciked')
    const elem = document.getElementById("info-detail");

    if (elem.classList.contains("h-0") && elem.classList.contains("hidden")) {
        elem.classList.remove("h-0", "hidden");
        elem.classList.add("h-max", "block");
    } else {
        elem.classList.remove("h-max", "block");
        elem.classList.add("h-0", "hidden");
    }
});

}

const sendMessageToWorker = async (action, payload) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: action, payload }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(response);
    });
  });
};

const sendMessageToCurrentTab = async (action, payload) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response);
      })
    })
  })
}



document.addEventListener("click", function (event) {

  if (event.target && event.target.matches("button#start")) {
    console.log("Button clicked!");

    const elementVerify = document.querySelectorAll('.status');
    const errorElement = document.getElementById('error-messages');

    while (errorElement.firstChild) {
      errorElement.removeChild(errorElement.firstChild);
    }

    elementVerify.forEach((val) => {
      val.classList.remove(...val.classList);
      val.classList.add(...validateComponentClassList.split(' '));
      val.textContent = "Validating";
    });

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const originalTabId = tabs[0].id;
      
        
        chrome.tabs.create({
          url: chrome.runtime.getURL("ask.html"),
          active: true
        });
        
        // chrome.runtime.sendMessage({
        //   action: "REDIRECT_BACK",
        //   tabId: originalTabId
        // });
      });

    } catch (error) {
      console.error("Error accessing media devices:", error);
      sendResponse({ error: error.message });

    }
    // chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    //   chrome.tabs.sendMessage(tabs[0].id, { action: "MEDIA_DEVICES_VALIDATOR" }, function (response) {
    //     if (!chrome.runtime.lastError) {
    //       console.log("Response:", response);
    //     }
    //   });
    // });
  }

  // if(event.target && event.target.matches("button#start-proctoring")) {
  //   console.log("test")



  // }
});


document.addEventListener("DOMContentLoaded", (event) => {
  initApp()


  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "REQUIREMENT_RESULT") {
      const result = message.data
      const verificationData = result.data
      const allPassed = result?.allPassed
      console.log(allPassed)




      verificationData.forEach((val, key) => {
        const elem = document.getElementById(val?.type)
        console.log(elem)
        elem.classList.remove(...elem.classList)
        if (val?.validate) {
          elem.classList.add(...passedComponentClassList.split(' '))
          elem.textContent = "Pass"
        } else {
          elem.classList.add(...failedComponentClassList.split(' '))
          elem.textContent = "Fail"
        }
      })

      const errorElement = document.getElementById('error-messages');

      const ulElement = document.createElement('ul');
      verificationData.forEach((e) => {
        if (e?.error) {
          let liElement = document.createElement('li');
          liElement.textContent = e.error;
          liElement.classList.add('px-5', 'py-1', 'text-red-800')
          ulElement.appendChild(liElement);
        }
      });

      errorElement.appendChild(ulElement);
      const actionBar = document.getElementById('action-bar');
      if (actionBar.childElementCount > 1) {

        actionBar.removeChild(actionBar.lastElementChild)
      }
      if (allPassed) {
        actionBar.firstElementChild.textContent = "Revalidate"
        const button = document.createElement('button');
        button.id = "next-identifier-page"
        button.className = "w-full rounded-md px-5 py-2 font-semibold text-white dark:bg-gray-900 border border-white/10";
        button.textContent = "Continue";


        actionBar.appendChild(button);

        button.addEventListener("click", () => {
          route('identifier')
        });

      }


    }
  })
  // chrome.runtime.addListener(){


  // }





})

