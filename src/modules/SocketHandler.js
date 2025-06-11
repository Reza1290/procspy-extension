import { io, Socket } from 'socket.io-client'
import { DeviceInfo } from './DeviceInfo.js'

export class SocketHandler {
    constructor(socketUrl, authToken) {
        this.socketUrl = socketUrl
        this.authToken = authToken
        this.socket = this._createSocket()
        this._isConnected = false
        this.socketId = null
    }

    _createSocket() {
        return io(this.socketUrl, {
            autoConnect: false,
            auth: {
                token: this.authToken,
                userAgent: (new DeviceInfo()).getBrowserInfo()
            }
        })
    }

    async connectToSocket() {
        this.socket.auth.deviceId = await DeviceInfo.getStaticDeviceId()
        
        this.socket.connect()
        this.socket.on("disconnect", (reason) => {
            if(reason.startsWith("transport close")){
                chrome.runtime.sendMessage({action: "ABORT_PROCTORING"})
            }
        });
        return new Promise((resolve, reject) => {
            this.socket.on('connection-success', ({ socketId }) => {
                this._isConnected = true
                resolve(true)
            })

            this.socket.once("connect_error", (err) => {
                reject(new Error(`Socket connection failed: Who Are You?`));
            });
        })
    }

    async disconnectFromSocket() {
        this.socket.emit("sessionEnd")
        setTimeout(()=>{
            if (this._isConnected) {
                this.socket.disconnect()
            }
        },2000)
    }

    recreateSocket() {
        if (this.socket.connected) {
            this.socket.disconnect()
        }
        this.socket = this._createSocket()
    }

    getSocket() {
        return this.socket
    }

    getRTT() {
        return new Promise((resolve) => {
            const start = Date.now();
            this.socket.emit("EXTENSION_PING", ({ip}) => {
                const rtt = Date.now() - start;
                resolve({ip: ip.split("::ffff:")[1], rtt});
            });
        });
    }
    

    setSocketUrl(socketUrl) {
        this.socketUrl = socketUrl
    }

    setAuthToken(authToken) {
        this.authToken = authToken
        this.socket.auth = authToken
    }

    getAuthToken() {
        return this.authToken
    }
}
