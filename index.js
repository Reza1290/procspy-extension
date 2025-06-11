import { navigateTo } from "./src/utils/router.js"


window.addEventListener('DOMContentLoaded', async () => {


    const { requirements_passed } = await chrome.storage.local.get(["requirements_passed"])

    if (!requirements_passed) {
        navigateTo('requirement')
    }


    const { proctor_session, auth, settings } = await chrome.storage.session.get()
    if (proctor_session) {
        navigateTo('proctoring')
    } else if (auth && settings) {
        
        navigateTo('home', { user: auth, settings })
    } else {
        navigateTo('default_auth')
    }

})
