import { navigateTo } from "./src/utils/router.js"


window.addEventListener('DOMContentLoaded', async () => {

    // try {
    //     await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // } catch (e) {
    //     await chrome.storage.local.remove("requirements_passed")
    // }

    const { requirements_passed } = await chrome.storage.local.get(["requirements_passed"])

    if (!requirements_passed) {
        navigateTo('requirement')
    }


    const { proctor_session, auth, settings } = await chrome.storage.session.get()
    if (proctor_session) {
        navigateTo('proctoring')
    } else if (auth && settings) {
        console.log('loggedIn')
        navigateTo('home', { user: auth, settings })
    } else {
        navigateTo('default_auth')
    }

})
