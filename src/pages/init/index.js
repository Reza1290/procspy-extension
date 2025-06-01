import { navigateTo } from "../../utils/router.js";

export default async function page({ users }) {

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
            if (proctorState?.data.proctor_state != undefined && ["resume", "pause"].includes(proctorState?.data.proctor_state)) {
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

    const fetch = async () =>{          
          chrome.storage.session.get(["test"]).then((result) => {
            console.log("Value is " + result.test);
          });
    }
    // await fetch()

    
    return `
    
    `
}
