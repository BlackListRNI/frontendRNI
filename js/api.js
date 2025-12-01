// Módulo de API
const API = {
  get baseURL() {
    // Usar URL configurada o detectar automáticamente
    if (window.CONFIG?.SIGNAL_SERVER && window.CONFIG.SIGNAL_SERVER !== 'https://tu-app.koyeb.app') {
      return window.CONFIG.SIGNAL_SERVER;
    }
    // Fallback: si estamos en localhost, usar localhost:3050
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3050';
    }
    // Si no hay config, asumir mismo dominio (para desarrollo)
    return '';
  },

  async request(endpoint, options = {}) {
    const defaultOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
        error.status = response.status; // Incluir código de estado HTTP
        error.timeRemaining = errorData.timeRemaining; // Para rate limiting
        throw error;
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return { 
        success: false, 
        error: error.message || 'Error de conexión con el servidor',
        status: error.status,
        timeRemaining: error.timeRemaining
      };
    }
  },

  async sync(country, clientData, timestamp) {
    const result = await this.request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        country,
        clientData,
        timestamp
      })
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },

  async submitRecord(country, record) {
    const identity = await Fingerprint.getUserIdentity();
    
    const result = await this.request('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        country,
        record,
        fingerprint: identity.fingerprint,
        ip: identity.ip
      })
    });

    if (result.success) {
      return result.data;
    } else {
      const error = new Error(result.error);
      error.status = result.status;
      error.timeRemaining = result.timeRemaining;
      throw error;
    }
  },

  async getThread(country, recordId) {
    const result = await this.request('/api/thread', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId
      })
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },

  async submitComment(country, recordId, comment, proofs, userId) {
    const identity = await Fingerprint.getUserIdentity();
    
    const result = await this.request('/api/thread', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        comment,
        proofs,
        userId,
        fingerprint: identity.fingerprint,
        ip: identity.ip
      })
    });

    if (result.success) {
      return result.data;
    } else {
      const error = new Error(result.error);
      error.status = result.status;
      error.timeRemaining = result.timeRemaining;
      throw error;
    }
  },

  async vote(country, recordId, voteType, userId) {
    const identity = await Fingerprint.getUserIdentity();
    
    const result = await this.request('/api/vote', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        voteType,
        userId,
        fingerprint: identity.fingerprint,
        ip: identity.ip
      })
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },

  async submitFieldProposal(country, recordId, fieldName, newValue, userId) {
    const result = await this.request('/api/field-proposal', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        fieldName,
        newValue,
        userId
      })
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  },

  async voteFieldProposal(country, recordId, fieldName, proposalValue, userId) {
    const result = await this.request('/api/field-vote', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        fieldName,
        proposalValue,
        userId
      })
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  }
};

// Hacer disponible globalmente
window.API = API;
