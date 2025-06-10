import { navigateTo } from "../../utils/router.js"
import { sendMessageToWorker } from "../../utils/worker/sendMessage.js"
import AlertBox from "./components/AlertBox.js"
import MessageFromMeBox from "./components/MessageFromMeBox.js"
import MessageFromProctorBox from "./components/MessageFromProctorBox.js"

export default async function page({ user }) {
    return `
    
    <div id="proctoring-page" class="flex h-screen w-full flex-col bg-gray-950">
    <div class="flex flex-col items-center justify-center gap-2 border-b border-white/10 px-5 py-5 text-slate-100">
        <h1 class="text-xl font-semibold">Procspy 1.0</h1>
        <p class="rounded-md bg-white/10 p-1 px-2 text-center text-sm italic text-slate-300">You are being proctored,
            please be wise.</p>
    </div>
    <div class="flex gap-4 bg-gray-800/30 p-5 border-white/10 border-b">
        <button class="w-full rounded-md px-5 py-2 font-semibold text-white bg-red-700 cursor-pointer" id="stop-proctoring">Stop
            Proctor</button>

    </div>
    <div class="flex flex-col  bg-gray-800/30 p-5 py-1 border-white/10 border-b cursor-pointer">
        <div class="flex justify-between gap-4 w-full p-1" id="info-detail-button">
            <div class="flex justify-center w-full">
                <p class="text-center">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Info Detail</p>

            </div>
            <button class="w-4 fill-white rotate-180"><svg xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
                    <path
                        d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
                </svg>
            </button>
        </div>
        <div id="info-detail" class="p-5 transition-all h-0 hidden">
            <table class="w-full ">
                <tr>
                    <td colspan="2">
                        <div  class="border border-white/10 h-20 rounded-md bg-gray-950/50">
                            <canvas id="canvasPing"></canvas>

                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="p-1 pt-2 font-semibold w-1/3">IP Address</td>
                    <td class="p-1 pt-2" id="public-ip">192.168.0.2</td>
                </tr>
                <tr>
                    <td class="p-1 font-semibold w-1/3">Average Ping</td>
                    <td class="p-1" id="ping">Loading</td>
                </tr>
                


            </table>
        </div>
    </div>
    <div id="alert-messages" class="">
    </div>
    <div class="relative flex flex-col justify-end grow  gap-5">
        <div class="absolute inset-0 z-0 overflow-y-auto p-5 flex flex-col-reverse overflow-y-scroll p-5 gap-5" id="message-placeholder" ></div>
    </div>
    <div class="flex justify-center gap-4 bg-gray-800/30 p-5 border-white/10 border-t">
        <input type="text" name="" id="chatbox" class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1"
            placeholder="Type a message" />
    </div>
</div>
    
    `
}


