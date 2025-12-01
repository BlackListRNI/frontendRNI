// Utilidades generales
const Utils = {
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  generateUserId() {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', id);
    return id;
  },

  getUserId() {
    return localStorage.getItem('userId') || this.generateUserId();
  },

  getStorageKey(country) {
    return `rni_${country}`;
  },

  getLocalData(country) {
    const key = this.getStorageKey(country);
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      return { records: [], threads: {}, lastUpdate: 0 };
    } catch (e) {
      console.error('Error parsing local data:', e);
      return { records: [], threads: {}, lastUpdate: 0 };
    }
  },

  // Versión async para cuando se necesite IndexedDB
  async getLocalDataAsync(country) {
    const key = this.getStorageKey(country);

    // Intentar cargar de localStorage primero
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error parsing local data:', e);
    }

    // Si no está en localStorage, intentar IndexedDB
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        const idbData = await IndexedDBStorage.loadData(country);
        if (idbData && idbData.records) {
          console.log('✅ Datos cargados desde IndexedDB');
          return idbData;
        }
      } catch (e) {
        console.error('Error loading from IndexedDB:', e);
      }
    }

    return { records: [], threads: {}, lastUpdate: 0 };
  },

  saveLocalData(country, data) {
    const key = this.getStorageKey(country);
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('⚠️ localStorage lleno, intentando IndexedDB...', e);

      // Si localStorage está lleno, intentar IndexedDB de forma async
      if (typeof IndexedDBStorage !== 'undefined') {
        IndexedDBStorage.saveData(country, data)
          .then(() => {
            console.log('✅ Datos guardados en IndexedDB');
            if (typeof UI !== 'undefined') {
              UI.showToast('Datos guardados en almacenamiento extendido', 'info');
            }
          })
          .catch(err => {
            console.error('Error guardando en IndexedDB:', err);
          });
        return true;
      } else {
        console.error('IndexedDB no disponible');
        if (typeof UI !== 'undefined') {
          UI.showToast('Error: Almacenamiento lleno', 'error');
        }
        return false;
      }
    }
  },

  // Detectar país por idioma del navegador (sin permiso, instantáneo)
  detectCountryByLanguage() {
    const language = navigator.language || navigator.userLanguage;
    const languageMap = {
      'es-PE': 'PE', 'es-MX': 'MX', 'es-CO': 'CO', 'es-AR': 'AR',
      'es-CL': 'CL', 'es-ES': 'ES', 'es-VE': 'VE', 'es-EC': 'EC',
      'es-BO': 'BO', 'es-PY': 'PY', 'es-UY': 'UY', 'es-CR': 'CR',
      'es-PA': 'PA', 'es-GT': 'GT', 'es-HN': 'HN', 'es-SV': 'SV',
      'es-NI': 'NI', 'es-DO': 'DO', 'es-CU': 'CU', 'es-PR': 'PR'
    };
    return languageMap[language] || null;
  },

  // Detectar país por timezone (sin permiso, instantáneo)
  detectCountryByTimezone() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneMap = {
        'America/Lima': 'PE',
        'America/Mexico_City': 'MX',
        'America/Bogota': 'CO',
        'America/Argentina/Buenos_Aires': 'AR',
        'America/Santiago': 'CL',
        'Europe/Madrid': 'ES',
        'America/Caracas': 'VE',
        'America/Guayaquil': 'EC',
        'America/La_Paz': 'BO',
        'America/Asuncion': 'PY',
        'America/Montevideo': 'UY',
        'America/Costa_Rica': 'CR',
        'America/Panama': 'PA',
        'America/Guatemala': 'GT',
        'America/Tegucigalpa': 'HN',
        'America/El_Salvador': 'SV',
        'America/Managua': 'NI',
        'America/Santo_Domingo': 'DO',
        'America/Havana': 'CU',
        'America/Puerto_Rico': 'PR'
      };
      return timezoneMap[timezone] || null;
    } catch (error) {
      return null;
    }
  },

  // Convertir coordenadas GPS a país (SIN APIs, solo matemáticas)
  coordsToCountry(lat, lon) {
    const countries = {
      'PE': { latMin: -18.5, latMax: -0.5, lonMin: -81.5, lonMax: -68.5 },
      'MX': { latMin: 14.5, latMax: 32.5, lonMin: -118, lonMax: -86 },
      'CO': { latMin: -4.5, latMax: 13, lonMin: -79, lonMax: -66 },
      'AR': { latMin: -55, latMax: -21.5, lonMin: -73.5, lonMax: -53 },
      'CL': { latMin: -56, latMax: -17, lonMin: -76, lonMax: -66 },
      'ES': { latMin: 36, latMax: 43.5, lonMin: -9.5, lonMax: 3.5 },
      'VE': { latMin: 0.5, latMax: 12.5, lonMin: -73.5, lonMax: -59.5 },
      'EC': { latMin: -5, latMax: 1.5, lonMin: -81, lonMax: -75 },
      'BO': { latMin: -23, latMax: -9.5, lonMin: -69.5, lonMax: -57.5 },
      'PY': { latMin: -27.5, latMax: -19.5, lonMin: -62.5, lonMax: -54.5 },
      'UY': { latMin: -35, latMax: -30, lonMin: -58.5, lonMax: -53 },
      'CR': { latMin: 8, latMax: 11, lonMin: -86, lonMax: -82.5 },
      'PA': { latMin: 7, latMax: 9.5, lonMin: -83, lonMax: -77 },
      'GT': { latMin: 13.5, latMax: 17.5, lonMin: -92.5, lonMax: -88 },
      'HN': { latMin: 13, latMax: 16, lonMin: -89.5, lonMax: -83 },
      'SV': { latMin: 13, latMax: 14.5, lonMin: -90.5, lonMax: -87.5 },
      'NI': { latMin: 10.5, latMax: 15, lonMin: -88, lonMax: -83 },
      'DO': { latMin: 17.5, latMax: 20, lonMin: -72, lonMax: -68.5 },
      'CU': { latMin: 19.5, latMax: 23.5, lonMin: -85, lonMax: -74 },
      'PR': { latMin: 17.5, latMax: 18.5, lonMin: -67.5, lonMax: -65.5 }
    };

    for (const [code, bounds] of Object.entries(countries)) {
      if (lat >= bounds.latMin && lat <= bounds.latMax &&
        lon >= bounds.lonMin && lon <= bounds.lonMax) {
        return code;
      }
    }
    return null;
  },

  // Detectar país por Geolocation API (SIN APIs externas, solo GPS del navegador)
  async detectCountryByGeolocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      console.log('📍 Solicitando permiso de ubicación GPS...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`📍 GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);

          // Convertir coordenadas a país SIN APIs (solo matemáticas)
          const country = this.coordsToCountry(latitude, longitude);

          if (country) {
            console.log(`✅ País por GPS: ${country}`);
            // Guardar para detección de multicuentas
            localStorage.setItem('user_coords', JSON.stringify({
              lat: latitude,
              lon: longitude,
              timestamp: Date.now()
            }));
          }

          resolve(country);
        },
        (error) => {
          console.log('❌ Sin permiso GPS:', error.message);
          resolve(null);
        },
        {
          timeout: 10000,
          maximumAge: 3600000, // Cache 1 hora
          enableHighAccuracy: false // Más rápido
        }
      );
    });
  },

  async detectCountryByIP() {
    console.log('🌍 Detectando país...');

    // MÉTODO 1: Por idioma del navegador (instantáneo, sin permiso)
    const langCountry = this.detectCountryByLanguage();
    if (langCountry) {
      console.log(`✅ País detectado por idioma: ${langCountry}`);
      return langCountry;
    }

    // MÉTODO 2: Por timezone (instantáneo, sin permiso)
    const tzCountry = this.detectCountryByTimezone();
    if (tzCountry) {
      console.log(`✅ País detectado por timezone: ${tzCountry}`);
      return tzCountry;
    }

    // MÉTODO 3: Por Geolocation API (requiere permiso, muy preciso)
    const geoCountry = await this.detectCountryByGeolocation();
    if (geoCountry) {
      return geoCountry;
    }

    // MÉTODO 4: Usar nuestro servidor como proxy (puede tener rate limit)
    try {
      const response = await fetch('/api/geolocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.countryCode) {
          console.log(`🌍 País detectado: ${data.countryCode} (${data.country})`);
          return data.countryCode;
        }
      }
    } catch (error) {
      console.error('Error con geolocalización del servidor:', error);
    }

    // Fallback: Servicios externos (pueden fallar por CORS)
    const services = [
      {
        name: 'ipapi.co',
        url: 'https://ipapi.co/json/',
        parse: (data) => data.country_code
      },
      {
        name: 'ip-api.com',
        url: 'http://ip-api.com/json/?fields=status,countryCode',
        parse: (data) => data.countryCode
      },
      {
        name: 'freeipapi.com',
        url: 'https://freeipapi.com/api/json',
        parse: (data) => data.countryCode
      },
      {
        name: 'ipwho.is',
        url: 'https://ipwho.is/',
        parse: (data) => data.country_code
      }
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(service.url, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const country = service.parse(data);

        if (country) {
          console.log(`País detectado: ${country} (${service.name})`);
          return country;
        }
      } catch (error) {
        console.log(`${service.name} falló:`, error.message);
      }
    }

    // Si todos fallaron, lanzar error
    throw new Error('No se pudo detectar el país');
  },

  validateRecord(record) {
    const errors = [];

    if (!record.nombres || record.nombres.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!record.apellidos || record.apellidos.trim().length < 2) {
      errors.push('Los apellidos deben tener al menos 2 caracteres');
    }

    if (!record.departamento || record.departamento.trim().length < 2) {
      errors.push('El departamento es requerido');
    }

    if (!record.distrito || record.distrito.trim().length < 2) {
      errors.push('El distrito es requerido');
    }

    if (!record.edad || record.edad < 18 || record.edad > 99) {
      errors.push('La edad debe estar entre 18 y 99 años');
    }

    return errors;
  },

  parseProofs(proofsString) {
    if (!proofsString) return [];
    return proofsString
      .split(',')
      .map(p => p.trim())
      .filter(p => p && (p.startsWith('http://') || p.startsWith('https://')));
  },

  formatInstagramLink(instagram) {
    if (!instagram) return '#';
    instagram = instagram.trim();

    if (instagram.startsWith('http://') || instagram.startsWith('https://')) {
      return instagram;
    }

    if (instagram.startsWith('@')) {
      instagram = instagram.substring(1);
    }

    return `https://instagram.com/${instagram}`;
  }
};

// Hacer disponible globalmente
window.Utils = Utils;
