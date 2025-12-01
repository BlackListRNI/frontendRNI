// ============================================
// P2P CON CHUNKS DISTRIBUIDOS
// ============================================

const P2PSimple = {
    country: null,
    myPeerId: null,
    syncInterval: null,
    isInitialized: false,
    myData: null,

    async init(country) {
        if (this.isInitialized) return;

        this.country = country;
        this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        console.log(`📢 Iniciando P2P para ${country}`);

        // Inicializar IndexedDB
        await IndexedDBStorage.init();

        // Cargar mis datos locales
        await this.loadMyData();

        // Anunciar presencia inmediatamente
        await this.announce();

        // Si no tengo datos, intentar obtenerlos de otros peers
        if (!this.myData || this.myData.records.length === 0) {
            await this.requestDataFromPeers();
        }

        // Sincronizar cada 2 minutos
        this.syncInterval = setInterval(() => {
            this.announce();
        }, 2 * 60 * 1000);

        this.isInitialized = true;
    },

    async loadMyData() {
        try {
            let data = { records: [], threads: {} };

            // Intentar IndexedDB primero
            try {
                data = await IndexedDBStorage.loadData(this.country);
            } catch (e) {
                console.log('IndexedDB no disponible, usando localStorage');
            }

            // Si no hay datos en IndexedDB, intentar localStorage
            if (!data || !data.records || data.records.length === 0) {
                data = Utils.getLocalData(this.country);
            }

            // Asegurar estructura
            if (!data.records) {
                data.records = [];
            }
            if (!data.threads) {
                data.threads = {};
            }

            this.myData = data;

            console.log(`💾 Datos locales: ${this.myData.records.length} registros`);
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.myData = { records: [], threads: {} };
        }
    },

    async announce() {
        try {
            const recordCount = this.myData?.records?.length || 0;

            const response = await fetch(`${API.baseURL}/api/announce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    peerId: this.myPeerId,
                    recordCount: recordCount
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`📢 ${this.country}: ${result.totalPeers} peers, ${result.totalRecords} registros en red`);

                // Si hay otros peers con más datos, sincronizar
                if (result.totalRecords > recordCount) {
                    await this.requestDataFromPeers();
                }
            }
        } catch (error) {
            console.warn('⚠️ No se pudo anunciar');
        }
    },

    async requestDataFromPeers() {
        try {
            console.log('🔄 Solicitando datos de otros peers...');

            const response = await fetch(`${API.baseURL}/api/data/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.peers && result.peers.length > 0) {
                    console.log(`✅ Encontrados ${result.peers.length} peers con datos`);
                    // En un sistema P2P real, aquí se conectaría directamente con esos peers
                    // Por ahora, usamos el servidor como intermediario
                } else {
                    console.log('⚠️ No hay peers con datos disponibles');
                }
            }
        } catch (error) {
            console.error('Error solicitando datos:', error);
        }
    },

    async shareMyData() {
        if (!this.myData || this.myData.records.length === 0) return;

        try {
            await fetch(`${API.baseURL}/api/data/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    peerId: this.myPeerId,
                    sharedData: this.myData
                })
            });
        } catch (error) {
            console.error('Error compartiendo datos:', error);
        }
    },

    async forceSync() {
        await this.loadMyData();
        await this.announce();
        await this.requestDataFromPeers();
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
            records: this.myData?.records?.length || 0,
            isInitialized: this.isInitialized
        };
    }
};

window.P2PSimple = P2PSimple;
