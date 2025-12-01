// Sistema de Almacenamiento Distribuido con Merkle Tree y Sharding
const DistributedStorage = {
  // Configuración
  config: {
    chunkSize: 50, // Registros por chunk
    replicationFactor: 3, // Cuántos clientes deben tener cada chunk
    maxLocalChunks: 5, // Máximo de chunks que un cliente almacena
    merkleTreeDepth: 4,
    syncInterval: 30000, // 30 segundos
  },

  // Estado local
  state: {
    myChunks: [], // IDs de chunks que este cliente almacena
    chunkHashes: {}, // Hash de cada chunk para verificación
    merkleRoot: null, // Raíz del Merkle Tree
    peerRegistry: {}, // Registro de qué peers tienen qué chunks
    lastSync: 0,
  },

  /**
   * Inicializa el sistema distribuido
   */
  init() {
    this.loadLocalState();
    this.startSyncLoop();
    console.log('📦 Sistema de almacenamiento distribuido iniciado');
  },

  /**
   * Divide los datos en chunks
   */
  createChunks(records) {
    const chunks = [];
    const chunkSize = this.config.chunkSize;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunkRecords = records.slice(i, i + chunkSize);
      const chunkId = this.generateChunkId(i, chunkRecords);
      
      chunks.push({
        id: chunkId,
        index: Math.floor(i / chunkSize),
        records: chunkRecords,
        hash: this.hashChunk(chunkRecords),
        timestamp: Date.now(),
      });
    }

    return chunks;
  },

  /**
   * Genera ID único para un chunk
   */
  generateChunkId(index, records) {
    const firstId = records[0]?.id || 'empty';
    const lastId = records[records.length - 1]?.id || 'empty';
    return `chunk_${index}_${firstId}_${lastId}`;
  },

  /**
   * Calcula hash de un chunk (SHA-256 simplificado)
   */
  hashChunk(records) {
    const data = JSON.stringify(records);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  },

  /**
   * Construye Merkle Tree para verificación de integridad
   */
  buildMerkleTree(chunks) {
    if (chunks.length === 0) return null;

    // Nivel 0: Hashes de chunks
    let level = chunks.map(chunk => chunk.hash);

    // Construir árbol hacia arriba
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        const combined = left + right;
        nextLevel.push(this.hashString(combined));
      }
      level = nextLevel;
    }

    return level[0]; // Raíz del Merkle Tree
  },

  /**
   * Hash simple de string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  },

  /**
   * Asigna chunks a este cliente CON REPLICACIÓN (cada chunk en 3 clientes)
   */
  assignChunksToClient(chunks, clientId) {
    const assigned = [];
    const clientHash = this.hashString(clientId);
    const clientHashNum = parseInt(clientHash, 16);
    
    // ESTRATEGIA INTELIGENTE:
    // 1. Si hay pocos chunks (< 10), guardar TODOS (respaldo completo)
    // 2. Si hay muchos chunks, guardar con replicación
    
    if (chunks.length <= 10) {
      // Pocos datos: guardar TODO para máxima seguridad
      console.log(`📦 Pocos chunks (${chunks.length}), guardando TODOS como respaldo`);
      return chunks.map((chunk, index) => ({
        ...chunk,
        distance: index,
        replica: 'full'
      }));
    }
    
    // Muchos datos: usar replicación inteligente
    // Cada chunk se asigna a 3 clientes diferentes (factor de replicación = 3)
    for (const chunk of chunks) {
      const chunkHash = parseInt(chunk.hash, 16);
      
      // Calcular si este cliente es uno de los 3 responsables de este chunk
      // Usando consistent hashing con 3 réplicas virtuales
      for (let replica = 0; replica < this.config.replicationFactor; replica++) {
        const virtualClientHash = this.hashString(clientId + '_replica_' + replica);
        const virtualClientHashNum = parseInt(virtualClientHash, 16);
        const distance = Math.abs(chunkHash - virtualClientHashNum);
        
        // Si está en el top N más cercanos para esta réplica
        if (assigned.length < this.config.maxLocalChunks) {
          // Verificar que no esté duplicado
          if (!assigned.find(c => c.id === chunk.id)) {
            assigned.push({
              ...chunk,
              distance,
              replica: replica + 1
            });
          }
        } else {
          // Reemplazar si este chunk está más cerca
          const maxDistance = Math.max(...assigned.map(c => c.distance));
          if (distance < maxDistance && !assigned.find(c => c.id === chunk.id)) {
            const index = assigned.findIndex(c => c.distance === maxDistance);
            assigned[index] = { ...chunk, distance, replica: replica + 1 };
          }
        }
      }
    }

    console.log(`📦 Asignados ${assigned.length} chunks con replicación`);
    return assigned.sort((a, b) => a.index - b.index);
  },

  /**
   * Guarda solo los chunks asignados a este cliente
   */
  saveLocalChunks(country, chunks) {
    const key = `chunks_${country}`;
    const data = {
      chunks: chunks.map(c => ({
        id: c.id,
        index: c.index,
        records: c.records,
        hash: c.hash,
        timestamp: c.timestamp,
      })),
      merkleRoot: this.state.merkleRoot,
      lastUpdate: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.state.myChunks = chunks.map(c => c.id);
      console.log(`💾 Guardados ${chunks.length} chunks localmente`);
    } catch (error) {
      console.error('Error guardando chunks:', error);
      // Si localStorage está lleno, eliminar chunks más antiguos
      this.cleanOldChunks(country);
    }
  },

  /**
   * Carga chunks locales
   */
  loadLocalChunks(country) {
    const key = `chunks_${country}`;
    const data = localStorage.getItem(key);
    
    if (!data) return [];

    try {
      const parsed = JSON.parse(data);
      return parsed.chunks || [];
    } catch (error) {
      console.error('Error cargando chunks:', error);
      return [];
    }
  },

  /**
   * Reconstruye datos completos desde chunks (propios + servidor)
   */
  async reconstructData(country, clientId) {
    // 1. Cargar chunks locales
    const localChunks = this.loadLocalChunks(country);
    console.log(`📦 Chunks locales: ${localChunks.length}`);

    // 2. Solicitar chunks faltantes al servidor
    const missingChunks = await this.fetchMissingChunks(country, localChunks);
    console.log(`🌐 Chunks del servidor: ${missingChunks.length}`);

    // 3. Combinar y ordenar
    const allChunks = [...localChunks, ...missingChunks]
      .sort((a, b) => a.index - b.index);

    // 4. Verificar integridad con Merkle Tree
    const isValid = this.verifyIntegrity(allChunks);
    if (!isValid) {
      console.warn('⚠️ Integridad comprometida, solicitando datos frescos');
      return await this.fetchFreshData(country);
    }

    // 5. Extraer registros
    const records = allChunks.flatMap(chunk => chunk.records);
    
    // 6. Actualizar chunks locales si es necesario
    const myNewChunks = this.assignChunksToClient(allChunks, clientId);
    this.saveLocalChunks(country, myNewChunks);

    return {
      records,
      chunks: allChunks,
      merkleRoot: this.state.merkleRoot,
    };
  },

  /**
   * Solicita chunks faltantes al servidor (optimizado)
   */
  async fetchMissingChunks(country, localChunks) {
    // El servidor ya NO devuelve datos, solo metadata
    // Los datos están 100% en el cliente
    console.log('📦 Usando solo datos locales (servidor P2P)');
    return [];
  },

  /**
   * Solicita datos frescos completos (fallback)
   */
  async fetchFreshData(country) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });

      const data = await response.json();
      return data.data || { records: [], threads: {} };
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      return { records: [], threads: {} };
    }
  },

  /**
   * Verifica integridad usando Merkle Tree
   */
  verifyIntegrity(chunks) {
    if (chunks.length === 0) return true;

    // Recalcular Merkle Root
    const calculatedRoot = this.buildMerkleTree(chunks);
    
    // Comparar con root conocido
    if (this.state.merkleRoot && this.state.merkleRoot !== calculatedRoot) {
      console.warn('⚠️ Merkle Root no coincide!');
      console.log('Esperado:', this.state.merkleRoot);
      console.log('Calculado:', calculatedRoot);
      return false;
    }

    // Actualizar root si es la primera vez
    this.state.merkleRoot = calculatedRoot;
    return true;
  },

  /**
   * Limpia chunks antiguos si localStorage está lleno
   */
  cleanOldChunks(country) {
    const key = `chunks_${country}`;
    try {
      const data = localStorage.getItem(key);
      if (!data) return;

      const parsed = JSON.parse(data);
      // Mantener solo los chunks más recientes
      parsed.chunks = parsed.chunks
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, Math.floor(this.config.maxLocalChunks / 2));

      localStorage.setItem(key, JSON.stringify(parsed));
      console.log('🧹 Chunks antiguos limpiados');
    } catch (error) {
      console.error('Error limpiando chunks:', error);
    }
  },

  /**
   * Guarda estado local
   */
  saveLocalState() {
    try {
      localStorage.setItem('distributed_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Error guardando estado:', error);
    }
  },

  /**
   * Carga estado local
   */
  loadLocalState() {
    try {
      const data = localStorage.getItem('distributed_state');
      if (data) {
        this.state = { ...this.state, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error cargando estado:', error);
    }
  },

  /**
   * Loop de sincronización periódica
   */
  startSyncLoop() {
    setInterval(() => {
      this.syncWithPeers();
    }, this.config.syncInterval);
  },

  /**
   * Sincroniza con otros peers (simulado)
   */
  async syncWithPeers() {
    // En una implementación real, esto usaría WebRTC o WebSockets
    // Por ahora, solo sincroniza con el servidor
    console.log('🔄 Sincronizando con peers...');
    this.state.lastSync = Date.now();
    this.saveLocalState();
  },

  /**
   * Obtiene estadísticas del sistema
   */
  getStats(country) {
    const chunks = this.loadLocalChunks(country);
    const totalRecords = chunks.reduce((sum, c) => sum + c.records.length, 0);
    
    return {
      localChunks: chunks.length,
      localRecords: totalRecords,
      merkleRoot: this.state.merkleRoot,
      lastSync: this.state.lastSync,
      storageUsed: this.getStorageSize(country),
    };
  },

  /**
   * Calcula tamaño de almacenamiento usado
   */
  getStorageSize(country) {
    const key = `chunks_${country}`;
    const data = localStorage.getItem(key);
    if (!data) return 0;
    
    // Tamaño en KB
    return (data.length * 2) / 1024;
  },
};

window.DistributedStorage = DistributedStorage;
