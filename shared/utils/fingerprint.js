// Device fingerprinting utility (HTTP-safe version)
window.DeviceFingerprint = {
    generate() {
        const components = [];

        // Screen resolution
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

        // Timezone
        try {
            components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        } catch (e) {
            components.push('tz-unknown');
        }

        // Language
        components.push(navigator.language || 'unknown');

        // Platform
        components.push(navigator.platform || 'unknown');

        // User agent
        components.push(navigator.userAgent);

        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('fingerprint', 2, 2);
            components.push(canvas.toDataURL().substring(0, 100));
        } catch (e) {
            components.push('canvas-error');
        }

        // WebGL fingerprint
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {
            components.push('webgl-error');
        }

        // Simple hash (works in HTTP and HTTPS)
        const fingerprint = this.simpleHash(components.join('|||'));
        return fingerprint;
    },

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0') + Date.now().toString(36);
    }
};
