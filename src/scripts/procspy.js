import { globalConfig } from "../config/globalConfig.js"
import { MessageHandler } from "../modules/MessageHandler.js"
import { SocketHandler } from "../modules/SocketHandler.js"
import { WebRtcHandler } from "../modules/WebRtcHandler.js"

let socketHandler = null
let webRtcHandler = null
let messageHandler = null
let listenerRegistered = false;


const createConnection = async (roomId, authToken) => {
    socketHandler = null
    webRtcHandler = null
    messageHandler = null

    try {
        if (socketHandler && webRtcHandler) {
            throw Error("Already Created")
        }

        if (!socketHandler) {
            socketHandler = new SocketHandler(globalConfig.webSocketEndpoint, authToken)
            messageHandler = new MessageHandler(socketHandler, roomId)
            await socketHandler.connectToSocket()

            if (!listenerRegistered && socketHandler._isConnected) {
                messageHandler.messageListener(async (data) => {

                    const { action } = await data


                    if (action === "SEND_CHAT") {
                        const { chats } = await chrome.storage.session.get(["chats"])
                        if (chats) {
                            await chrome.storage.session.set({
                                chats: [
                                    ...chats,
                                    {
                                        from: "proctor",
                                        body: data.body
                                    }
                                ]
                            })

                        } else {

                            await chrome.storage.session.set({
                                chats: [
                                    {
                                        from: "proctor",
                                        body: data.body
                                    }
                                ]
                            })
                        }

                        await chrome.runtime.sendMessage({
                            action: "PRIVATE_MESSAGE",
                            data
                        })

                    }

                    if (action === "ABORT_PROCTORING") {
                        
                        await chrome.runtime.sendMessage({
                            action: "ABORT_PROCTORING",
                            data
                        })
                    }

                });
                listenerRegistered = true;
            }
        }

        if (!webRtcHandler && socketHandler._isConnected) {
            webRtcHandler = new WebRtcHandler(socketHandler, roomId)


        }


        // if (webRtcHandler && !socketHandler._isConnected) {
        //     await socketHandler.connectToSocket()
        // }

        if (webRtcHandler) {
            await webRtcHandler.getMediaDevices()
        }

        return { ok: true }

    } catch (err) {
        console.error("Error: ", err);
        throw err
    }
}

const stopProctoring = async () => {
    try {
        if (socketHandler) {
            socketHandler.disconnectFromSocket()
            webRtcHandler = null
            messageHandler = null
            listenerRegistered = false
            socketHandler = null

            return { ok: true }
        } else {
            throw Error("Not Connected")
        }
    } catch (e) {
        throw e
    }
}

const sendMessageToSocket = async (action, payload) => {
    if (!messageHandler) throw new Error("MessageHandler is not initialized");
    try {
        if (payload.attachment) {
            const imageBlob = await webRtcHandler.captureScreen();

            const base64 = await blobToBase64(imageBlob)


            payload.attachment.file = base64;

        }

        const data = await messageHandler.sendMessageToSocket(action, payload);
        return { ok: true, data }
    } catch (e) {
        throw e
    }

};

const blobToBase64 = async (imageBlob) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = (e) => {
            console.error(e)
            reject(e)
        };
        reader.readAsDataURL(imageBlob);
    });
}

const getRttSocket = async () => {
    if (!socketHandler) throw new Error("Socket Not Connected!")
    try {
        const { ip, rtt } = await socketHandler.getRTT()
        return { ok: true, data: { ip, ping: rtt } }
    } catch (e) {
        throw e
    }
}

const getGpuInfo = async () => {

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        let vendor = 'Unknown';
        let renderer = 'Unknown';

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
        return { vendor, renderer }
    } catch (e) {
        throw e
    }

}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PROCTOR_STARTED') {
        const { roomId, token } = message

        createConnection(roomId, token)
            .then(async (response) => {
                sendResponse({ ...response, roomId, token })
            })

            .catch((err) => sendResponse({ ok: false, error: err.message }))

        return true
    }

    if (message.action === "PROCTOR_STOPPED") {
        stopProctoring().then((res) => sendResponse(res)).catch((err) => sendResponse({ ok: false, error: err.message }))
        return true
    }

    if (message.action === "PRIVATE_MESSAGE") {
        const { action, body } = message



        sendMessageToSocket(action, {
            body
        }).then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: err.message }))
        return true
    }

    if (message.action === "LOG_MESSAGE") {
        const { action, flagKey, attachment = "" } = message

        sendMessageToSocket(action, {
            flagKey,
            attachment
        }).then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: err.message }))
        return true

    }

    if (message.action === "GET_RTT") {
        getRttSocket()
            .then((response) => sendResponse(response))
            .catch((error) => sendResponse({ ok: false, error: error.message }))

        return true
    }

    if (message.action === "GPU_INFO") {
        getGpuInfo()
            .then((response) => sendResponse(response))
            .catch((error) => sendResponse({ ok: false, error: error.message }))
        return true
    }

    if (message.action === "UPDATE_DEVICE_INFO") {
        sendMessageToSocket("UPDATE_DEVICE_INFO", { deviceInfo: message.deviceInfo }).then((res) => sendResponse(res))
            .catch((err) => sendResponse({ ok: false, error: err.message }))
        return true
    }

    return true
})



