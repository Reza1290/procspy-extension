export class DeviceInfo {
    constructor() {
        this.deviceInfo = {
            operatingSystem: navigator.platform,
            userAgent: navigator.userAgent,
            cpuModel: '',
            cpuNumOfProcessors: 0,
            cpuArch: '',
            browser: '',
            browserVersion: '',
            gpu: '',
            ramSize: '',
            storages: [],
            displays: [],
            primaryDisplay: '',
            deviceId: '',
            isVM: false
        };
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        const match = ua.match(/(firefox|msie|chrome|safari|edg|opera)[\/\s]?([\d.]+)/i) || [];
        this.deviceInfo.browser = match[1] || 'Unknown';
        this.deviceInfo.browserVersion = match[2] || 'Unknown';
    }

    getDeviceId() {
        chrome.instanceID.getID(
            (e) => {
                this.deviceInfo.deviceId = e
            }
        )
    }

    async getGPUInfo() {
        let vendor = 'Unknown';
        let renderer = 'Unknown';
        let response;

        if (navigator.gpu) {
            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    vendor = adapter.vendor || vendor;
                    renderer = adapter.name || renderer;
                }
            } catch (e) {
                console.warn('WebGPU failed:', e);
            }
        }

        if (vendor === 'Unknown' && renderer === 'Unknown') {
            response = await this.sendMessageToTab({ action: "GPU_INFO" });
            vendor = response.vendor || vendor;
            renderer = response.renderer || renderer;
        }

        this.deviceInfo.gpu = `${vendor} ${renderer}`.trim();

        const vmIndicators = ['virtualbox', 'vmware', 'qemu', 'vbox', 'parallels', 'xen', 'microsoft basic render'];
        const isRendererVM = vmIndicators.some(kw =>
            vendor.toLowerCase().includes(kw) || renderer.toLowerCase().includes(kw)
        );

        const memoryGB = parseFloat(this.deviceInfo.ramSize) || 0;
        this.deviceInfo.isVM = isRendererVM || this.deviceInfo.cpuNumOfProcessors <= 2 || memoryGB <= 2;
    }

    sendMessageToTab(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(response);
            });
        });
    }

    async getCPUInfo() {
        return new Promise((resolve) => {
            chrome.system.cpu.getInfo(cpu => {
                this.deviceInfo.cpuModel = cpu.modelName;
                this.deviceInfo.cpuArch = cpu.archName;
                this.deviceInfo.cpuNumOfProcessors = cpu.numOfProcessors
                resolve();
            });
        });
    }

    async getMemoryInfo() {
        return new Promise((resolve) => {
            chrome.system.memory.getInfo(memory => {
                this.deviceInfo.ramSize = (memory.capacity / (1024 ** 3)).toFixed(2) + " GB";
                resolve();
            });
        });
    }

    async getDisplayInfo() {
        return new Promise((resolve) => {
            chrome.system.display.getInfo(displays => {
                this.deviceInfo.displays = displays.map(d => ({
                    name: d.name,
                    width: String(d.bounds.width),
                    height: String(d.bounds.height),
                    isPrimary: d.isPrimary
                }));
                const primary = displays.find(d => d.isPrimary);
                this.deviceInfo.primaryDisplay = primary ? `${primary.bounds.width}x${primary.bounds.height}` : 'Unknown';
                resolve();
            });
        });
    }

    async getStorageInfo() {
        return new Promise((resolve) => {
            chrome.system.storage.getInfo(storages => {
                this.deviceInfo.storages = storages.map(s => ({
                    id: s.id,
                    type: s.type,
                    capacity: (s.capacity / (1024 ** 3)).toFixed(2) + " GB"
                }));
                resolve();
            });
        });
    }


    async getAllInfo() {
        this.getBrowserInfo();
        this.getDeviceId()

        await Promise.all([
            this.getCPUInfo(),
            this.getGPUInfo(),
            this.getMemoryInfo(),
            this.getDisplayInfo(),
            this.getStorageInfo(),
        ]);

        return this.deviceInfo;
    }
}
