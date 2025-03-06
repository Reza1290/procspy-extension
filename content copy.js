// const io = require('socket.io-client')
// const mediasoupClient = 1equire('mediasoup-client')

const roomName = "1"
chrome.runtime.sendMessage({
    type: "page_title",
    title: document.title
  });
// const socket = io("https://localhost:3000/mediasoup")


// socket.on('connection-success', ({ socketId }) => {
//     console.log(socketId)
//     // getLocalStream()
// })

// let device
// let rtpCapabilities
// let producerTransport
// let consumerTransports = []
// let audioProducer
// let videoProducer
// let consumer
// let isProducer = false

// let params = {
//     encodings: [
//         {
//             rid: 'r0',
//             maxBitrate: 100000,
//             scalabilityMode: 'S1T3',
//             dtx: true
//         },
//         {
//             rid: 'r1',
//             maxBitrate: 300000,
//             scalabilityMode: 'S1T3',
//             dtx: true

//         },
//         {
//             rid: 'r2',
//             maxBitrate: 900000,
//             scalabilityMode: 'S1T3',
//             dtx: true

//         },
//     ],
//     codecOptions: {
//         videoGoogleStartBitrate: 1000
//     }
// }

// let audioParams;
// let videoParams = { params };
// let consumingTransports = [];

// const streamSuccess = (stream) => {
//     // localVideo.srcObject = stream
//     console.log(stream)
//     audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
//     videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

//     joinRoom()
// }

// const joinRoom = () => {
//     socket.emit('joinRoom', { roomName }, (data) => {
//         console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)
//         rtpCapabilities = data.rtpCapabilities

//         createDevice()
//     })
// }


// const createDevice = async () => {
//     try {
//         device = new mediasoupClient.Device()

//         await device.load({
//             routerRtpCapabilities: rtpCapabilities
//         })

//         console.log('Device RTP Capabilities', device.rtpCapabilities)

//         createSendTransport()

//     } catch (error) {
//         console.log(error)
//         if (error.name === 'UnsupportedError')
//             console.warn('browser not supported')
//     }
// }

// const createSendTransport = () => {
//     socket.emit('createWebRtcTransport', { consumer: false }, ({ params }) => {
//         if (params.error) {
//             console.log(params.error)
//             return
//         }

//         console.log(params)

//         producerTransport = device.createSendTransport(params)

//         producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//             try {
//                 await socket.emit('transport-connect', {
//                     dtlsParameters,
//                 })

//                 callback()

//             } catch (error) {
//                 errback(error)
//             }
//         })

//         producerTransport.on('produce', async (parameters, callback, errback) => {
//             console.log(parameters)

//             try {
//                 await socket.emit('transport-produce', {
//                     kind: parameters.kind,
//                     rtpParameters: parameters.rtpParameters,
//                     appData: parameters.appData,
//                 }, ({ id, producersExist }) => {
//                     callback({ id })

//                     if (producersExist) getProducers()
//                 })
//             } catch (error) {
//                 errback(error)
//             }
//         })

//         connectSendTransport()
//     })
// }

// const connectSendTransport = async () => {

//     audioProducer = await producerTransport.produce(audioParams);
//     videoProducer = await producerTransport.produce(videoParams);

//     audioProducer.on('trackended', () => {
//         console.log('audio track ended')

//         // close audio track
//     })

//     audioProducer.on('transportclose', () => {
//         console.log('audio transport ended')

//         // close audio track
//     })

//     videoProducer.on('trackended', () => {
//         console.log('video track ended')

//         // close video track
//     })

//     videoProducer.on('transportclose', () => {
//         console.log('video transport ended')

//         // close video track
//     })
// }

// const signalNewConsumerTransport = async (remoteProducerId) => {
//     if (consumingTransports.includes(remoteProducerId)) return;
//     consumingTransports.push(remoteProducerId);

//     await socket.emit('createWebRtcTransport', { consumer: true }, ({ params }) => {
//         if (params.error) {
//             console.log(params.error)
//             return
//         }
//         console.log(`PARAMS... ${params}`)

//         let consumerTransport
//         try {
//             consumerTransport = device.createRecvTransport(params)
//         } catch (error) {
//             console.log(error)
//             return
//         }

//         consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//             try {
//                 await socket.emit('transport-recv-connect', {
//                     dtlsParameters,
//                     serverConsumerTransportId: params.id,
//                 })

//                 callback()
//             } catch (error) {
//                 errback(error)
//             }
//         })

//         connectRecvTransport(consumerTransport, remoteProducerId, params.id)
//     })
// }

// // socket.on('new-producer', ({ producerId }) => signalNewConsumerTransport(producerId))

