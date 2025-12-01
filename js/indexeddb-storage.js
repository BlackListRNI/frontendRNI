// ============================================
// INDEXEDDB STORAGE - Fallback cuando localStorage se llena
// ============================================

const IndexedDBStorage = {
    dbName: 'RNI_DB',
    dbVersion: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store para datos por país
                if (!db.objectStoreNames.contains('countries')) {
                    db.createObjectStore('countries', { keyPath: 'country' });
                }

                // Store para chunks
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: 'hash' });
                    chunkStore.createIndex('country', 'country', { unique: false });
                }
            };
        });
    },

    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    },

    async saveData(country, data) {
        const db = await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['countries'], 'readwrite');
            const store = transaction.objectStore('countries');

            const request = store.put({
                country,
                data,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async loadData(country) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['countries'], 'readonly');
            const store = transaction.objectStore('countries');
            const request = store.get(country);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve({ records: [], threads: {}, lastUpdate: 0 });
                }
            };

            request.onerror = () => reject(request.error);
        });
    },

    async saveChunk(country, chunkHash, chunkData) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');

            const request = store.put({
                hash: chunkHash,
                country,
                data: chunkData,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async loadChunk(chunkHash) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chunks'], 'readonly');
            const store = transaction.objectStore('chunks');
            const request = store.get(chunkHash);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => reject(request.error);
        });
    },

    async listChunks(country) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chunks'], 'readonly');
            const store = transaction.objectStore('chunks');
            const index = store.index('country');
            const request = index.getAll(country);

            request.onsuccess = () => {
                resolve(request.result.map(chunk => chunk.hash));
            };

            request.onerror = () => reject(request.error);
        });
    },

    async deleteChunk(chunkHash) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');
            const request = store.delete(chunkHash);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearCountry(country) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['countries', 'chunks'], 'readwrite');
            
            // Borrar datos del país
            const countryStore = transaction.objectStore('countries');
            countryStore.delete(country);

            // Borrar chunks del país
            const chunkStore = transaction.objectStore('chunks');
            const index = chunkStore.index('country');
            const request = index.openCursor(country);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    async getStorageSize() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                total: estimate.quota,
                percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }
};

window.IndexedDBStorage = IndexedDBStorage;
