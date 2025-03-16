class VMDetector {
    constructor() {
        this.canvas = document.createElement("canvas")
        this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl")
    }

    getWebGLInfo() {
        if (!this.gl) return { vendor: "Unknown", renderer: "Unknown", maxTextureSize: 0 }

        let debugInfo = this.gl.getExtension("WEBGL_debug_renderer_info")
        let vendor = debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown"
        let renderer = debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown"
        let maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)

        return { vendor, renderer, maxTextureSize }
    }

    detectVM() {
        let { vendor, renderer, maxTextureSize } = this.getWebGLInfo()

        console.log(`Vendor: ${vendor}, Renderer: ${renderer}, Max Texture Size: ${maxTextureSize}`)

        let vmRenderers = ["Microsoft Basic Render Driver", "Parallels", "VMware", "VirtualBox", "llvmpipe"]

        if (vmRenderers.some(vm => renderer.toLowerCase().includes(vm.toLowerCase())) || maxTextureSize <= 4096) {
            return "VM Detected"
        }
        return "Physical Machine"
    }
}

// const vmChecker = new VMDetector()
// console.log("VM Detection Result:", vmChecker.detectVM())
