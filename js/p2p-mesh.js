// ============================================
// SISTEMA P2P MESH INTEGRADO CON RNI
// ============================================
// Todos los usuarios son "hosts" sin líder central
// Datos se replican automáticamente entre peers

const P2PMesh = {
    peers: new Map(), // { peerId: { connection, lastSeen, hasRecords } }
    myPeerId: null,
    country: null,
    signalServer: null,
    isInitialized: false,
    syncInterval: null,
    
    // Configuración
    config: {
        maxPeers: 8, // Máximo de conexiones simultáneas
        chunkSize: 32 * 1024, // 32KB por chunk
        syncIntervalMs: 30000, // Sincronizar cada 30 segundos
        heartbeatMs: 10000, // Heartbeat cada 10 segundos
    },

    async init(country) {
        if (this.isInitialized) return;
        
        this.country = country;
        this.myPeerId = this.generatePeerId();
        this.signalServer = API.baseURL;
        
        console.log(`🌐 Iniciando P2P Mesh para ${country}...`);
        console.log(`👤 Mi Peer ID: ${this.myPeerId}`);
        
        // Anunciar presencia
        await this.announcePresence();
        
        // Conectar a peers disponibles
        await this.connectToPeers();
        
        // Sincronización periódica
        this.syncInterval = setInterval(() => {
            this.syncWithPeers();
        }, this.config.syncIntervalMs);
        
        // Heartbeat para mantener conexiones
        setInterval(() => {
            this.sendHeartbeat();
        }, this.config.heartbeatMs);
        
        this.isInitialized = true;
        console.log('✅ P2P Mesh inicializado');
    },

    generatePeerId() {
        return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    async announcePresence() {
        try {
            const myRecords = await this.getMyRecordIds();
            
            await fetch(`${this.signalServer}/api/p2p/announce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peerId: this.myPeerId,
                    country: this.country,
                    recordCount: myRecords.length,
                    recordIds: myRecords.slice(0, 100)
                })
            });
            
            console.log(`📡 Presencia anunciada: ${myRecords.length} registros`);
        } catch (error) {
            console.error('Error anunciando presencia:', error);
        }
    },

    async getMyRecordIds() {
        try {
            const data = await IndexedDBStorage.loadData(this.country);
            return data.records ? data.records.map(r => r.id) : [];
        } catch (error) {
            // Fallback a localStorage
            const data = Utils.getLocalData(this.country);
            return data.records ? data.records.map(r => r.id) : [];
        }
    },

    async connectToPeers() {
        try {
            const response = await fetch(`${this.signalServer}/api/p2p/peers?country=${this.country}`);
            const result = await response.json();
            
            const availablePeers = result.peers || [];
            console.log(`👥 Peers disponibles: ${availablePeers.length}`);
            
            // Conectar a algunos peers (no todos)
            const peersToConnect = availablePeers
                .filter(p => p !== this.myPeerId)
                .slice(0, this.config.maxPeers);
            
            for (const peerId of peersToConnect) {
                await this.connectToPeer(peerId);
            }
        } catch (error) {
            console.error('Error obteniendo peers:', error);
        }
    },

    async connectToPeer(peerId) {
        if (this.peers.has(peerId)) return;
        
        console.log(`🔗 Conectando a peer: ${peerId}`);
        
        // Crear conexión WebRTC
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Crear data channel
        const dc = pc.createDataChannel('data', {
            ordered: true,
            maxRetransmits: 3
        });

        this.setupDataChannel(dc, peerId);

        try {
            // Crear oferta
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Enviar oferta al servidor de señalización
            await fetch(`${this.signalServer}/api/p2p/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: peerId,
                    from: this.myPeerId,
                    signal: {
                        type: 'offer',
                        sdp: offer.sdp
                    }
                })
            });

            // Manejar ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    fetch(`${this.signalServer}/api/p2p/signal`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: peerId,
                            from: this.myPeerId,
                            signal: {
                                type: 'ice-candidate',
                                candidate: event.candidate
                            }
                        })
                    });
                }
            };

            this.peers.set(peerId, {
                connection: pc,
                dataChannel: dc,
                lastSeen: Date.now(),
                hasRecords: []
            });

        } catch (error) {
            console.error(`Error conectando a ${peerId}:`, error);
        }
    },

    setupDataChannel(dc, peerId) {
        dc.onopen = () => {
            console.log(`✅ Conectado a peer: ${peerId}`);
            this.requestPeerData(peerId);
        };

        dc.onclose = () => {
            console.log(`❌ Desconectado de peer: ${peerId}`);
            this.peers.delete(peerId);
        };

        dc.onmessage = (event) => {
            this.handlePeerMessage(peerId, event.data);
        };

        dc.onerror = (error) => {
            console.error(`Error en canal con ${peerId}:`, error);
        };
    },

    requestPeerData(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer || peer.dataChannel.readyState !== 'open') return;

        peer.dataChannel.send(JSON.stringify({
            type: 'request-data',
            country: this.country
        }));
    },

    async handlePeerMessage(peerId, message) {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'request-data':
                    await this.sendMyData(peerId);
                    break;
                
                case 'data-chunk':
                    await this.receiveDataChunk(peerId, data);
                    break;
                
                case 'data-complete':
                    console.log(`✅ Datos completos recibidos de ${peerId}`);
                    await this.mergeReceivedData(peerId);
                    break;
                
                case 'new-record':
                    await this.handleNewRecord(data.record);
                    break;
                
                case 'heartbeat':
                    this.handleHeartbeat(peerId);
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    },

    async sendMyData(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer || peer.dataChannel.readyState !== 'open') return;

        try {
            const data = await IndexedDBStorage.loadData(this.country);
            const dataStr = JSON.stringify(data.records || []);
            
            // Enviar por chunks
            const chunks = Math.ceil(dataStr.length / this.config.chunkSize);
            
            for (let i = 0; i < chunks; i++) {
                const start = i * this.config.chunkSize;
                const end = Math.min(start + this.config.chunkSize, dataStr.length);
                const chunk = dataStr.substring(start, end);
                
                peer.dataChannel.send(JSON.stringify({
                    type: 'data-chunk',
                    chunk,
                    index: i,
                    total: chunks
                }));
            }

            peer.dataChannel.send(JSON.stringify({
                type: 'data-complete',
                recordCount: data.records.length
            }));

            console.log(`📤 Enviados ${data.records.length} registros a ${peerId}`);
        } catch (error) {
            console.error('Error enviando datos:', error);
        }
    },

    async receiveDataChunk(peerId, data) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        if (!peer.receivingChunks) {
            peer.receivingChunks = {
                chunks: [],
                total: data.total
            };
        }

        peer.receivingChunks.chunks[data.index] = data.chunk;
    },

    async mergeReceivedData(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer || !peer.receivingChunks) return;

        try {
            const fullData = peer.receivingChunks.chunks.join('');
            const receivedRecords = JSON.parse(fullData);
            
            console.log(`📥 Recibidos ${receivedRecords.length} registros de ${peerId}`);
            
            // Merge con datos locales
            const localData = await IndexedDBStorage.loadData(this.country);
            const existingIds = new Set(localData.records.map(r => r.id));
            const newRecords = receivedRecords.filter(r => !existingIds.has(r.id));
            
            if (newRecords.length > 0) {
                localData.records.push(...newRecords);
                localData.lastUpdate = Date.now();
                
                await IndexedDBStorage.saveData(this.country, localData);
                
                console.log(`✅ ${newRecords.length} nuevos registros agregados`);
                
                // Actualizar UI
                if (typeof Filters !== 'undefined') {
                    Filters.setRecords(localData.records);
                }
                
                UI.showToast(`📥 ${newRecords.length} nuevos registros de la red P2P`, 'success');
            }
            
            // Limpiar
            delete peer.receivingChunks;
        } catch (error) {
            console.error('Error mergeando datos:', error);
        }
    },

    async handleNewRecord(record) {
        try {
            const localData = await IndexedDBStorage.loadData(this.country);
            const exists = localData.records.some(r => r.id === record.id);
            
            if (!exists) {
                localData.records.push(record);
                localData.lastUpdate = Date.now();
                
                await IndexedDBStorage.saveData(this.country, localData);
                
                console.log(`✅ Nuevo registro recibido: ${record.id}`);
                
                // Actualizar UI
                if (typeof Filters !== 'undefined') {
                    Filters.setRecords(localData.records);
                }
                
                // Propagar a otros peers
                this.broadcastNewRecord(record);
            }
        } catch (error) {
            console.error('Error manejando nuevo registro:', error);
        }
    },

    async broadcastNewRecord(record) {
        const message = JSON.stringify({
            type: 'new-record',
            record
        });

        for (const [peerId, peer] of this.peers.entries()) {
            if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
                try {
                    peer.dataChannel.send(message);
                } catch (error) {
                    console.error(`Error broadcasting a ${peerId}:`, error);
                }
            }
        }
    },

    sendHeartbeat() {
        const message = JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
        });

        for (const [peerId, peer] of this.peers.entries()) {
            if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
                try {
                    peer.dataChannel.send(message);
                } catch (error) {
                    console.error(`Error enviando heartbeat a ${peerId}:`, error);
                }
            }
        }
    },

    handleHeartbeat(peerId) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.lastSeen = Date.now();
        }
    },

    async syncWithPeers() {
        console.log('🔄 Sincronizando con peers...');
        
        // Re-anunciar presencia
        await this.announcePresence();
        
        // Limpiar peers inactivos
        const now = Date.now();
        const timeout = 60000; // 1 minuto
        
        for (const [peerId, peer] of this.peers.entries()) {
            if (now - peer.lastSeen > timeout) {
                console.log(`⏱️ Peer inactivo: ${peerId}`);
                if (peer.connection) peer.connection.close();
                this.peers.delete(peerId);
            }
        }
        
        // Conectar a nuevos peers si hay pocos
        if (this.peers.size < this.config.maxPeers) {
            await this.connectToPeers();
        }
    },

    disconnect() {
        console.log('🔌 Desconectando P2P Mesh...');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        for (const [peerId, peer] of this.peers.entries()) {
            if (peer.connection) {
                peer.connection.close();
            }
        }
        
        this.peers.clear();
        this.isInitialized = false;
    },

    getStats() {
        return {
            peerId: this.myPeerId,
            country: this.country,
            connectedPeers: this.peers.size,
            peers: Array.from(this.peers.keys())
        };
    }
};

// Exportar globalmente
window.P2PMesh = P2PMesh;
