import { navigateTo } from "../../utils/router.js"
import { sendMessageToWorker } from "../../utils/worker/sendMessage.js"

export default async function page({error, user, settings}) {

    return `
      <div id="identifier-page" class="flex h-screen w-full flex-col bg-gray-950">
        <div class="flex flex-col items-center justify-center gap-2 border-b border-white/10 px-5 py-5 text-slate-100">
        <h1 class="text-xl font-semibold">Procspy 1.0</h1>
        <p class="rounded-md bg-white/10 p-1 px-2 text-center text-sm italic text-slate-300">Open website for the test that given by the Proctor or use the automatic checker.</p>
        </div>
        <div class="grow p-5 text-slate-200">
        ${settings?.PLATFORM_TYPE && settings?.PLATFORM_DOMAIN?.value ? `
            <p class="text-xs">*Proctor want you to open <span class="italic"><a href="" class="underline">${settings?.PLATFORM_DOMAIN?.value}</a></span> as the test page</p>
            `: `
            <p class="text-xs">
            *Proctor not specify the test page please input your test page on <span class="italic"><a href="" class="underline">Platform Name form</a></span> as the test page
        </p>
            `
        }
        
        <div class="flex flex-col gap-2 py-5">
            <label for="platform" class="font-medium">Platform Page *</label>
            <div class="flex justify-between gap-4">
            <input type="text" name="" id="platform" class="rounded-md border border-white/10 bg-white/5 px-2 py-1 w-full" value="${settings?.PLATFORM_NAME?.value}" />
            <a class="cursor-pointer truncate rounded-md bg-gray-800 px-4 font-medium w-24 flex justify-center items-center" href="${settings?.PLATFORM_DOMAIN?.value}" target="_blank">Open</a>
            </div>
        </div>
        <div class="flex flex-col gap-2 py-5">
            <p class="text-xs">*Your credentials for test result, please input if the data is empty.</p>
            <div class="flex flex-col gap-2 py-5">
            <div class="flex flex-col gap-2">
                <label for="platform" class="font-medium">Identifier *</label>
                <div class="flex justify-between gap-4">
                <input type="text" name="identifier" id="id-user" value="${user?.identifier}" readonly class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1" />
               
                </div>
                <small class="text-slate-400 italic text-xs">*Unique identifier.</small>
            </div>
            <div class="flex flex-col gap-2">
                <label for="platform" class="font-medium">Name *</label>
                <div class="flex justify-between gap-4">
                <input type="text" name="" id="name" value="${user?.name}" readonly class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1" />
               
                </div>
                <small class="text-slate-400 italic text-xs">*Name for assessment purpose.</small>
            </div>
            <div class="flex flex-col gap-2">
                <label for="platform" class="font-medium">Additional information <span class="italic text-slate-400 text-sm">(optional)</span></label>
                <div class="flex justify-between gap-4">
                <input type="text" name="" value="${user?.email}" id="additional-information" class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1" />
               
                </div>
                <small class="text-slate-400 italic text-xs">*Give more information if needed.</small>
            </div>
            </div>
        </div>
        </div>

        ${
            error ? `
            <div id="alert-messages">
                <div class="flex gap-4 bg-red-500 p-5 py-3 justify-between">
                    <p>${error}</p>
                </div>
            </div>
            ` : ``
        }
        <div class="flex flex-col justify-center gap-4 bg-gray-800/30 p-5 border-white/10 border-t">
        <small class="text-red-300 italic">*Make sure to open the webpage test exam first eventhough this will automatically opened.</small>
        
        <button class="w-full rounded-md px-5 py-2 font-semibold text-white bg-gray-800 cursor-pointer" id="start-proctoring">Start Procotor</button>
        </div>
    </div>
    `
}


export function setup() {
    const startProctoringButton = document.getElementById("start-proctoring")
    // const alertMessages = document.getElementById('alert-messages')
    // alertMessages.classList.add('hidden')

    // TODO: SESSION CHECK if RUNNING
    

    startProctoringButton.addEventListener("click", async () => {
        navigateTo('loading')
        const data = await sendMessageToWorker("START_PROCTORING")
        console.log(data)
        
        if (data.ok) {
            if(data.roomId && data.token){
                await chrome.storage.session.set({
                    proctor_session : {
                        roomId: data.roomId,
                        token: data.token,
                    }
                })
            }
            navigateTo('proctoring')
        } else {
            await chrome.storage.session.remove(["proctor_session"])
            const { auth, settings } = await chrome.storage.session.get(["auth","settings"])
            navigateTo('home', {user: auth, settings, error: data.error})
        }
    })
}
