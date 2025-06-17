


export class MessageHandler {
    constructor(socketHandler, roomId = '') {
        this.socket = socketHandler
        this.roomId = roomId
    }

    async sendMessageToSocket(action, payload) {
        return new Promise((resolve, reject) => {
            this.socket.getSocket().emit('EXTENSION_SERVER_MESSAGE', {
                data: {
                    action, 
                    ...payload,
                    token: this.socket.getAuthToken(),
                    roomId: this.roomId
                }
            }, (data) => {
                if (data.success) {
                    resolve(data);
                } else {
                    reject(new Error('Failed to send message'));
                }
            });
        });
    }

    async messageListener(callback){
        this.socket.getSocket().on("SERVER_EXTENSION_MESSAGE", (data) => {
            callback(data)
        })
    }
}