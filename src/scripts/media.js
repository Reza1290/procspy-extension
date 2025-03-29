import { MediaMonitoring } from "../modules/MediaMonitoring.js";

require('dotenv').config()

let mediaMonitoring
let test

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message)
    if (message.action === "PROCTOR_STARTED") {
        
        (async () => {

                console.log('hello')

                // console.log(test.chromeVersion())

                if (typeof mediaMonitoring === "undefined") {
                    mediaMonitoring = new MediaMonitoring(
                        "https://192.168.2.5:3000/mediasoup", "2"
                    )

                    await mediaMonitoring.connect()
                } else {
                    return;
                }

                if (mediaMonitoring.socketConnected) {
                    mediaMonitoring.getMediaDevices()
                    mediaMonitoring.sendMessage('log-message', 'connected-from-extension')
                    chrome.runtime.sendMessage({action: "UPDATE_PROCTOR_STATE", data :{
                        proctor_state: "resume"
                    }})
                }
                sendResponse({status: true, data: {
                    
                }})
            }
        )()

        return true

    }

    // if (message.action === "MEDIA_DEVICES_VALIDATOR") {

    //     try {
    //         let resData = {}
    //         setTimeout(async () => {
    //             const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    //             const devices = await navigator.mediaDevices.enumerateDevices();

    //             const mediaDevices = devices.filter(device =>
    //                 device.kind === "videoinput" || device.kind === "audioinput"
    //             );
    //             const cam = stream.getVideoTracks()[0].getSettings()
    //             const mic = stream.getAudioTracks()[0].getSettings()
    //             console.log("Active Devices:", { cam, mic });

    //             resData = { cam, mic }
    //             await chrome.runtime.sendMessage({ action: "MEDIA_DEVICES_LIST", stream: { cam, mic } }, function (data) {
    //                 resData = data
    //             });

    //             stream.getTracks().forEach(track => track.stop());
    //         }, 1000)
    //     } catch (error) {
    //         console.error("Error accessing media devices:", error);
    //         sendResponse({ error: error.message });

    //     }

    //     return true

    // }

    // if (message.action === "get_title") {
    //     sendResponse({ title: document.title });
    // }
});