export async function setup() {

    const stopProctoringButton = document.getElementById('stop-proctoring')
    const infoDetailButton = document.getElementById('info-detail-button')
    const infoDetailPanel = document.getElementById('info-detail')
    const messagePlaceholder = document.getElementById('message-placeholder')
    const alertMessagePlaceholder = document.getElementById('alert-messages')
    const chatbox = document.getElementById('chatbox')
    //TODO: Create Stop Proctoring 
    stopProctoringButton.addEventListener("click", async () => {
        //TODO: CONFIRMATION BUTTON
        const data = await sendMessageToWorker("STOP_PROCTORING")
        await chrome.storage.session.remove(["proctor_session", "auth", "settings", "chats"])
        if (data.ok) {
            navigateTo('default_auth')
        } else {
            console.log(data.error)
        }
    })

    let rttInterval = null;
    let lastPings = [0]
    infoDetailButton.addEventListener("click", async () => {
        const isHidden = infoDetailPanel.classList.toggle('hidden');
        infoDetailPanel.classList.toggle('h-0');

        const pingElement = document.getElementById('ping');
        const publicIpElement = document.getElementById('public-ip')

        if (!isHidden && rttInterval === null) {
            rttInterval = setInterval(async () => {
                console.log("RTT CHECK CALLED");

                const response = await chrome.runtime.sendMessage({
                    action: "GET_RTT",
                });

                if (response.ok) {
                    console.log(response)
                    pingElement.textContent = response.data.ping + " ms";
                    publicIpElement.textContent = response.data.ip
                    if (lastPings.length > 20) {
                        lastPings.shift()
                    }
                    lastPings.push(response.data.ping)
                    drawPing(lastPings)
                } else {
                    pingElement.textContent = "Failed";
                    publicIpElement.textContent = "-"
                }
            }, 4000);
        } else if (isHidden && rttInterval !== null) {
            clearInterval(rttInterval);
            rttInterval = null;
            pingElement.textContent = "-";
            publicIpElement.textContent = "-"
        }
    });



    //TODO: Info Detail
    //      -> Ping
    //      -> Ip

    //TODO: Chat Handling Using ProcspySocket.js
    //      -> Send Message
    //      -> Recieve Message

    const { chats } = await chrome.storage.session.get(["chats"])
    console.log("render")

    if (chats) {
        console.log(chats)
        chats.forEach(element => {
            if (element.from === "me") {
                if (!messagePlaceholder.firstElementChild) {
                    messagePlaceholder.appendChild(MessageFromMeBox(element.body))
                } else {

                    messagePlaceholder.insertBefore(MessageFromMeBox(element.body), messagePlaceholder.firstChild)
                }
            }
            else {
                if (!messagePlaceholder.firstElementChild) {
                    messagePlaceholder.appendChild(MessageFromProctorBox(element.body))
                } else {

                    messagePlaceholder.insertBefore(MessageFromProctorBox(element.body), messagePlaceholder.firstChild)
                }
            }
        });

    }

    chatbox.addEventListener("keypress", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const body = await chatbox.value
            // console.log(body)
            if (body != "") {
                const data = await chrome.runtime.sendMessage({
                    action: "PRIVATE_MESSAGE",
                    body
                })

                if (data.ok) {

                    const { chats } = await chrome.storage.session.get(["chats"])

                    if (chats) {
                        await chrome.storage.session.set({
                            chats: [
                                ...chats,
                                {
                                    from: "me",
                                    body: body
                                }
                            ]
                        })

                    } else {

                        await chrome.storage.session.set({
                            chats: [
                                {
                                    from: "me",
                                    body: body
                                }
                            ]
                        })
                    }

                    if (!messagePlaceholder.firstElementChild) {
                        messagePlaceholder.appendChild(MessageFromMeBox(body))
                    } else {

                        messagePlaceholder.insertBefore(MessageFromMeBox(body), messagePlaceholder.firstChild)
                    }
                } else {
                    alertMessagePlaceholder.appendChild(AlertBox("Message not sent"))
                }
            }
        }
    });

    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

        if (message.action === "PRIVATE_MESSAGE") {
            console.log(message.data)
            const data = message.data
            console.log(data)

            if (!messagePlaceholder.firstElementChild) {
                messagePlaceholder.appendChild(MessageFromProctorBox(data.body))
            } else {

                messagePlaceholder.insertBefore(MessageFromProctorBox(data.body), messagePlaceholder.firstChild)
            }
        }

        if (message.action === "RESTART_PROCTORING") {

            let countdown = 10
            const interval = setInterval(() => {
                alertMessagePlaceholder.innerHTML = "";

                alertMessagePlaceholder.appendChild(
                    AlertBox(`Please Share Again Your Screen In ${countdown} secs`)
                );
                countdown--;

                if (countdown < 0) {
                    clearInterval(interval)
                    alertMessagePlaceholder.innerHTML = ""
                }
            }, 1000)
        }

        if (message.action === "ABORT_PROCTORING") {
            const {data} = message
            let countdown = 3
            const interval = setInterval(() => {
                alertMessagePlaceholder.innerHTML = "";

                alertMessagePlaceholder.appendChild(
                    AlertBox(`Proctoring Aborted, Redirecting ${countdown} secs`)
                );
                countdown--;

                if (countdown < 0) {
                    clearInterval(interval)
                    alertMessagePlaceholder.innerHTML = ""
                }
            }, 1000)

            navigateTo('default_auth', {error: `Process Aborted ${data?.error ?? ': Cant Connect To The Server'}`})
        }
    })

    const drawPing = (data) => {
        var c = document.getElementById("canvasPing");
        var ctx = c.getContext("2d");
        var parentDiv = c.parentElement;

        c.width = parentDiv.clientWidth;
        c.height = parentDiv.clientHeight;

        ctx.strokeStyle = "#FDFFF5"
        ctx.clearRect(0, 0, c.width, c.height);

        ctx.moveTo(c.width - ((data.length - i) * (c.width / 20)), c.height - data[0]);

        for (var i = 1; i < data.length; i++) {
            ctx.lineTo((c.width - ((data.length - i) * (c.width / 20))), c.height - data[i]);
        }

        ctx.stroke();
    }


}