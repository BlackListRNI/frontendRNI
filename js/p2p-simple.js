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

            // Si es la primera sincronización y tengo datos, enviarlos
            if (lastSync == 0 && this.myData.records.length > 0) {
                console.log(`📤 Primera sync: enviando ${this.myData.records.length} registros`);
                await this.uploadMyData();
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
                    localStorage.setItem(`lastSync_${this.country}`, result.serverTime);
                    console.log(`✅ ${result.events.length} eventos aplicados`);
                }
            }
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    },

    async uploadMyData() {
        try {
            let sent = 0;
            let skipped = 0;
            
            // Enviar registros en lotes de 5 (más lento para evitar rate limit)
            for (let i = 0; i < this.myData.records.length; i += 5) {
                const batch = this.myData.records.slice(i, i + 5);
                
                for (const record of batch) {
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
                            sent++;
                        } else if (response.status === 429) {
                            // Rate limit, esperar 1 segundo
                            console.log('⏳ Rate limit, esperando...');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            i -= 5; // Reintentar este lote
                            break;
                        } else if (response.status === 409) {
                            // Duplicado, ignorar
                            skipped++;
                        } else {
                            skipped++;
                        }
                    } catch (error) {
                        skipped++;
                    }
                }
                
                console.log(`📤 ${sent}/${this.myData.records.length} enviados, ${skipped} omitidos`);
                
                // Pequeña pausa entre lotes
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`✅ Sincronización completa: ${sent} enviados, ${skipped} omitidos`);
        } catch (error) {
            console.error('Error enviando datos:', error);
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
