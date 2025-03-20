


export class UserInfo {
    constructor(platformCookies, platformUrl){
        this.platformCookies = platformCookies
        this.platformUrl = platformUrl
    }

    async fetchUser(body){
        const data = await fetch(this.platformUrl,{
            
        }) 
    }
}