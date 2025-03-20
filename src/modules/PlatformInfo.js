
const listKnownQuizPlatform = ["quizizz.com"];

export class PlatformInfo {
    constructor() {
        this.platform = undefined;
        this.platformUrl = undefined;
        this.specifiedPlatform = undefined;
        this.cookies = undefined
        chrome.tabs.onUpdated.addListener(() => {
            this.checkSpecifiedPlatform()
        });
        // chrome.tabs.onActivated.addListener(() => this.checkSpecifiedPlatform());
    }

    async checkPlatform() {
        chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
            if (!tab.url) return
            // const url = new URL(tab.url)
            // console.log('test')c
            const windows = await chrome.windows.getCurrent({ populate: true })
            const windowId = windows.id
            // console.log(windowId)
            const activeTab = windows.tabs.find((e) => e.active == true)
            console.log(activeTab)
            
            this.platform = activeTab.url
            this.platformUrl = activeTab.url
            return activeTab.url
        });
    }

    isValidPlatform() {
        return listKnownQuizPlatform.includes(this.platform);
    }

    getPlatform() {
        return this.platform;
    }

    setSpecifiedPlatform(platform) {
        this.specifiedPlatform = platform;
    }

    async checkSpecifiedPlatform() {
        // const a = await this.checkPlatform();
        // console.log(a)
        if (this.platform === this.specifiedPlatform) {
            console.log("User-specified platform is active:", this.platform);
        }
    }

    setPlatformCookies() {
        chrome.cookies.getAll({ domain: this.specifiedPlatform }, function(cookies) {
            console.log("Quizizz Cookies:", cookies);
            this.cookies = cookies
        });

    }

    getPlatformCookies(){
        return this.cookies
    }
    
}
