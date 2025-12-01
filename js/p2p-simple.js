// ============================================
// SOLO ANUNCIO - DATOS EN INDEXEDDB
// ============================================

const P2PSimple = {
    country: null,
    myPeerId: null,
    syncInterval: null,
    isInitialized: false,

    async init(country) {
        if (this.isInitialized) return;
        
        this.country = country;
        this.myPeerId = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📢 Anunciando presencia para ${country}`);
        
        // Anunciar cada 60 segundos
        this.announce();
        this.syncInterval = setInterval(() => {
            this.announce();
        }, 60000);
        
        this.isInitialized = true;
    },

    async announce() {
        try {
            // Obtener cuántos registros tengo localmente
            const myData = await IndexedDBStorage.loadData(this.country);
            const myCount = myData.records?.length || 0;
            
            // Anunciar al servidor (solo números, no datos)
            const response = await fetch(`${API.baseURL}/api/announce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country: this.country,
                    peerId: this.myPeerId,
                    recordCount: myCount
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`📊 Red: ${result.totalPeers} peers, ${result.totalRecordsInNetwork} registros totales`);
                console.log(`💾 Local: ${myCount} registros en IndexedDB`);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo anunciar');
        }
    },

    async forceSync() {
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
            isInitialized: this.isInitialized
        };
    }
};

window.P2PSimple = P2PSimple;
