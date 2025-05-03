import { io, Socket } from 'socket.io-client'

export class SocketHandler {
    constructor(socketUrl, authToken) {
        this.socketUrl = socketUrl
        this.authToken = authToken
        this.socket = this._createSocket()
        this._isConnected = false
        this.socketId = null
    }

    _createSocket() {
        console.log("Create Socket Handler")
        return io(this.socketUrl, {
            autoConnect: false,
            // auth: {
            //     token: this.authToken
            // }
        })
    }

    async connectToSocket() {
        console.log("Connect")
        this.socket.connect()
        return new Promise((resolve) => {
            this.socket.on('connection-success', ({ socketId }) => {
                console.log(socketId)
                this._isConnected = true
                resolve(true)
            })
        })
    }

    async disconnectFromSocket() {
        if (this._isConnected) {
            this.socket.disconnect()
        }
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
            this.socket.emit("EXTENSION_PING", () => {
                const rtt = Date.now() - start;
                console.log(rtt)
                resolve(rtt);
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
