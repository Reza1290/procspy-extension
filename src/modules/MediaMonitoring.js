import * as mediasoupClient from 'mediasoup-client'
import { io } from 'socket.io-client'

export class MediaMonitoring {


    constructor(socketUrl, roomCode) {
        this.socket = new io(socketUrl)
        this.roomCode = roomCode
        this.socketConnected = false

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
        try {
            let mediaStream = {}

            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true
            })

            const videoTrack = stream.getVideoTracks()[0]
            const audioTrack = stream.getAudioTracks()
            const videoSetting = videoTrack.getSettings()

            if (videoSetting.displaySurface !== 'monitor') {
                console.warn("Please have Full Screen or Monitor Shared")
                alert("Please have Full Screen or Monitor Shared")
                return;
            }

            if (audioTrack.length === 0) {
                console.warn("Please share your Audio")
                alert("Please share your Audio")
                return;
            }


            const deviceStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            })

            const cameraTrack = deviceStream.getVideoTracks()
            const microphoneTrack = deviceStream.getAudioTracks()

            if (cameraTrack.length === 0 || microphoneTrack.length === 0) {
                console.log("Please put your Device On")
                alert("Please Put your Device on")
                return;
            }

            mediaStream = {
                displayStream: stream,
                deviceStream: deviceStream
            }

            this.shareStream(mediaStream)

        }
        catch (error) {
            console.log(error)
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
        this.socket.emit('joinRoom', { roomCode: this.roomCode, isAdmin: false, socketId: this.socket.id }, (data) => {
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
                        appData: {...parameters.appData, socketId : this.socket.id},
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

        this.audioProducer.on('trackended', () => {
            console.log('audio track ended')

            // close audio track
        })

        this.audioProducer.on('transportclose', () => {
            console.log('audio transport ended')

            // close audio track
        })

        this.videoProducer.on('trackended', () => {
            console.log('video track ended')

            // close video track
        })

        this.videoProducer.on('transportclose', () => {
            console.log('video transport ended')

            // close audio track
        })

        this.cameraProducer.on('trackended', () => {
            console.log('camera track ended')

            // close camera track
        })

        this.cameraProducer.on('transportclose', () => {
            console.log('camera transport ended')

            // close audio track
        })

        this.microphoneProducer.on('trackended', () => {
            console.log('microphone track ended')

            // close microphone track
        })

        this.microphoneProducer.on('transportclose', () => {
            console.log('microphone transport ended')

            // close audio track
        })
    }

    getSocketConnected() {
        return this.socketConnected
    }

    sendMessage(type = 'default-messsage', message) {
        this.socket.emit(type, { message: message }, (data) => {
            console.log(data)
        })
    }
}

