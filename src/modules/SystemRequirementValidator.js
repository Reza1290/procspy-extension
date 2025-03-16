import { Helper } from "./Helper.js"

export class SystemRequirementValidator {
    constructor() {
        this.chromeVersion = this.getChromeVersion()
        this.browserName = this.getBrowserName()
        this.systemMemory = null
        this.systemCpu = null
    }

    getBrowserName() {
        const userAgent = navigator.userAgent
        if (userAgent.includes("Chrome")) return "Chrome"
        if (userAgent.includes("Firefox")) return "Firefox"
        if (userAgent.includes("Safari")) return "Safari"
        return "Unknown"
    }

    getChromeVersion() {
        const match = navigator.userAgent.match(/Chrome\/(\d+)/)
        return match ? parseInt(match[1]) : null
    }

    async getSystemMemory() {
        if (chrome.system?.memory) {
            this.systemMemory = await chrome.system.memory.getInfo()
        } else {
            console.warn("chrome.system.memory API is not available.")
            this.systemMemory = { capacity: 0 }
        }
    }

    async getSystemCpu() {
        if (chrome.system?.cpu) {
            this.systemCpu = await chrome.system.cpu.getInfo()
        } else {
            console.warn("chrome.system.cpu API is not available.")
            this.systemCpu = { features: [], modelName: "Unknown" } 
        }
    }

    getDeviceRamCapacity() {
        return this.systemMemory ? Helper.formatBytes(this.systemMemory.capacity) : "Unknown"
    }

    getCpuCapabilities() {
        return this.systemCpu ? this.systemCpu.features : []
    }

    getCpuModelName() {
        return this.systemCpu ? this.systemCpu.modelName : "Unknown"
    }

    async checkAllRequirements() {
        await this.getSystemMemory()
        await this.getSystemCpu()

        const minRam = 4 * 1024 * 1024 * 1024 
        const requiredCpuFeatures = ["sse4_1", "sse4_2", "avx"] 
        const minChromeVersion = 130 

        const isRamSufficient = this.systemMemory.capacity >= minRam
        const hasRequiredCpuFeature = requiredCpuFeatures.some(feature => this.systemCpu.features.includes(feature))
        const isChromeVersionValid = this.chromeVersion !== null && this.chromeVersion > minChromeVersion
        const isUsingChrome = this.browserName === "Chrome"

        return {
            ram: isRamSufficient,
            cpu: hasRequiredCpuFeature,
            chromeVersion: isChromeVersionValid,
            browser: isUsingChrome,
            allPassed: isRamSufficient && hasRequiredCpuFeature && isChromeVersionValid && isUsingChrome,
        }
    }
}
