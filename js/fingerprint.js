// Sistema de fingerprinting y validación de usuario
const Fingerprint = {
  async generate() {
    const components = [];
    
    // User Agent
    components.push(navigator.userAgent);
    
    // Idioma
    components.push(navigator.language);
    
    // Zona horaria
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Resolución de pantalla
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    
    // Plataforma
    components.push(navigator.platform);
    
    // Hardware concurrency
    components.push(navigator.hardwareConcurrency || 'unknown');
    
    // Device memory
    components.push(navigator.deviceMemory || 'unknown');
    
    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f8b4d9';
    ctx.fillRect(0, 0, 100, 50);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('RNI Fingerprint', 2, 2);
    components.push(canvas.toDataURL());
    
    // WebGL fingerprint
    try {
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
    
    // Plugins
    const plugins = Array.from(navigator.plugins || [])
      .map(p => p.name)
      .join(',');
    components.push(plugins);
    
    // Generar hash
    const fingerprint = await this.hashString(components.join('|||'));
    return fingerprint;
  },

  async hashString(str) {
    // Verificar si crypto.subtle está disponible (solo en HTTPS o localhost)
    if (crypto && crypto.subtle && crypto.subtle.digest) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback: usar un hash simple si crypto.subtle no está disponible
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    }
  },

  async getOrCreateFingerprint() {
    let fingerprint = localStorage.getItem('device_fingerprint');
    
    if (!fingerprint) {
      fingerprint = await this.generate();
      localStorage.setItem('device_fingerprint', fingerprint);
    }
    
    return fingerprint;
  },

  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      return null;
    }
  },

  async getUserIdentity() {
    const fingerprint = await this.getOrCreateFingerprint();
    const ip = await this.getIPAddress();
    
    return {
      fingerprint,
      ip,
      userId: Utils.getUserId(),
      timestamp: Date.now()
    };
  },

  // Verificar si el usuario está intentando manipular el sistema
  async checkForManipulation(action, recordId) {
    const identity = await this.getUserIdentity();
    const key = `action_log_${action}_${recordId}`;
    const log = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Verificar si ya realizó esta acción
    const existingAction = log.find(entry => 
      entry.fingerprint === identity.fingerprint || 
      entry.ip === identity.ip
    );
    
    if (existingAction) {
      const timeSinceLastAction = Date.now() - existingAction.timestamp;
      
      // Si intentó hacer la misma acción en menos de 1 hora
      if (timeSinceLastAction < 3600000) {
        return {
          allowed: false,
          reason: 'Ya realizaste esta acción recientemente'
        };
      }
    }
    
    // Registrar la acción
    log.push(identity);
    
    // Mantener solo los últimos 100 registros
    if (log.length > 100) {
      log.shift();
    }
    
    localStorage.setItem(key, JSON.stringify(log));
    
    return {
      allowed: true,
      identity
    };
  },

  // Limpiar logs antiguos (más de 7 días)
  cleanOldLogs() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith('action_log_')) {
        try {
          const log = JSON.parse(localStorage.getItem(key) || '[]');
          const filteredLog = log.filter(entry => entry.timestamp > sevenDaysAgo);
          
          if (filteredLog.length === 0) {
            localStorage.removeItem(key);
          } else if (filteredLog.length !== log.length) {
            localStorage.setItem(key, JSON.stringify(filteredLog));
          }
        } catch (e) {
          console.error('Error cleaning log:', e);
        }
      }
    }
  }
};

// Limpiar logs al cargar
Fingerprint.cleanOldLogs();

window.Fingerprint = Fingerprint;
