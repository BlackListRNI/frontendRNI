// Sistema de almacenamiento híbrido: IndexedDB + localStorage con migración automática
const IndexedDBStorage = {
  dbName: 'RNI_Database',
  dbVersion: 1,
  db: null,
  
  // Configuración de chunks distribuidos
  config: {
    chunkSize: 50,
    maxLocalChunks: 5,
    replicationFactor: 3,
    syncInterval: 30000,
  },

  /**
   * Inicializa IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializado correctamente');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store para datos principales (records, threads)
        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: 'country' });
          dataStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
        }

        // Store para chunks distribuidos
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunksStore.createIndex('country', 'country', { unique: false });
          chunksStore.createIndex('hash', 'hash', { unique: false });
        }

        // Store para preferencias de usuario
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'userKey' });
        }

        // Store para metadata (merkle roots, sync info)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('📦 Estructura de IndexedDB creada');
      };
    });
  },

  /**
   * Migra datos de localStorage a IndexedDB
   */
  async migrateFromLocalStorage() {
    console.log('🔄 Iniciando migración de localStorage a IndexedDB...');
    
    const countries = ['PE', 'MX', 'CO', 'AR', 'CL', 'ES', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'PR'];
    let migratedCount = 0;

    for (const country of countries) {
      const key = `rni_data_${country}`;
      const oldData = localStorage.getItem(key);
      
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData);
          await this.saveData(country, parsed);
          migratedCount++;
          console.log(`✅ Migrado: ${country}`);
        } catch (error) {
          console.error(`Error migrando ${country}:`, error);
        }
      }
    }

    // Migrar preferencias de usuario
    const userKeys = Object.keys(localStorage).filter(k => k.startsWith('user_preferences_'));
    for (const key of userKeys) {
      try {
        const prefs = JSON.parse(localStorage.getItem(key));
        await this.savePreferences(prefs);
        console.log(`✅ Preferencias migradas: ${key}`);
      } catch (error) {
        console.error(`Error migrando preferencias ${key}:`, error);
      }
    }

    // Migrar estado distribuido
    const distState = localStorage.getItem('distributed_state');
    if (distState) {
      try {
        await this.saveMetadata('distributed_state', JSON.parse(distState));
        console.log('✅ Estado distribuido migrado');
      } catch (error) {
        console.error('Error migrando estado distribuido:', error);
      }
    }

    console.log(`🎉 Migración completada: ${migratedCount} países migrados`);
    
    // Marcar migración como completada
    localStorage.setItem('indexeddb_migrated', 'true');
  },

  /**
   * Guarda datos en IndexedDB
   */
  async saveData(country, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      const dataToSave = {
        country,
        records: data.records || [],
        threads: data.threads || {},
        lastUpdate: data.lastUpdate || Date.now(),
      };

      const request = store.put(dataToSave);

      request.onsuccess = () => {
        // NO guardar en localStorage (puede estar lleno)
        // IndexedDB tiene capacidad ilimitada
        resolve();
      };

      request.onerror = () => {
        console.error('Error guardando en IndexedDB:', request.error);
        reject(request.error);
      };
    });
  },

  /**
   * Carga datos desde IndexedDB (con fallback a localStorage)
   */
  async loadData(country) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(country);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Fallback a localStorage
          const backup = this.loadFromLocalStorageBackup(country);
          resolve(backup);
        }
      };

      request.onerror = () => {
        console.error('Error cargando de IndexedDB:', request.error);
        // Fallback a localStorage
        const backup = this.loadFromLocalStorageBackup(country);
        resolve(backup);
      };
    });
  },

  /**
   * Guarda chunk en IndexedDB
   */
  async saveChunk(chunk) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.put(chunk);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Carga chunks por país
   */
  async loadChunks(country) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const index = store.index('country');
      const request = index.getAll(country);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guarda un chunk individual
   */
  async saveChunk(chunk) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const request = store.put(chunk);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Carga un chunk individual por ID
   */
  async loadChunk(chunkId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.get(chunkId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Carga todos los chunks de un país
   */
  async loadChunks(country) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const index = store.index('country');
      const request = index.getAll(country);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guarda preferencias de usuario
   */
  async savePreferences(prefs) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      const request = store.put(prefs);

      request.onsuccess = () => {
        // Backup en localStorage
        localStorage.setItem(`user_preferences_${prefs.userKey}`, JSON.stringify(prefs));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Carga preferencias de usuario
   */
  async loadPreferences(userKey) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.get(userKey);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Fallback a localStorage
          const backup = localStorage.getItem(`user_preferences_${userKey}`);
          resolve(backup ? JSON.parse(backup) : null);
        }
      };

      request.onerror = () => {
        const backup = localStorage.getItem(`user_preferences_${userKey}`);
        resolve(backup ? JSON.parse(backup) : null);
      };
    });
  },

  /**
   * Guarda metadata (merkle roots, sync info)
   */
  async saveMetadata(key, value) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Carga metadata
   */
  async loadMetadata(key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Backup en localStorage (para compatibilidad)
   */
  saveToLocalStorageBackup(country, data) {
    try {
      const key = `rni_data_${country}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('No se pudo guardar backup en localStorage:', error);
    }
  },

  /**
   * Carga desde localStorage backup
   */
  loadFromLocalStorageBackup(country) {
    try {
      const key = `rni_data_${country}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : { records: [], threads: {}, lastUpdate: 0 };
    } catch (error) {
      console.error('Error cargando backup de localStorage:', error);
      return { records: [], threads: {}, lastUpdate: 0 };
    }
  },

  /**
   * Verifica integridad de datos usando hash
   */
  async verifyIntegrity(country) {
    const data = await this.loadData(country);
    const chunks = await this.loadChunks(country);
    
    if (chunks.length === 0) return true;

    // Verificar que los hashes coincidan
    for (const chunk of chunks) {
      const calculatedHash = this.hashChunk(chunk.records);
      if (calculatedHash !== chunk.hash) {
        console.warn(`⚠️ Hash no coincide para chunk ${chunk.id}`);
        return false;
      }
    }

    return true;
  },

  /**
   * Calcula hash de un chunk
   */
  hashChunk(records) {
    const data = JSON.stringify(records);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  },

  /**
   * Limpia datos antiguos (garbage collection)
   */
  async cleanOldData(daysOld = 30) {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const index = store.index('lastUpdate');
      const request = index.openCursor();

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.lastUpdate < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`🧹 Limpiados ${deletedCount} registros antiguos`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene estadísticas de almacenamiento
   */
  async getStorageStats() {
    if (!this.db) await this.init();

    const stats = {
      countries: 0,
      totalRecords: 0,
      totalChunks: 0,
      indexedDBSize: 0,
      localStorageSize: 0,
    };

    // Contar datos
    const transaction = this.db.transaction(['data', 'chunks'], 'readonly');
    
    const dataStore = transaction.objectStore('data');
    const dataRequest = dataStore.getAll();
    
    const chunksStore = transaction.objectStore('chunks');
    const chunksRequest = chunksStore.getAll();

    return new Promise((resolve) => {
      dataRequest.onsuccess = () => {
        const allData = dataRequest.result;
        stats.countries = allData.length;
        stats.totalRecords = allData.reduce((sum, d) => sum + (d.records?.length || 0), 0);
      };

      chunksRequest.onsuccess = () => {
        stats.totalChunks = chunksRequest.result.length;
      };

      transaction.oncomplete = () => {
        // Estimar tamaño de localStorage
        let localStorageTotal = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageTotal += localStorage[key].length + key.length;
          }
        }
        stats.localStorageSize = (localStorageTotal / 1024).toFixed(2) + ' KB';

        resolve(stats);
      };
    });
  },
};

window.IndexedDBStorage = IndexedDBStorage;
