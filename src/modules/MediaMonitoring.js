import * as mediasoupClient from 'mediasoup-client'
import { io } from 'socket.io-client'

export class MediaMonitoring {


    constructor(socketUrl, roomCode, tabId, token) {
        this.socket = new io(socketUrl)
        this.roomCode = roomCode
        this.socketConnected = false
        this.connectedToRoom = false
        this.tabIdToUpdate = tabId
        this.userToken = token
    }

    async connect() {
        return new Promise((resolve) => {
            this.socket.on('connection-success', ({ socketId }) => {
                console.log(socketId)
                this.socketConnected = true
                resolve(true)
            })
        })
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

            // TODO: IF GAGAL RESTART TO IDENTIFIER
            await chrome.runtime.sendMessage({action: "STOP_PROCTORING"})
        }
    }

    shareStream(stream) {

        console.log(stream)

        this.audioParams = {
            appData: {
                name: "audio"
            }, track: stream.displayStream.getAudioTracks()[0], ...this.audioParams
        }
        this.videoParams = {
            appData: {
                name: "video"
            }, track: stream.displayStream.getVideoTracks()[0], ...this.videoParams
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

        this.connectRoom()
    }

    connectRoom() {
        this.socket.emit('joinRoom', { roomCode: this.roomCode, isAdmin: false, socketId: this.socket.id, token: this.userToken }, (data) => {
            console.log(`Router RTP Capabilites ${data.rtpCapabilities}`)
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
        this.socket.emit('createWebRtcTransport', { consumer: false }, ({
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
                    await this.socket.emit('transport-connect', {
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
                    await this.socket.emit('transport-produce', {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: { ...parameters.appData, socketId: this.socket.id, token: this.userToken },
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
            await chrome.notifications.create("alert-audio", {
                type: "basic",
                iconUrl: "assets/images/icon-16.png",
                title: "System Alert",
                message: "Your Audio Screen is disconnected. Please try to reconnect it!"
            });
            await chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close audio track
        })

        this.audioProducer.on('transportclose', () => {
            console.log('audio transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close audio track
        })

        this.videoProducer.on('trackended', () => {
            console.log('video track ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close video track
        })

        this.videoProducer.on('transportclose', () => {
            console.log('video transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close audio track
        })

        this.cameraProducer.on('trackended', () => {
            console.log('camera track ended')
            this.sendMessage("log-message", {
                flagKey: "VIDEO_FEED_LOST",
                token: this.userToken
            })

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false

            console.log("CALLED")
            // close camera track
        })

        this.cameraProducer.on('transportclose', () => {
            console.log('camera transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close audio track
        })

        this.microphoneProducer.on('trackended', () => {
            console.log('microphone track ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close microphone track
        })

        this.microphoneProducer.on('transportclose', () => {
            console.log('microphone transport ended')

            chrome.runtime.sendMessage({ action: "RESTART_PROCTORING" })
            this.connectedToRoom = false
            // close audio track
        })

        this.connectedToRoom = true;
        if (this.tabIdToUpdate) {
            this.updateTabAfterRoomConnected(this.tabIdToUpdate);
            this.tabIdToUpdate = null; // Clear it after use
        }
    }

    getSocketConnected() {
        return this.socketConnected
    }

    sendMessage(type = 'default-messsage', message) {
        this.socket.emit(type, { message: { ...message,token: this.userToken, roomCode: this.roomCode } }, (data) => {
            console.log(data)
        })
    }

    async getIsConnectedToRoom() {
        return this.connectedToRoom
    }

    async updateTabAfterRoomConnected(tabId) {
        if (this.connectedToRoom && tabId) {
            this.sendMessage("log-message", {
                flagKey: "CONNECT",
            })
            await chrome.tabs.update(tabId, { active: true });
        }
    }
}