// const getProducers = () => {
//     socket.emit('getProducers', producerIds => {
//         console.log(producerIds)
//         producerIds.forEach(signalNewConsumerTransport)
//     })
// }

// const connectRecvTransport = async (consumerTransport, remoteProducerId, serverConsumerTransportId) => {
//     await socket.emit('consume', {
//         rtpCapabilities: device.rtpCapabilities,
//         remoteProducerId,
//         serverConsumerTransportId,
//     }, async ({ params }) => {
//         if (params.error) {
//             console.log('Cannot Consume')
//             return
//         }

//         console.log(`Consumer Params ${params}`)
//         const consumer = await consumerTransport.consume({
//             id: params.id,
//             producerId: params.producerId,
//             kind: params.kind,
//             rtpParameters: params.rtpParameters
//         })

//         consumerTransports = [
//             ...consumerTransports,
//             {
//                 consumerTransport,
//                 serverConsumerTransportId: params.id,
//                 producerId: remoteProducerId,
//                 consumer,
//             },
//         ]

//         // const newElem = document.createElement('div')
//         // newElem.setAttribute('id', `td-${remoteProducerId}`)

//         // if (params.kind == 'audio') {
//         //     newElem.innerHTML = '<audio id="' + remoteProducerId + '" autoplay></audio>'
//         // } else {
//         //     newElem.setAttribute('class', 'remoteVideo')
//         //     newElem.innerHTML = '<video id="' + remoteProducerId + '" autoplay class="video" ></video>'
//         // }

//         // videoContainer.appendChild(newElem)

//         // const { track } = consumer

//         // document.getElementById(remoteProducerId).srcObject = new MediaStream([track])

//         socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
//     })
// }

// // socket.on('producer-closed', ({ remoteProducerId }) => {
// //     const producerToClose = consumerTransports.find(transportData => transportData.producerId === remoteProducerId)
// //     producerToClose.consumerTransport.close()
// //     producerToClose.consumer.close()

// //     consumerTransports = consumerTransports.filter(transportData => transportData.producerId !== remoteProducerId)

// //     // videoContainer.removeChild(document.getElementById(`td-${remoteProducerId}`))
// // })

// // let lastKeyPress = performance.now();
// document.addEventListener("keydown", (event) => {
//     let key = event.key.toLowerCase();
//     let isCtrl = event.ctrlKey;
//     let isAlt = event.altKey;
//     let isShift = event.shiftKey;
//     let isMeta = event.metaKey; // Command ⌘ key on Mac

//     // 🚨 Detect common shortcuts 🚨
//     if (isCtrl && key === "c") {
//         console.warn("⚠️ Ctrl+C detected (Copy)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "CopyShortcut" });
//     }
//     if (isCtrl && key === "v") {
//         console.warn("⚠️ Ctrl+V detected (Paste)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "PasteShortcut" });
//     }
//     if (isAlt && key === "tab") {
//         console.warn("⚠️ Alt+Tab detected (Switch Tab)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "SwitchTab" });
//     }
//     if (isCtrl && key === "p") {
//         console.warn("⚠️ Ctrl+P detected (Print)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "PrintShortcut" });
//     }
//     if (isCtrl && key === "s") {
//         console.warn("⚠️ Ctrl+S detected (Save Page)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "SavePageShortcut" });
//     }
//     if (isCtrl && key === "shift" && key === "i") {
//         console.warn("⚠️ Ctrl+Shift+I detected (Developer Tools)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "DevToolsShortcut" });
//     }
//     if (event.key === "PrintScreen") {
//         console.warn("⚠️ Print Screen detected (Screenshot)");
//         chrome.runtime.sendMessage({ type: "flag", flag: "ScreenshotShortcut" });
//     }
// });


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

//     if (message.action === "request_recording") {
//         console.log("requesting recording")

//         sendResponse(`processed: ${message.action}`);

//         navigator.mediaDevices.getDisplayMedia({
//             audio: true,
//             video: true
//         }).then((stream) => {
//             const track = stream.getVideoTracks()[0];
//             const settings = track.getSettings();

//             if (settings.displaySurface !== 'monitor') {
//                 console.warn("Only entire screen is allowed!");
//                 stream.getTracks().forEach(track => track.stop());
//                 alert("Please select Entire Screen only!");
//             } else {
//                 streamSuccess(stream);
//             }
//         }).catch((error) => {
//             console.error("Screen sharing failed:", error);
//         });


//     }

//     if (message.action === "stopvideo") {
//         console.log("stopping video");
//         sendResponse(`processed: ${message.action}`);
//         if (!recorder) return console.log("no recorder")

//         recorder.stop();


//     }



// })

