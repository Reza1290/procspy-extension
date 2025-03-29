import { Helper } from "./Helper.js"

export class SystemRequirementValidator {
    constructor() {
        this.chromeVersion = this.getChromeVersion()
        this.browserName = null
        this.systemMemory = null
        this.systemCpu = null
    }


    async getBrowserName() {
        const userAgent = navigator.userAgent
        if (userAgent.includes("Chrome")) {
            this.browserName = "Chrome"
        }
        else if (userAgent.includes("Firefox")) {
            this.browserName = "Firefox"
        }
        else if (userAgent.includes("Safari")) {
            this.browserName = "Safari"
        } else {
            this.browserName = "Unknown"
        }
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

    setDevicesList(device) {
        this.devices = device
    }

    async getInternetSpeed() {
        let fileUrl = "https://media.geeksforgeeks.org/wp-content/cdn-uploads/20200714180638/CIP_Launch-banner.png";

        const startTime = performance.now();
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const fileSize = blob.size;
        const endTime = performance.now();
        const durationInSeconds = (endTime - startTime) / 1000;
        const speedMbps = (fileSize / (1024 * 1024)) / durationInSeconds * 8;

        this.internetSpeed = speedMbps.toFixed(0);
    }

    async checkAllRequirements() {
        const permittableBrowsers = ['Chrome', 'Firefox'];

        await this.getSystemMemory();
        await this.getSystemCpu();
        await this.getInternetSpeed();
        await this.getBrowserName();

        const minRam = 4 * 1024 * 1024 * 1024;
        const requiredCpuFeatures = ["sse4_1", "sse4_2", "avx"];
        const minChromeVersion = 130;
        const minInternetSpeed = 10;

        const isDeviceCamAvailable = this.devices?.cam !== null;
        const isDeviceMicAvailable = this.devices?.mic !== null;
        const isRamSufficient = this.systemMemory.capacity >= minRam;
        const hasRequiredCpuFeature = requiredCpuFeatures.every(feature => this.systemCpu.features.includes(feature));
        const isChromeVersionValid = this.chromeVersion !== null && this.chromeVersion > minChromeVersion;
        const isInternetSpeedSufficient = this.internetSpeed >= minInternetSpeed;
        const isBrowserPermittable = permittableBrowsers.includes(this.browserName);

        const data = [
            {
                type: 'camera_validation',
                validate: isDeviceCamAvailable,
                message: this.devices?.cam || null,
                error: isDeviceCamAvailable ? null : "Camera not available"
            },
            {
                type: 'microphone_validation',
                validate: isDeviceMicAvailable,
                message: this.devices?.mic || null,
                error: isDeviceMicAvailable ? null : "Microphone not available"
            },
            {
                type: 'ram_size_validation',
                validate: isRamSufficient,
                message: `${(this.systemMemory.capacity / (1024 * 1024 * 1024)).toFixed(2)} GB`,
                error: isRamSufficient ? null : "Insufficient RAM"
            },
            {
                type: 'chrome_version_validation',
                validate: isChromeVersionValid,
                message: `Chrome v${this.chromeVersion}`,
                error: isChromeVersionValid ? null : "Chrome version too low"
            },
            {
                type: 'cpu_validation',
                validate: hasRequiredCpuFeature,
                message: this.systemCpu.features.join(', '),
                error: hasRequiredCpuFeature ? null : "Required CPU features missing"
            },
            {
                type: 'internet_speed_validation',
                validate: isInternetSpeedSufficient,
                message: `${this.internetSpeed} Mbps`,
                error: isInternetSpeedSufficient ? null : `Internet speed only ${this.internetSpeed} Mbps`
            },
            {
                type: 'permittable_browser_validation',
                validate: isBrowserPermittable,
                message: this.browserName,
                error: isBrowserPermittable ? null : "Browser not supported"
            }
        ];

        return {
            data,
            allPassed: data.every(item => item.validate)
        };
    }

}
