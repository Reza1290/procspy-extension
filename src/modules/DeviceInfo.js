export class DeviceInfo {
    constructor() {
        this.deviceInfo = {
            os: navigator.platform,
            userAgent: navigator.userAgent,
            vendor: navigator.vendor,
            multipleMonitor: false,
            cpu: {},
            memory: {},
            display: [],
            storage: [],
            network: [],
            isVM: false
        };
    }

    async getCPUInfo() {
        return new Promise(resolve => {
            chrome.system.cpu.getInfo(cpuInfo => {
                this.deviceInfo.cpu = {
                    model: cpuInfo.modelName,
                    arch: cpuInfo.archName,
                    numOfProcessors: cpuInfo.numOfProcessors
                };
                resolve();
            });
        });
    }

    async getMemoryInfo() {
        return new Promise(resolve => {
            chrome.system.memory.getInfo(memoryInfo => {
                this.deviceInfo.memory = {
                    availableCapacity: (memoryInfo.availableCapacity / (1024 * 1024 * 1024)).toFixed(2) + " GB",
                    capacity: (memoryInfo.capacity / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                };
                resolve();
            });
        });
    }

    async getDisplayInfo() {
        return new Promise(resolve => {
            chrome.system.display.getInfo(displays => {
                this.deviceInfo.display = displays.map(display => ({
                    name: display.name,
                    width: display.bounds.width,
                    height: display.bounds.height,
                    isPrimary: display.isPrimary
                }));
                this.deviceInfo.multipleMonitor = displays.length > 1;
                resolve();
            });
        });
    }

    async getStorageInfo() {
        return new Promise(resolve => {
            chrome.system.storage.getInfo(storageInfo => {
                this.deviceInfo.storage = storageInfo.map(disk => ({
                    id: disk.id,
                    type: disk.type,
                    capacity: (disk.capacity / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                }));
                resolve();
            });
        });
    }

    async getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.deviceInfo.network = {
            type: connection ? connection.effectiveType : "Unknown",
            downlink: connection ? connection.downlink + " Mbps" : "Unknown",
            rtt: connection ? connection.rtt + " ms" : "Unknown"
        };
    }

    async getAllInfo() {
        await Promise.all([
            this.getCPUInfo(),
            this.getMemoryInfo(),
            this.getDisplayInfo(),
            this.getStorageInfo(),
            this.getNetworkInfo()
        ]);
        return this.deviceInfo;
    }
}

