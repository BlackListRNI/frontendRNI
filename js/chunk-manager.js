// ============================================
// CHUNK MANAGER - Sistema de chunks distribuidos
// ============================================

const ChunkManager = {
    CHUNK_SIZE: 50, // Registros por chunk
    MAX_CHUNKS_PER_CLIENT: 5, // Máximo de chunks que guarda cada cliente
    country: null,
    myChunks: new Set(),

    async init(country) {
        this.country = country;
        await this.loadMyChunks();
        
        // Si no tengo chunks pero tengo datos locales, crear chunks
        if (this.myChunks.size === 0) {
            await this.createChunksFromLocalData();
        }
        
        console.log(`📦 Chunks locales: ${this.myChunks.size}`);
    },
    
    async createChunksFromLocalData() {
        try {
            // Intentar cargar datos de localStorage o IndexedDB
            let data = { records: [], threads: {} };
            
            if (typeof IndexedDBStorage !== 'undefined') {
                try {
                    data = await IndexedDBStorage.loadData(this.country);
                } catch (error) {
                    console.log('No hay datos en IndexedDB');
                }
            }
            
            if (!data.records || data.records.length === 0) {
                data = Utils.getLocalData(this.country);
            }
            
            if (data.records && data.records.length > 0) {
                console.log(`📦 Creando chunks desde ${data.records.length} registros locales...`);
                
                const chunks = this.createChunks(data.records);
                await this.saveChunksLocally(chunks);
                
                console.log(`✅ ${chunks.length} chunks creados desde datos locales`);
            }
        } catch (error) {
            console.error('Error creando chunks desde datos locales:', error);
        }
    },

    // Calcular hash de un chunk
    calculateHash(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
    },

    // Dividir registros en chunks
    createChunks(records) {
        const chunks = [];
        
        for (let i = 0; i < records.length; i += this.CHUNK_SIZE) {
            const chunkRecords = records.slice(i, i + this.CHUNK_SIZE);
            const chunkData = {
                records: chunkRecords,
                index: Math.floor(i / this.CHUNK_SIZE),
                timestamp: Date.now()
            };
            
            const chunkHash = this.calculateHash(chunkData);
            
            chunks.push({
                hash: chunkHash,
                data: chunkData
            });
        }

        return chunks;
    },

    // Guardar chunks localmente (solo algunos)
    async saveChunksLocally(chunks) {
        // Seleccionar aleatoriamente MAX_CHUNKS_PER_CLIENT chunks
        const selectedChunks = this.selectRandomChunks(chunks, this.MAX_CHUNKS_PER_CLIENT);

        for (const chunk of selectedChunks) {
            await IndexedDBStorage.saveChunk(this.country, chunk.hash, chunk.data);
            this.myChunks.add(chunk.hash);
        }

        console.log(`💾 Guardados ${selectedChunks.length} chunks localmente`);
    },

    // Seleccionar chunks aleatorios
    selectRandomChunks(chunks, count) {
        if (chunks.length <= count) return chunks;

        const shuffled = [...chunks].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    // Cargar mis chunks desde IndexedDB
    async loadMyChunks() {
        const chunkHashes = await IndexedDBStorage.listChunks(this.country);
        this.myChunks = new Set(chunkHashes);
    },

    // Subir mis chunks al servidor
    async pushMyChunks() {
        const pushPromises = [];

        for (const chunkHash of this.myChunks) {
            const chunkData = await IndexedDBStorage.loadChunk(chunkHash);
            
            if (chunkData) {
                pushPromises.push(
                    fetch(`${API.baseURL}/api/chunk/push`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            country: this.country,
                            peerId: P2PSimple.myPeerId,
                            chunkHash,
                            chunkData
                        })
                    })
                );
            }
        }

        await Promise.all(pushPromises);
        console.log(`📤 ${pushPromises.length} chunks subidos al servidor`);
    },

    // Descargar chunks faltantes
    async pullMissingChunks() {
        try {
            // Obtener lista de chunks disponibles
            const response = await fetch(`${API.baseURL}/api/chunk/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: this.country })
            });

            if (!response.ok) return;

            const result = await response.json();
            const availableChunks = result.chunks || [];

            // Descargar chunks que no tengo
            const missingChunks = availableChunks.filter(chunk => !this.myChunks.has(chunk.hash));

            if (missingChunks.length === 0) {
                console.log('✅ Todos los chunks están actualizados');
                return;
            }

            console.log(`📥 Descargando ${missingChunks.length} chunks faltantes...`);

            for (const chunkInfo of missingChunks) {
                const pullResponse = await fetch(`${API.baseURL}/api/chunk/pull`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        country: this.country,
                        chunkHash: chunkInfo.hash
                    })
                });

                if (pullResponse.ok) {
                    const pullResult = await pullResponse.json();
                    
                    // Verificar hash
                    const calculatedHash = this.calculateHash(pullResult.chunkData);
                    
                    if (calculatedHash === pullResult.chunkHash) {
                        await IndexedDBStorage.saveChunk(this.country, pullResult.chunkHash, pullResult.chunkData);
                        this.myChunks.add(pullResult.chunkHash);
                        console.log(`✅ Chunk descargado: ${pullResult.chunkHash.substring(0, 8)}`);
                    } else {
                        console.warn(`⚠️ Hash inválido: ${pullResult.chunkHash.substring(0, 8)}`);
                    }
                }
            }

        } catch (error) {
            console.error('Error descargando chunks:', error);
        }
    },

    // Reconstruir datos completos desde chunks
    async reconstructData() {
        const allChunks = [];

        for (const chunkHash of this.myChunks) {
            const chunkData = await IndexedDBStorage.loadChunk(chunkHash);
            if (chunkData) {
                allChunks.push(chunkData);
            }
        }

        // Ordenar por índice
        allChunks.sort((a, b) => a.index - b.index);

        // Combinar registros
        const allRecords = [];
        for (const chunk of allChunks) {
            allRecords.push(...chunk.records);
        }

        return {
            records: allRecords,
            threads: {},
            lastUpdate: Date.now()
        };
    },

    // Sincronización completa
    async sync() {
        console.log('🔄 Sincronizando chunks...');

        // 1. Subir mis chunks
        await this.pushMyChunks();

        // 2. Descargar chunks faltantes
        await this.pullMissingChunks();

        // 3. Reconstruir datos
        const data = await this.reconstructData();

        // 4. Guardar en IndexedDB principal
        await IndexedDBStorage.saveData(this.country, data);

        console.log(`✅ Sincronización completa: ${data.records.length} registros`);

        return data;
    },

    // Limpiar chunks viejos (mantener solo MAX_CHUNKS_PER_CLIENT)
    async cleanupOldChunks() {
        if (this.myChunks.size <= this.MAX_CHUNKS_PER_CLIENT) return;

        const chunkArray = Array.from(this.myChunks);
        const toDelete = chunkArray.slice(this.MAX_CHUNKS_PER_CLIENT);

        for (const chunkHash of toDelete) {
            await IndexedDBStorage.deleteChunk(chunkHash);
            this.myChunks.delete(chunkHash);
        }

        console.log(`🗑️ ${toDelete.length} chunks antiguos eliminados`);
    }
};

window.ChunkManager = ChunkManager;
