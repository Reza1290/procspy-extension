import { SystemRequirementValidator } from "../../modules/SystemRequirementValidator.js";
import { navigateTo } from "../../utils/router.js";
import ErrorBox from "./components/ErrorBox.js";

export default async function page() {
    return `
    <div id="requirements-page" class="h-screen w-full bg-gray-950 flex flex-col">
        <div class="flex flex-col items-center justify-center gap-2 border-b border-white/10 py-5 text-slate-100">
            <h1 class="text-xl font-semibold">Procspy 1.0</h1>
            <p class="rounded-md bg-white/10 p-1 px-2 text-center text-sm italic text-slate-300">Read the documentation
                that your proctor gave first.</p>
        </div>
        <div class="flex bg-gray-800/30 p-1 grow">
            <div class="flex flex-col gap-2 grow p-3 border rounded-lg border-white/10 text-slate-100 bg-gray-950">
                <h1 class="font-normal">Requirements *</h1>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Chrome Version Above 130</p>
                    <div id="chrome_version_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Support WebRTC</p>
                    <div id="cpu_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Camera Device</p>
                    <div id="camera_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Microphone Device</p>
                    <div id="microphone_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <!-- <div class="flex items-baseline gap-5 px-5">
              <p class="text-sm font-light">> Supported Operating Systems</p>
              <div id="os_validation" class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                Unvalidated</div>
            </div> -->
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Internet Speed Above 10Mbps</p>
                    <div id="internet_speed_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">> Device Ram Size Minimum 4 GB</p>
                    <div id="ram_size_validation"
                        class="status rounded-full bg-slate-400/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
                <div class="flex items-baseline gap-5 px-5">
                    <p class="text-sm font-light">
                        > Supported Browser <span class="italic underline"><a href="">[see here]</a></span>
                    </p>
                    <div id="permittable_browser_validation"
                        class="status rounded-full bg-slate-400/10 px-4 pt-[1px] text-xs font-semibold text-slate-100 italic">
                        Unvalidated</div>
                </div>
            </div>
        </div>
        <div id="error-messages" class="flex flex-col bg-gray-800/30 w-full py-1">
    
        </div>
        <div id="action-bar" class="flex justify-center p-5 bg-gray-800/30 gap-4">
            <button class="w-full rounded-md px-5 py-2 font-semibold text-white bg-gray-800" id="start">Start
                Validation</button>
        </div>
        <!-- <div class="bg-gray-800/30 p-1">
          <div class="flex flex-col gap-2 p-5 border rounded-lg border-white/10 text-slate-100 bg-gray-950 ">
            test
          </div>
        </div> -->
    </div>
    
    `


}

export function setup() {
    const passedComponentClassList = `status rounded-full bg-white/90 px-4 py-[2px] text-xs font-semibold text-gray-950 italic`

    const failedComponentClassList = `status rounded-full bg-red-400/75 px-4 py-[2px] text-xs font-semibold text-slate-100 italic`

    const validateComponentClassList = `status rounded-full bg-white/10 px-4 py-[2px] text-xs font-semibold text-slate-100 italic`
    let devicePermission = false

    const startBtn = document.getElementById("start");
    const elementVerify = document.querySelectorAll('.status');
    const errorElement = document.getElementById('error-messages');
    const actionBar = document.getElementById('action-bar');


    console.log('req')
    let cam, mic
    startBtn?.addEventListener("click", async () => {
        const requirement = new SystemRequirementValidator()
        if(actionBar.children.length > 1){
            actionBar.lastElementChild.remove()
        }
        if(devicePermission){
            startBtn.textContent = "Revalidate..."
        }


        while (errorElement.firstChild) {
            errorElement.removeChild(errorElement.firstChild);
        }

        elementVerify.forEach((val) => {
            val.classList.remove(...val.classList);
            val.classList.add(...validateComponentClassList.split(' '));
            val.textContent = "Validating";
        });

        try {

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            cam = stream.getVideoTracks()[0]?.getSettings();
            mic = stream.getAudioTracks()[0]?.getSettings();

            devicePermission = true
            console.log('granted')
            stream.getTracks().forEach(track => track.stop());
        } catch (e) {
            devicePermission = false
            console.error("Media error:", e);
            await chrome.tabs.create({ url: chrome.runtime.getURL("page/ask.html") })
        }

        if (!devicePermission) {
            const errorElement = document.getElementById('error-messages')
            const ulElement = document.createElement('ul')
            ulElement.appendChild(ErrorBox("Camera/Microphone access denied. <button class='text-white cursor-pointer' id='start'>Click Button</button>"))
            errorElement.appendChild(ulElement)
            startBtn.textContent = "Regrant Permission"
            return;
        }


        try {
            requirement.setDevicesList({ cam, mic });
            const resultRequirements = await requirement.checkAllRequirements();

            if (resultRequirements.allPassed) {
                await chrome.storage.local.set({ areRequirementsPassed: resultRequirements.allPassed });
            }

            const verificationData = resultRequirements.data
            const allPassed = resultRequirements.allPassed

            verificationData.forEach((val, key) => {
                const elem = document.getElementById(val?.type)
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
                button.addEventListener("click", async () => {
                    await chrome.storage.local.set({requirements_passed: true})
                    navigateTo('default_auth')
                });

            } else {
                actionBar.firstElementChild.textContent = "Revalidate"
            }
        } catch (err) {

        }

    });
}



