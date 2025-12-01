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

        console.log(`📢 Iniciando sincronización para ${country}`);

        // Inicializar IndexedDB
        await IndexedDBStorage.init();

        // Cargar mis datos locales
        await this.loadMyData();

        // Sincronizar con servidor inmediatamente
        await this.syncWithServer();

        // Anunciar presencia
        await this.announce();

        // Sincronizar cada 2 minutos
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
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

                // Solo log si hay cambios significativos
                if (result.totalRecords > recordCount + 10) {
                    console.log(`📢 Red: ${result.totalPeers} peers, ${result.totalRecords} registros disponibles`);
                    await this.requestDataFromPeers();
                }
            }
        } catch (error) {
            // Silencioso
        }
    },

    async requestDataFromPeers() {
        try {
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
                    console.log(`✅ ${result.peers.length} peers con datos`);
                }
            }
        } catch (error) {
            // Silencioso
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

    async syncWithServer() {
        try {
            const lastSync = localStorage.getItem(`lastSync_${this.country}`) || 0;

            const response = await fetch(`${API.baseURL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    since: parseInt(lastSync)
                })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.events && result.events.length > 0) {
                    await this.applyEvents(result.events);
                    localStorage.setItem(`lastSync_${this.country}`, result.serverTime);
                    console.log(`✅ ${result.events.length} eventos aplicados`);
                }
            }
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    },

    async applyEvents(events) {
        for (const event of events) {
            if (event.country !== this.country) continue;

            switch (event.type) {
                case 'record_created':
                    if (!this.myData.records.find(r => r.id === event.recordId)) {
                        this.myData.records.push(event.record);
                        if (!this.myData.threads[event.recordId]) {
                            this.myData.threads[event.recordId] = { comments: [], votes: { approve: 0, reject: 0 } };
                        }
                    }
                    break;

                case 'comment_added':
                    if (!this.myData.threads[event.recordId]) {
                        this.myData.threads[event.recordId] = { comments: [], votes: { approve: 0, reject: 0 } };
                    }
                    this.myData.threads[event.recordId].comments.push(event.comment);
                    break;

                case 'vote_added':
                    if (!this.myData.threads[event.recordId]) {
                        this.myData.threads[event.recordId] = { comments: [], votes: { approve: 0, reject: 0 } };
                    }
                    if (event.voteType === 'approve') {
                        this.myData.threads[event.recordId].votes.approve++;
                    } else {
                        this.myData.threads[event.recordId].votes.reject++;
                    }
                    break;
            }
        }

        await IndexedDBStorage.saveData(this.country, this.myData);
        await Utils.saveLocalData(this.country, this.myData);

        if (typeof Filters !== 'undefined') {
            Filters.setRecords(this.myData.records);
        }
    },

    async forceSync() {
        await this.loadMyData();
        await this.syncWithServer();
        await this.announce();
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
