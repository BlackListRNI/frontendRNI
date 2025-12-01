// ============================================
// P2P SIMPLE - INDEXEDDB + SYNC LIGERO
// ============================================
// Sincroniza con servidor cada 60 segundos
// Servidor solo guarda últimos 1000 registros por país

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
        
        console.log(`🌐 P2P Simple iniciado para ${country}`);
        console.log(`💾 IndexedDB + Sync cada 60 seg`);
        
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
            console.log('⏭️ Sync en progreso, saltando...');
            return;
        }

        this.isSyncing = true;

        try {
            // 1. Obtener datos locales
            const myData = await IndexedDBStorage.loadData(this.country);
            const myRecords = myData.records || [];
            
            console.log(`🔄 Sincronizando: ${myRecords.length} registros locales`);
            
            // 2. PUSH: Enviar mis registros al servidor (en chunks pequeños)
            if (myRecords.length > 0) {
                const CHUNK_SIZE = 10; // Enviar de 10 en 10
                const recentRecords = myRecords
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .slice(0, 100); // Solo los últimos 100
                
                for (let i = 0; i < recentRecords.length; i += CHUNK_SIZE) {
                    const chunk = recentRecords.slice(i, i + CHUNK_SIZE);
                    
                    try {
                        await fetch(`${API.baseURL}/api/push`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                country: this.country,
                                records: chunk
                            })
                        });
                    } catch (error) {
                        console.warn(`⚠️ Error enviando chunk ${i / CHUNK_SIZE + 1}`);
                    }
                }
            }

            // 3. SYNC: Obtener datos del servidor
            const response = await fetch(`${API.baseURL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    recordCount: myRecords.length
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Servidor no disponible');
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const serverData = result.data;
                
                console.log(`📥 Servidor: ${serverData.records?.length || 0} registros`);
                
                // 4. Hacer merge (sin duplicados)
                const merged = this.mergeData(myData, serverData);
                
                // 5. Guardar localmente
                await IndexedDBStorage.saveData(this.country, merged);
                
                console.log(`✅ Total: ${merged.records.length} registros`);
                
                // 6. Actualizar UI si cambió algo
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
        // Merge records (sin duplicados por ID)
        const recordsMap = new Map();
        
        // Agregar locales primero
        if (local.records) {
            local.records.forEach(r => recordsMap.set(r.id, r));
        }
        
        // Agregar remotos (sobrescribe si es más reciente)
        if (remote.records) {
            remote.records.forEach(r => {
                const existing = recordsMap.get(r.id);
                if (!existing || (r.timestamp || 0) > (existing.timestamp || 0)) {
                    recordsMap.set(r.id, r);
                }
            });
        }
        
        // Merge threads
        const threads = { ...local.threads, ...remote.threads };
        
        return {
            records: Array.from(recordsMap.values()),
            threads,
            lastUpdate: Date.now()
        };
    },

    notifyDataChanged() {
        // Recargar lista si estamos en la página principal
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            if (typeof window.loadRecords === 'function') {
                console.log('🔄 Recargando lista...');
                window.loadRecords();
            }
        }
    },

    async forceSync() {
        console.log('🔄 Forzando sincronización...');
        this.isSyncing = false; // Reset flag
        await this.syncWithServer();
    },

    disconnect() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.isInitialized = false;
        console.log('🔌 P2P Simple desconectado');
    },

    getStats() {
        return {
            peerId: this.myPeerId,
            country: this.country,
            isInitialized: this.isInitialized,
            isSyncing: this.isSyncing
        };
    }
};

// Exportar globalmente
window.P2PSimple = P2PSimple;
