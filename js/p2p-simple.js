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

        // Sincronizar cada 2 minutos
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
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

    async syncWithServer() {
        try {
            const lastSync = localStorage.getItem(`lastSync_${this.country}`) || 0;
            const hasUploaded = localStorage.getItem(`uploaded_${this.country}`);

            // Si es la primera sincronización y tengo datos, enviarlos
            if (!hasUploaded && this.myData.records.length > 0) {
                console.log(`📤 Primera sync: enviando ${this.myData.records.length} registros`);
                await this.uploadMyData();
                localStorage.setItem(`uploaded_${this.country}`, 'true');
            }

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
                    console.log(`✅ ${result.events.length} eventos aplicados`);
                }
                
                // Siempre actualizar el timestamp, incluso si no hay eventos
                localStorage.setItem(`lastSync_${this.country}`, result.serverTime);
            }
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    },

    async uploadMyData() {
        try {
            // Obtener índice del último registro enviado
            const lastUploaded = parseInt(localStorage.getItem(`lastUploaded_${this.country}`) || '0');
            
            // Solo enviar 1 registro por sincronización
            if (lastUploaded < this.myData.records.length) {
                const record = this.myData.records[lastUploaded];
                
                try {
                    const response = await fetch(`${API.baseURL}/api/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            country: this.country,
                            record: record
                        })
                    });
                    
                    if (response.ok) {
                        localStorage.setItem(`lastUploaded_${this.country}`, (lastUploaded + 1).toString());
                        console.log(`📤 ${lastUploaded + 1}/${this.myData.records.length} registros enviados`);
                    } else if (response.status === 429) {
                        console.log('⏳ Rate limit alcanzado, reintentando en próxima sync');
                    } else if (response.status === 409) {
                        // Duplicado, saltar al siguiente
                        localStorage.setItem(`lastUploaded_${this.country}`, (lastUploaded + 1).toString());
                    }
                } catch (error) {
                    console.error('Error enviando registro:', error);
                }
            } else {
                console.log(`✅ Todos los registros ya fueron enviados`);
            }
        } catch (error) {
            console.error('Error en uploadMyData:', error);
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
