import * as mediasoupClient from 'mediasoup-client'
import { sendServerLogMessage } from '../utils/sendLogMessage'
import { MessageHandler } from './MessageHandler'
// import { sendMessageToWorker } from "../utils/worker/sendMessage"

export class WebRtcHandler {
    constructor(socketHandler, roomId) {
        this.socket = socketHandler
        this.roomId = roomId
        this.socketId = this.socket.getSocket().id
        this.videoParams = null
        this.localMessageHandler = new MessageHandler(socketHandler, roomId)
    }

    async getMediaDevices() {
        let mediaStream = {}
        let displayStream
        let deviceStream
        try {
            displayStream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true
            })

            const videoTrack = displayStream.getVideoTracks()[0]
            const audioTrack = displayStream.getAudioTracks()
            const videoSetting = videoTrack.getSettings()

            if (videoSetting.displaySurface !== 'monitor') {
                throw new Error("Please share your Full Screen or Monitor")
            }

            if (audioTrack.length === 0) {
                throw new Error("Please share your Audio")
            }

            deviceStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            })

            const cameraTrack = deviceStream.getVideoTracks()
            const microphoneTrack = deviceStream.getAudioTracks()

            if (cameraTrack.length === 0 || microphoneTrack.length === 0) {
                throw new Error("Please turn on your Camera and Microphone")
            }

            mediaStream = {
                displayStream: displayStream,
                deviceStream: deviceStream
            }

            this.shareStream(mediaStream)
        } catch (err) {
            console.warn(err.message)
            alert(err.message)

            if (displayStream) {
                displayStream.getTracks().forEach(track => track.stop())
            }
            if (deviceStream) {
                deviceStream.getTracks().forEach(track => track.stop())
            }

            throw err
        }
    }

    shareStream(stream) {

        this.audioParams = {
            appData: {
                name: "audio"
            }, track: stream.displayStream.getAudioTracks()[0], ...this.audioParams
        }

        this.videoParams = {
            appData: {
                name: "video"
            },
            track: stream.displayStream.getVideoTracks()[0], ...this.videoParams
        }

        this.microphoneParams = {
            appData: {
                name: "mic"
            }, track: stream.deviceStream.getAudioTracks()[0], ...this.microphoneParams
        }

        this.cameraParams = {
            appData: {
                name: "cam"
            }, track: stream.deviceStream.getVideoTracks()[0], ...this.cameraParams
        }

        this.connectToRoom()
    }

    connectToRoom() {
        this.socket.getSocket().emit('joinRoom', { roomId: this.roomId, socketId: this.socket.id, token: this.socket.getAuthToken() }, (data) => {
            this.rtpCapabilities = data.rtpCapabilities

            this.createDevice()
        })
    }

    async createDevice() {
        try {
            this.device = new mediasoupClient.Device()

            await this.device.load({
                routerRtpCapabilities: this.rtpCapabilities
            })

            this.createSendTransport()

        } catch (error) {
            console.error(error)
        }
    }

    createSendTransport() {
        this.socket.getSocket().emit('createWebRtcTransport', { consumer: false }, ({
            params
        }) => {
            if (params.error) {
                console.log(params.error)
                return
            }

            console.log(params)

            this.producerTransport = this.device.createSendTransport(params)

            this.producerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                try {
                    await this.socket.getSocket().emit('transport-connect', {
                        dtlsParameters,
                    })

                    callback()

                } catch (error) {
                    errback(error)
                }
            })

            this.producerTransport.on('produce', async (parameters, callback, errback) => {
                console.log('parameters', parameters)

                try {
                    await this.socket.getSocket().emit('transport-produce', {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: { ...parameters.appData, socketId: this.socket.getSocket().id, token: this.socket.getAuthToken() },
                    }, ({ id, producersExist }) => {
                        callback({ id })

                        //if(producersExist) this.getProducers()
                    })
                } catch (error) {
                    errback(error)
                }
            })

            this.connectSendTransport()
        })
    }

    async connectSendTransport() {

        this.audioProducer = await this.producerTransport.produce(this.audioParams)
        this.videoProducer = await this.producerTransport.produce(this.videoParams)
        this.cameraProducer = await this.producerTransport.produce(this.cameraParams)
        this.microphoneProducer = await this.producerTransport.produce(this.microphoneParams)
        

        this.audioProducer.on('trackended', async () => {
            console.log('audio track ended')

            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "SCREEN_AUDIO_MUTED"})
        })

        this.audioProducer.on('transportclose', () => {
            console.log('audio transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close audio track
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "LOST_CONNECTION" })
        })

        this.videoProducer.on('trackended', () => {
            console.log('video track ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close video track
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "SCREEN_VIDEO_LOST" })
        })

        this.videoProducer.on('transportclose', () => {
            console.log('video transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close audio track
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "LOST_CONNECTION" })
        })

        this.cameraProducer.on('trackended', () => {
            console.log('camera track ended')
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "CAMERA_FEED_LOST" })

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false            // close camera track
        })

        this.cameraProducer.on('transportclose', () => {
            console.log('camera transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close audio track
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "LOST_CONNECTION" })
        })

        this.microphoneProducer.on('trackended', () => {
            console.log('microphone track ended')
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "CAMERA_AUDIO_MUTED" })
            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close microphone track
        })

        this.microphoneProducer.on('transportclose', () => {
            console.log('microphone transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            // this.connectedToRoom = false
            // close audio track
            this.localMessageHandler.sendMessageToSocket("LOG_MESSAGE", { flagKey: "LOST_CONNECTION" })
        })

    }

    async captureScreen() {
        if (!this.videoParams?.track) {
            console.error('No video track available');
            return;
        }

        const stream = new MediaStream([this.videoParams.track]);

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const blob = await canvas.convertToBlob({ type: 'image/png' });

        video.srcObject = null;

        return blob
    }
}
