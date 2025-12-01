// ============================================
// P2P CON CHUNKS DISTRIBUIDOS
// ============================================

const P2PSimple = {
    country: null,
    myPeerId: null,
    syncInterval: null,
    isInitialized: false,

    async init(country) {
        if (this.isInitialized) return;

        this.country = country;
        this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        console.log(`📢 Iniciando P2P con chunks para ${country}`);

        // Inicializar IndexedDB
        await IndexedDBStorage.init();

        // Inicializar ChunkManager
        await ChunkManager.init(country);

        // Sincronizar inmediatamente al iniciar
        await this.syncChunks();

        // Sincronizar chunks cada 2 minutos
        this.syncInterval = setInterval(() => {
            this.syncChunks();
        }, 2 * 60 * 1000);

        this.isInitialized = true;
    },

    async announce() {
        try {
            const myChunks = Array.from(ChunkManager.myChunks);

            const response = await fetch(`${API.baseURL}/api/announce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    peerId: this.myPeerId,
                    chunks: myChunks
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`📢 ${this.country}: ${result.totalPeers} peers, ${result.totalChunks} chunks`);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo anunciar');
        }
    },

    async syncChunks() {
        try {
            console.log('🔄 Sincronizando chunks...');
            
            // Anunciar presencia primero
            await this.announce();
            
            // Sincronizar con el servidor
            const data = await ChunkManager.sync();

            // Limpiar chunks viejos
            await ChunkManager.cleanupOldChunks();

            // Actualizar UI si está disponible
            if (typeof Filters !== 'undefined' && data.records && data.records.length > 0) {
                Filters.setRecords(data.records);
                console.log(`✅ ${data.records.length} registros sincronizados`);
            }

        } catch (error) {
            console.error('Error sincronizando chunks:', error);
        }
    },

    async forceSync() {
        await this.syncChunks();
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
            chunks: ChunkManager.myChunks.size,
            isInitialized: this.isInitialized
        };
    }
};

window.P2PSimple = P2PSimple;
