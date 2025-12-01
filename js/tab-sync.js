// ============================================
// SINCRONIZACIÓN ENTRE PESTAÑAS
// ============================================
// Usa BroadcastChannel para sincronizar datos entre pestañas de la misma PC

const TabSync = {
    channel: null,
    isInitialized: false,
    
    init(country) {
        if (this.isInitialized) return;
        
        // BroadcastChannel para comunicación entre pestañas
        this.channel = new BroadcastChannel('rni_sync');
        
        // Escuchar mensajes de otras pestañas
        this.channel.onmessage = async (event) => {
            const { type, data, country: msgCountry } = event.data;
            
            // Solo procesar mensajes del mismo país
            if (msgCountry !== country) return;
            
            switch (type) {
                case 'data-updated':
                    await this.handleDataUpdate(data, msgCountry);
                    break;
                
                case 'new-record':
                    await this.handleNewRecord(data, msgCountry);
                    break;
                
                case 'new-comment':
                    await this.handleNewComment(data, msgCountry);
                    break;
                
                case 'new-vote':
                    await this.handleNewVote(data, msgCountry);
                    break;
                
                case 'request-sync':
                    await this.sendMyData(msgCountry);
                    break;
            }
        };
        
        // Solicitar datos de otras pestañas al iniciar
        this.requestSync(country);
        
        this.isInitialized = true;
        console.log('✅ Sincronización entre pestañas activada');
    },
    
    requestSync(country) {
        if (!this.channel) return;
        
        this.channel.postMessage({
            type: 'request-sync',
            country
        });
    },
    
    async sendMyData(country) {
        if (!this.channel) return;
        
        try {
            let data = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                data = await IndexedDBStorage.loadData(country);
            } else {
                data = Utils.getLocalData(country);
            }
            
            this.channel.postMessage({
                type: 'data-updated',
                data,
                country
            });
            
            console.log(`📤 Datos enviados a otras pestañas: ${data.records.length} registros`);
        } catch (error) {
            console.error('Error enviando datos:', error);
        }
    },
    
    async handleDataUpdate(newData, country) {
        try {
            // Cargar datos actuales
            let currentData = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                currentData = await IndexedDBStorage.loadData(country);
            } else {
                currentData = Utils.getLocalData(country);
            }
            
            // Merge de datos
            const existingIds = new Set(currentData.records.map(r => r.id));
            const newRecords = newData.records.filter(r => !existingIds.has(r.id));
            
            if (newRecords.length > 0) {
                currentData.records.push(...newRecords);
                currentData.lastUpdate = Date.now();
                
                // Guardar
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.saveData(country, currentData);
                }
                Utils.saveLocalData(country, currentData);
                
                console.log(`📥 ${newRecords.length} nuevos registros de otra pestaña`);
                
                // Actualizar UI si está disponible
                if (typeof Filters !== 'undefined') {
                    Filters.setRecords(currentData.records);
                }
                
                UI.showToast(`📥 ${newRecords.length} nuevos registros sincronizados`, 'info');
            }
            
            // Merge threads
            if (newData.threads) {
                currentData.threads = { ...currentData.threads, ...newData.threads };
                
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.saveData(country, currentData);
                }
                Utils.saveLocalData(country, currentData);
            }
        } catch (error) {
            console.error('Error manejando actualización:', error);
        }
    },
    
    async handleNewRecord(record, country) {
        try {
            let data = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                data = await IndexedDBStorage.loadData(country);
            } else {
                data = Utils.getLocalData(country);
            }
            
            // Verificar si ya existe
            const exists = data.records.some(r => r.id === record.id);
            if (!exists) {
                data.records.push(record);
                data.lastUpdate = Date.now();
                
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.saveData(country, data);
                }
                Utils.saveLocalData(country, data);
                
                console.log(`✅ Nuevo registro de otra pestaña: ${record.nombres}`);
                
                if (typeof Filters !== 'undefined') {
                    Filters.setRecords(data.records);
                }
            }
        } catch (error) {
            console.error('Error manejando nuevo registro:', error);
        }
    },
    
    async handleNewComment(commentData, country) {
        try {
            const { recordId, thread } = commentData;
            
            let data = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                data = await IndexedDBStorage.loadData(country);
            } else {
                data = Utils.getLocalData(country);
            }
            
            if (!data.threads) {
                data.threads = {};
            }
            
            data.threads[recordId] = thread;
            data.lastUpdate = Date.now();
            
            if (typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.saveData(country, data);
            }
            Utils.saveLocalData(country, data);
            
            console.log(`💬 Nuevo comentario de otra pestaña`);
        } catch (error) {
            console.error('Error manejando comentario:', error);
        }
    },
    
    async handleNewVote(voteData, country) {
        try {
            const { recordId, votes } = voteData;
            
            let data = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                data = await IndexedDBStorage.loadData(country);
            } else {
                data = Utils.getLocalData(country);
            }
            
            if (!data.threads) {
                data.threads = {};
            }
            
            if (!data.threads[recordId]) {
                data.threads[recordId] = { comments: [], votes: { approve: 0, reject: 0 } };
            }
            
            data.threads[recordId].votes = votes;
            data.lastUpdate = Date.now();
            
            if (typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.saveData(country, data);
            }
            Utils.saveLocalData(country, data);
            
            console.log(`👍 Nuevo voto de otra pestaña`);
        } catch (error) {
            console.error('Error manejando voto:', error);
        }
    },
    
    // Notificar a otras pestañas sobre cambios
    notifyDataUpdate(country) {
        if (!this.channel) return;
        
        this.sendMyData(country);
    },
    
    notifyNewRecord(record, country) {
        if (!this.channel) return;
        
        this.channel.postMessage({
            type: 'new-record',
            data: record,
            country
        });
    },
    
    notifyNewComment(recordId, thread, country) {
        if (!this.channel) return;
        
        this.channel.postMessage({
            type: 'new-comment',
            data: { recordId, thread },
            country
        });
    },
    
    notifyNewVote(recordId, votes, country) {
        if (!this.channel) return;
        
        this.channel.postMessage({
            type: 'new-vote',
            data: { recordId, votes },
            country
        });
    },
    
    disconnect() {
        if (this.channel) {
            this.channel.close();
            this.isInitialized = false;
        }
    }
};

// Exportar globalmente
window.TabSync = TabSync;
