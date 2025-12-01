// ============================================
// P2P SIMPLE - SIN WEBRTC
// ============================================
// Usa el servidor solo como relay temporal
// Los datos se guardan en IndexedDB de cada cliente

const P2PSimple = {
    country: null,
    myPeerId: null,
    syncInterval: null,
    isInitialized: false,

    async init(country) {
        if (this.isInitialized) return;
        
        this.country = country;
        this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`🌐 P2P Simple iniciado para ${country}`);
        console.log(`👤 Mi ID: ${this.myPeerId.substring(0, 16)}...`);
        
        // Sincronizar cada 30 segundos
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30000);
        
        // Primera sincronización inmediata
        await this.syncWithServer();
        
        this.isInitialized = true;
    },

    async syncWithServer() {
        try {
            // 1. Obtener mis datos locales
            const myData = await IndexedDBStorage.loadData(this.country);
            
            // 2. Enviar al servidor y recibir datos de otros
            const response = await fetch(`${API.baseURL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    peerId: this.myPeerId,
                    clientData: {
                        records: myData.records || [],
                        threads: myData.threads || {},
                        lastUpdate: Date.now()
                    }
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Servidor no disponible, usando datos locales');
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const serverData = result.data;
                
                // 3. Hacer merge con datos del servidor
                const merged = this.mergeData(myData, serverData);
                
                // 4. Guardar localmente
                await IndexedDBStorage.saveData(this.country, merged);
                
                console.log(`✅ Sincronizado: ${merged.records.length} registros totales`);
                
                // 5. Actualizar UI si es necesario
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    // Recargar lista si estamos en la página principal
                    if (typeof window.loadRecords === 'function') {
                        window.loadRecords();
                    }
                }
            }
        } catch (error) {
            console.error('Error en sincronización:', error);
        }
    },

    mergeData(local, remote) {
        // Merge records (sin duplicados por ID)
        const recordsMap = new Map();
        
        // Agregar locales primero
        if (local.records) {
            local.records.forEach(r => recordsMap.set(r.id, r));
        }
        
        // Agregar remotos (sobrescribe si hay conflicto)
        if (remote.records) {
            remote.records.forEach(r => {
                const existing = recordsMap.get(r.id);
                if (!existing || r.timestamp > existing.timestamp) {
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

    async forceSync() {
        console.log('🔄 Forzando sincronización...');
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
            isInitialized: this.isInitialized
        };
    }
};

// Exportar globalmente
window.P2PSimple = P2PSimple;
