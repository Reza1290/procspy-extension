import { MediaMonitoring } from "../modules/MediaMonitoring.js";

require('dotenv').config()

let mediaMonitoring
let test

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "start_monitoring") {
        console.log('hello')

        // console.log(test.chromeVersion())

        if(typeof mediaMonitoring === "undefined"){
            mediaMonitoring = new MediaMonitoring(
                "https://192.168.2.7:3000/mediasoup", "2"
            )
            
            await mediaMonitoring.connect()
        }else{
            return;
        }

        if(mediaMonitoring.socketConnected){
            mediaMonitoring.getMediaDevices()
            mediaMonitoring.sendMessage('log-message','connected-from-extension')
        }
    }


    // if (message.action === "get_title") {
    //     sendResponse({ title: document.title });
    // }
});