import { globalConfig } from "../../../config/globalConfig.js"
import { navigateTo } from "../../../utils/router.js"

export default async function page({error, users }) {
    return `
     <div id="token-page" class="flex h-screen w-full flex-col bg-gray-950">
        <div class="flex flex-col items-center justify-center gap-2 border-b border-white/10 px-5 py-5 text-slate-100">
            <h1 class="text-xl font-semibold">Procspy 1.0</h1>
            <p class="rounded-md bg-white/10 p-1 px-2 text-center text-sm italic text-slate-300">Your proctor already set
                the Default Test Page please input your Token String to identify yourself.</p>
        </div>
        
        <div class="grow p-5 text-slate-200 flex justify-center items-center px-10">
            <div class="flex flex-col gap-2 w-full">
                <label for="token" class="font-medium">Token *</label>
                <div class="flex justify-between gap-4">
                    <input type="text" name="token" id="token"
                        class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1" />
                    <!-- <button class="cursor-pointer truncate rounded-md bg-gray-800 px-4 font-medium">Open</button> -->
                </div>
                <small class="text-slate-400 italic text-xs">*Unique token.</small>
            </div>
        </div>
        <div id="alert-messages">
        ${
            error ? `
                <div class="flex gap-4 bg-red-500 p-5 py-3 justify-between">
                    <p>${error}</p>
                </div>
                ` : ``
            }
        </div>
        <div class="flex flex-col justify-center gap-4 bg-gray-800/30 p-5 border-white/10 border-t">
            <button id="btn-token-submit"
                class="w-full rounded-md px-5 py-2 font-semibold text-white bg-gray-800 cursor-pointer">Next</button>
        </div>
    </div>
    `
}


export function setup() {
    const tokenInput = document.getElementById('token')

    const buttonTokenSubmit = document.getElementById('btn-token-submit')
    const alertMessages = document.getElementById('alert-messages')


    buttonTokenSubmit.addEventListener('click', async () => {
        const token = tokenInput.value
        if(token === ""){
            return;
        }
        const data = await authSignIn(token)
        if(data?.user) {
            await chrome.storage.session.set({
                auth: {
                    identifier: data?.user?.identifier,
                    name: data?.user?.name,
                    email: data?.user?.email,
                    token: data?.session?.token,
                }
            })

            await chrome.storage.session.set({
                settings : data.settings
            })
            navigateTo('home', data)
        } else {
           
            navigateTo('default_auth', data)
        }
    })
}


async function authSignIn(token) {
    try {
        const response = await fetch(`${globalConfig.authEndpoint || "https://192.168.2.5"}/api/signin/${token}`)
        const data = await response.json()

        return data
    } catch (error) {
    }
}