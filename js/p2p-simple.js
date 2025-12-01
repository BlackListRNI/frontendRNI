// ============================================
// SYNC SIMPLE CON SERVIDOR COMPRIMIDO
// ============================================

const P2PSimple = {
    country: null,
    myPeerId: null,
    syncInterval: null,
    isInitialized: false,
    isSyncing: false,

    async init(country) {
        if (this.isInitialized) return;
        
        this.country = country;
        this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`🌐 Sync iniciado para ${country}`);
        
        // Primera sincronización inmediata
        await this.syncWithServer();
        
        // Sincronizar cada 60 segundos
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 60000);
        
        this.isInitialized = true;
    },

    async syncWithServer() {
        if (this.isSyncing) {
            return;
        }

        this.isSyncing = true;

        try {
            // 1. Obtener datos locales
            const myData = await IndexedDBStorage.loadData(this.country);
            const myRecords = myData.records || [];
            
            console.log(`🔄 Enviando ${myRecords.length} registros al servidor`);
            
            // 2. Enviar al servidor y recibir merge
            const response = await fetch(`${API.baseURL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    clientData: {
                        records: myRecords,
                        threads: myData.threads || {}
                    }
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Servidor no disponible');
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const serverData = result.data;
                
                console.log(`📥 Servidor tiene ${serverData.records?.length || 0} registros`);
                
                // 3. Hacer merge local
                const merged = this.mergeData(myData, serverData);
                
                // 4. Guardar localmente
                await IndexedDBStorage.saveData(this.country, merged);
                
                console.log(`✅ Total local: ${merged.records.length} registros`);
                
                // 5. Actualizar UI si cambió
                if (merged.records.length !== myRecords.length) {
                    this.notifyDataChanged();
                }
            }
        } catch (error) {
            console.error('❌ Error en sync:', error.message);
        } finally {
            this.isSyncing = false;
        }
    },

    mergeData(local, remote) {
        const recordsMap = new Map();
        
        // Agregar locales
        if (local.records) {
            local.records.forEach(r => recordsMap.set(r.id, r));
        }
        
        // Agregar remotos (más recientes ganan)
        if (remote.records) {
            remote.records.forEach(r => {
                const existing = recordsMap.get(r.id);
                if (!existing || (r.timestamp || 0) > (existing.timestamp || 0)) {
                    recordsMap.set(r.id, r);
                }
            });
        }
        
        return {
            records: Array.from(recordsMap.values()),
            threads: { ...local.threads, ...remote.threads },
            lastUpdate: Date.now()
        };
    },

    notifyDataChanged() {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            if (typeof window.loadRecords === 'function') {
                window.loadRecords();
            }
        }
    },

    async forceSync() {
        this.isSyncing = false;
        await this.syncWithServer();
    },

    disconnect() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.isInitialized = false;
    },

    getStats() {
        return {
            peerId: this.myPeerId,
            country: this.country,
            isInitialized: this.isInitialized
        };
    }
};

window.P2PSimple = P2PSimple;
