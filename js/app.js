// Aplicación principal
const App = {
  currentCountry: 'PE',
  currentRecordId: null,
  userId: null,

  // Helper para cargar datos SIEMPRE desde IndexedDB primero
  async loadDataSafe(country) {
    let data = { records: [], threads: {} };
    
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        data = await IndexedDBStorage.loadData(country);
      } catch (error) {
        console.error('Error cargando desde IndexedDB:', error);
        data = Utils.getLocalData(country);
      }
    } else {
      data = Utils.getLocalData(country);
    }
    
    // Asegurar estructura
    if (!data.records) data.records = [];
    if (!data.threads) data.threads = {};
    
    return data;
  },
  
  // Helper para guardar datos SIEMPRE en ambos lugares
  async saveDataSafe(country, data) {
    // Guardar en IndexedDB
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        await IndexedDBStorage.saveData(country, data);
      } catch (error) {
        console.error('Error guardando en IndexedDB:', error);
      }
    }
    
    // Guardar en localStorage (backup)
    Utils.saveLocalData(country, data);
  },

  async init() {
    this.userId = Utils.getUserId();
    
    // Inicializar IndexedDB
    try {
      await IndexedDBStorage.init();
      
      // Migrar datos de localStorage a IndexedDB (solo una vez)
      if (!localStorage.getItem('indexeddb_migrated')) {
        await IndexedDBStorage.migrateFromLocalStorage();
      }
    } catch (error) {
      console.error('Error inicializando IndexedDB:', error);
      UI.showToast('⚠️ Usando almacenamiento de respaldo', 'info');
    }
    
    const countryDetected = await this.detectAndSetCountry();
    
    // Si no se detectó el país, ocultar loading y salir
    if (!countryDetected) {
      this.hideLoadingScreen();
      return;
    }
    
    // Limpiar duplicados al iniciar (solo una vez por sesión)
    if (!sessionStorage.getItem('dedup_done')) {
      console.log('🧹 Limpiando duplicados...');
      Deduplicator.cleanAllLocalStorage();
      sessionStorage.setItem('dedup_done', 'true');
    }
    
    // Inicializar solo si estamos en la página principal
    if (typeof Filters !== 'undefined') {
      Filters.init(); // Inicializar sistema de filtros
    }
    if (typeof Pagination !== 'undefined') {
      Pagination.init(); // Inicializar sistema de paginación
    }
    
    // Cargar datos locales INMEDIATAMENTE (sin esperar sincronización)
    await this.loadLocalData();
    this.setupEventListeners();
    
    // Ocultar loading screen SIEMPRE
    this.hideLoadingScreen();
    
    // Sincronizar con servidor en BACKGROUND (no bloquear)
    this.syncWithServer().catch(error => {
      console.log('Sync en background falló:', error);
    });
    
    // Inicializar sincronización entre pestañas
    if (typeof TabSync !== 'undefined') {
      TabSync.init(this.currentCountry);
    }
    
    // Inicializar P2P Mesh en background
    // Los errores son normales hasta que el servidor se actualice
    if (typeof P2PMesh !== 'undefined') {
      P2PMesh.init(this.currentCountry).catch(error => {
        console.log('P2P Mesh esperando servidor actualizado...');
      });
    }
  },

  hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      // Remover del DOM después de la animación
      setTimeout(() => {
        loadingOverlay.remove();
      }, 300);
    }
  },

  async detectAndSetCountry() {
    const savedCountry = localStorage.getItem('selectedCountry');
    
    if (savedCountry) {
      this.currentCountry = savedCountry;
      const countrySelect = document.getElementById('country-select');
      if (countrySelect) {
        countrySelect.value = savedCountry;
      }
      return true;
    }
    
    // Intentar detectar país
    UI.showToast('🌍 Detectando tu ubicación...', 'info');
    
    try {
      const detectedCountry = await Utils.detectCountryByIP();
      this.currentCountry = detectedCountry;
      const countrySelect = document.getElementById('country-select');
      if (countrySelect) {
        countrySelect.value = detectedCountry;
      }
      localStorage.setItem('selectedCountry', detectedCountry);
      UI.showToast(`📍 País detectado: ${this.getCountryName(detectedCountry)}`, 'success');
      return true;
    } catch (error) {
      console.log('Could not detect country - GeoBlock will handle it');
      // GeoBlock ya manejó el error y mostró el mensaje
      return false;
    }
  },

  getCountryName(code) {
    const countries = {
      'PE': 'Perú',
      'MX': 'México',
      'CO': 'Colombia',
      'AR': 'Argentina',
      'CL': 'Chile',
      'ES': 'España',
      'VE': 'Venezuela',
      'EC': 'Ecuador',
      'BO': 'Bolivia',
      'PY': 'Paraguay',
      'UY': 'Uruguay',
      'CR': 'Costa Rica',
      'PA': 'Panamá',
      'GT': 'Guatemala',
      'HN': 'Honduras',
      'SV': 'El Salvador',
      'NI': 'Nicaragua',
      'DO': 'República Dominicana',
      'CU': 'Cuba',
      'PR': 'Puerto Rico'
    };
    return countries[code] || code;
  },

  setupEventListeners() {
    document.getElementById('country-select').addEventListener('change', (e) => {
      this.currentCountry = e.target.value;
      localStorage.setItem('selectedCountry', this.currentCountry);
      this.loadLocalData();
      this.syncWithServer();
      UI.showToast(`Cambiado a ${this.getCountryName(this.currentCountry)}`, 'info');
    });

    // Solo agregar listeners si los elementos existen (no todos están en todas las páginas)
    const btnNewRecord = document.getElementById('btn-new-record');
    if (btnNewRecord) {
      btnNewRecord.addEventListener('click', () => {
        UI.openModal('new-record');
      });
    }

    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        // Deshabilitar botón y mostrar animación
        btnSync.disabled = true;
        const originalHTML = btnSync.innerHTML;
        btnSync.innerHTML = '🔄 Sincronizando...';
        btnSync.style.opacity = '0.6';
        btnSync.style.cursor = 'wait';
        
        try {
          await this.syncWithServer();
          
          // Feedback de éxito
          btnSync.innerHTML = '✅ Sincronizado';
          btnSync.style.opacity = '1';
          
          // Restaurar después de 2 segundos
          setTimeout(() => {
            btnSync.innerHTML = originalHTML;
            btnSync.disabled = false;
            btnSync.style.cursor = 'pointer';
          }, 2000);
        } catch (error) {
          // Feedback de error
          btnSync.innerHTML = '❌ Error';
          btnSync.style.opacity = '1';
          
          setTimeout(() => {
            btnSync.innerHTML = originalHTML;
            btnSync.disabled = false;
            btnSync.style.cursor = 'pointer';
          }, 2000);
        }
      });
    }

    const formNewRecord = document.getElementById('form-new-record');
    if (formNewRecord) {
      formNewRecord.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitNewRecord(e.target);
      });
    }

    const formComment = document.getElementById('form-comment');
    if (formComment) {
      formComment.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitComment(e.target);
      });
    }

    const btnApprove = document.getElementById('btn-approve');
    if (btnApprove) {
      btnApprove.addEventListener('click', () => {
        this.vote('approve');
      });
    }

    const btnReject = document.getElementById('btn-reject');
    if (btnReject) {
      btnReject.addEventListener('click', () => {
        this.vote('reject');
      });
    }
  },

  async loadLocalData() {
    let data = { records: [], threads: {} };
    const startTime = performance.now();
    
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        // Detectar modo de almacenamiento
        const storageMode = await IndexedDBStorage.loadMetadata('storage_mode_' + this.currentCountry);
        
        if (storageMode === 'distributed') {
          // MODO CHUNKS: Cargar índice rápido primero
          console.log('📦 MODO CHUNKS: Cargando índice...');
          const recordIndex = await IndexedDBStorage.loadMetadata('record_index_' + this.currentCountry);
          
          if (recordIndex && recordIndex.length > 0) {
            const loadTime = Math.round(performance.now() - startTime);
            console.log(`⚡ ${recordIndex.length} registros (índice) cargados en ${loadTime}ms`);
            
            // Mostrar índice inmediatamente
            if (typeof Filters !== 'undefined') {
              Filters.setRecords(recordIndex);
            }
            
            // Reconstruir datos completos en background
            this.reconstructFromChunksBackground();
          }
          
        } else {
          // MODO COMPLETO: Cargar todo
          const idbData = await IndexedDBStorage.loadData(this.currentCountry);
          
          if (idbData && idbData.records && idbData.records.length > 0) {
            const loadTime = Math.round(performance.now() - startTime);
            console.log(`✅ ${idbData.records.length} registros cargados en ${loadTime}ms`);
            data = idbData;
            
            if (typeof Filters !== 'undefined') {
              Filters.setRecords(data.records);
            }
            return;
          }
        }
        
      } catch (error) {
        console.error('Error cargando desde IndexedDB:', error);
      }
    }
    
    // Fallback: localStorage
    console.log('📦 Fallback: Cargando desde localStorage...');
    data = Utils.getLocalData(this.currentCountry);
    
    if (data.records && data.records.length > 0) {
      console.log(`✅ ${data.records.length} registros cargados desde localStorage`);
      if (typeof Filters !== 'undefined') {
        Filters.setRecords(data.records);
      }
    } else {
      console.log('⚠️ No hay datos locales, esperando sincronización...');
    }
  },

  async reconstructFromChunksBackground() {
    try {
      console.log('🔄 Reconstruyendo datos completos desde chunks (background)...');
      
      const reconstructed = await DistributedStorage.reconstructData(
        this.currentCountry,
        this.userId
      );
      
      if (reconstructed && reconstructed.records && reconstructed.records.length > 0) {
        console.log(`✅ ${reconstructed.records.length} registros reconstruidos`);
        
        // Actualizar UI con datos completos
        if (typeof Filters !== 'undefined') {
          Filters.setRecords(reconstructed.records);
        }
      }
    } catch (error) {
      console.error('Error reconstruyendo chunks:', error);
    }
  },



  async reconstructFromChunks() {
    try {
      console.log('🔄 Reconstruyendo datos desde chunks distribuidos...');
      
      // 1. Cargar mis chunks locales
      const myChunkIds = await IndexedDBStorage.loadMetadata('my_chunks_' + this.currentCountry);
      const localChunks = [];
      
      for (const chunkId of myChunkIds || []) {
        const chunk = await IndexedDBStorage.loadChunk(chunkId);
        if (chunk) {
          localChunks.push(chunk);
        }
      }
      
      console.log(`📦 Chunks locales: ${localChunks.length}`);
      
      // 2. Solicitar chunks faltantes al servidor
      const reconstructed = await DistributedStorage.reconstructData(
        this.currentCountry,
        this.userId
      );
      
      if (reconstructed && reconstructed.records) {
        console.log(`✅ ${reconstructed.records.length} registros reconstruidos`);
        
        // Verificar integridad con Merkle Root
        const expectedRoot = await IndexedDBStorage.loadMetadata('merkle_root_' + this.currentCountry);
        const allChunks = DistributedStorage.createChunks(reconstructed.records);
        const calculatedRoot = DistributedStorage.buildMerkleTree(allChunks);
        
        if (expectedRoot === calculatedRoot) {
          console.log('✅ Integridad verificada (Merkle Root coincide)');
        } else {
          console.warn('⚠️ Advertencia: Merkle Root no coincide');
        }
        
        return {
          records: reconstructed.records,
          threads: {},
          lastUpdate: Date.now()
        };
      }
      
      return { records: [], threads: {} };
    } catch (error) {
      console.error('Error reconstruyendo chunks:', error);
      return { records: [], threads: {} };
    }
  },

  async submitNewRecord(form) {
    // Deshabilitar botón y mostrar loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Publicando...';
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';

    const formData = new FormData(form);
    const allowFieldEdits = formData.get('allowFieldEdits') === 'on';
    const commentCooldown = parseInt(formData.get('commentCooldown')) || 3600000; // 1 hora por defecto
    
    const record = {
      nombres: formData.get('nombres').trim(),
      apellidos: formData.get('apellidos').trim(),
      foto: formData.get('foto').trim(),
      instagram: formData.get('instagram').trim(),
      departamento: formData.get('departamento').trim(),
      distrito: formData.get('distrito').trim(),
      edad: parseInt(formData.get('edad')),
      ocupacion: formData.get('ocupacion').trim(),
      ets: formData.get('ets'),
      tiempoRelacion: formData.get('tiempoRelacion').trim(),
      periodoInfidelidad: formData.get('periodoInfidelidad').trim(),
      datosAdicionales: formData.get('datosAdicionales').trim(),
      pruebas: Utils.parseProofs(formData.get('pruebas')),
      commentCooldown: commentCooldown // Guardar cooldown configurado
    };

    const errors = Utils.validateRecord(record);
    if (errors.length > 0) {
      UI.showToast(errors[0], 'error');
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      return;
    }

    try {
      const result = await API.submitRecord(this.currentCountry, record);
      
      record.id = result.recordId;
      record.createdAt = Date.now();
      record.creatorId = this.userId;
      
      // Solo permitir ediciones si el usuario lo activó
      if (allowFieldEdits) {
        record.editableFields = ['ocupacion', 'ets', 'tiempoRelacion', 'periodoInfidelidad', 'datosAdicionales', 'instagram'];
      } else {
        record.editableFields = [];
      }
      
      // CRÍTICO: Cargar datos de forma segura
      const data = await this.loadDataSafe(this.currentCountry);
      
      console.log(`📊 Antes de agregar: ${data.records.length} registros`);
      
      data.records.push(record);
      data.threads[record.id] = { 
        comments: [], 
        votes: { approve: 0, reject: 0 },
        fieldProposals: {}
      };
      data.lastUpdate = Date.now();
      
      console.log(`📊 Después de agregar: ${data.records.length} registros`);
      
      // Guardar de forma segura
      await this.saveDataSafe(this.currentCountry, data);
      
      // Actualizar UI
      if (typeof Filters !== 'undefined') {
        Filters.setRecords(data.records);
      } else {
        UI.renderTable(data.records);
      }
      
      UI.closeModal();
      UI.showToast('✅ Infiel publicado exitosamente', 'success');
      this.syncWithServer();
      
      // Notificar a otras pestañas
      if (typeof TabSync !== 'undefined') {
        TabSync.notifyNewRecord(record, this.currentCountry);
      }
      
      // Broadcast a red P2P
      if (typeof P2PMesh !== 'undefined' && P2PMesh.isInitialized) {
        P2PMesh.broadcastNewRecord(record);
      }
      
      // Restaurar botón (aunque el modal se cierra, por si acaso)
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } catch (error) {
      // Restaurar botón en caso de error
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      
      // Manejar errores específicos de rate limiting y duplicados
      if (error.status === 429) {
        UI.showToast(error.message || '⏱️ Debes esperar antes de publicar otro infiel', 'error');
      } else if (error.status === 409) {
        UI.showToast(error.message || '❌ Contenido duplicado detectado', 'error');
      } else {
        UI.showToast(error.message || 'Error al crear el registro', 'error');
      }
    }
  },

  async openThread(recordId) {
    this.currentRecordId = recordId;
    
    // Cargar datos desde IndexedDB primero
    let data = { records: [], threads: {} };
    
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        data = await IndexedDBStorage.loadData(this.currentCountry);
      } catch (error) {
        console.error('Error cargando desde IndexedDB:', error);
        data = Utils.getLocalData(this.currentCountry);
      }
    } else {
      data = Utils.getLocalData(this.currentCountry);
    }
    
    let record = data.records.find(r => r.id === recordId);
    
    // Si no está en IndexedDB, intentar sincronizar
    if (!record) {
      UI.showToast('🔄 Buscando registro...', 'info');
      
      try {
        // Sincronizar con servidor
        const result = await API.sync(this.currentCountry, data);
        if (result && result.records) {
          if (typeof IndexedDBStorage !== 'undefined') {
            await IndexedDBStorage.saveData(this.currentCountry, result);
          } else {
            Utils.saveLocalData(this.currentCountry, result);
          }
          data = result;
          record = data.records.find(r => r.id === recordId);
        }
      } catch (error) {
        console.error('Error sincronizando:', error);
      }
    }
    
    const thread = data.threads[recordId] || { comments: [], votes: { approve: 0, reject: 0 } };

    if (!record) {
      UI.showToast('Registro no encontrado. Intenta sincronizar.', 'error');
      return;
    }

    document.getElementById('thread-title').textContent = `${record.nombres} ${record.apellidos}`;
    document.getElementById('thread-info').innerHTML = UI.renderThreadInfo(record);
    document.getElementById('approve-count').textContent = thread.votes.approve || 0;
    document.getElementById('reject-count').textContent = thread.votes.reject || 0;
    
    // Renderizar balanza visual
    this.renderModalVoteBalance(thread.votes);
    
    // Renderizar solo 5 comentarios más recientes en el modal
    UI.renderComments(thread.comments, 5);
    
    // Verificar si el usuario ya votó
    this.checkAndUpdateVoteButtons(recordId);
    
    UI.openModal('thread');
  },

  renderModalVoteBalance(votes) {
    const balanceEl = document.getElementById('modal-vote-balance');
    const approve = votes.approve || 0;
    const reject = votes.reject || 0;
    const total = approve + reject;

    if (total === 0) {
      balanceEl.innerHTML = `
        <div class="balance-header">
          <div class="balance-verdict discusion">⚖️ Sin Votaciones</div>
          <div class="balance-subtitle">Sé el primero en votar</div>
        </div>
      `;
      return;
    }

    const approvePercent = (approve / total) * 100;
    const rejectPercent = (reject / total) * 100;

    let verdict, verdictClass, verdictIcon;
    if (approvePercent >= 70) {
      verdict = 'TOTALMENTE INFIEL';
      verdictClass = 'infiel';
      verdictIcon = '💔';
    } else if (rejectPercent >= 70) {
      verdict = 'TOTALMENTE FIEL';
      verdictClass = 'fiel';
      verdictIcon = '💚';
    } else {
      verdict = 'EN DISCUSIÓN';
      verdictClass = 'discusion';
      verdictIcon = '⚖️';
    }

    balanceEl.innerHTML = `
      <div class="balance-header">
        <div class="balance-verdict ${verdictClass}">${verdictIcon} ${verdict}</div>
        <div class="balance-subtitle">Basado en ${total} voto${total !== 1 ? 's' : ''} de la comunidad</div>
      </div>
      
      <div class="balance-bar-container">
        ${approvePercent > 0 ? `
          <div class="balance-bar" style="width: ${approvePercent}%">
            ${approvePercent >= 15 ? `${Math.round(approvePercent)}%` : ''}
          </div>
        ` : ''}
        ${rejectPercent > 0 ? `
          <div class="balance-bar reject-side" style="width: ${rejectPercent}%">
            ${rejectPercent >= 15 ? `${Math.round(rejectPercent)}%` : ''}
          </div>
        ` : ''}
      </div>
      
      <div class="balance-stats">
        <div class="balance-stat approve">
          <span class="balance-stat-icon">✓</span>
          <div>
            <div class="balance-stat-label">Infiel</div>
            <div class="balance-stat-value">${approve}</div>
          </div>
        </div>
        <div class="balance-stat reject">
          <span class="balance-stat-icon">✗</span>
          <div>
            <div class="balance-stat-label">Fiel</div>
            <div class="balance-stat-value">${reject}</div>
          </div>
        </div>
      </div>
    `;
  },

  checkAndUpdateVoteButtons(recordId) {
    const voteKey = `vote_${this.currentCountry}_${recordId}`;
    const hasVoted = localStorage.getItem(voteKey);
    
    const btnApprove = document.getElementById('btn-approve');
    const btnReject = document.getElementById('btn-reject');
    const voteContainer = btnApprove.parentElement;
    
    if (hasVoted) {
      // Ocultar botones y mostrar mensaje
      voteContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #999;">
          <p style="font-size: 16px; margin-bottom: 10px;">✓ Ya votaste en este caso</p>
          <p style="font-size: 14px;">Tu voto: <strong>${hasVoted === 'approve' ? 'Aprobado' : 'Refutado'}</strong></p>
        </div>
      `;
    } else {
      // Asegurarse de que los botones estén visibles y habilitados
      voteContainer.innerHTML = `
        <button id="btn-approve" class="vote-btn vote-approve">
          <span class="vote-icon">✓</span>
          <span class="vote-label">Aprobar</span>
          <span id="approve-count" class="vote-count">${document.getElementById('approve-count').textContent}</span>
        </button>
        <button id="btn-reject" class="vote-btn vote-reject">
          <span class="vote-icon">✗</span>
          <span class="vote-label">Refutar</span>
          <span id="reject-count" class="vote-count">${document.getElementById('reject-count').textContent}</span>
        </button>
      `;
      
      // Re-agregar event listeners
      document.getElementById('btn-approve').addEventListener('click', () => {
        this.vote('approve');
      });
      document.getElementById('btn-reject').addEventListener('click', () => {
        this.vote('reject');
      });
    }
  },

  async submitComment(form) {
    if (!this.currentRecordId) return;

    // Verificar rate limiting (validación del cliente)
    const rateLimitCheck = CommentRateLimit.canComment(this.currentRecordId, this.userId);
    if (!rateLimitCheck.allowed) {
      UI.showToast(`⏱️ Debes esperar ${rateLimitCheck.message} para comentar de nuevo`, 'error');
      return;
    }

    const formData = new FormData(form);
    const comment = formData.get('comment').trim();
    const proofs = Utils.parseProofs(formData.get('proofs'));

    if (!comment) {
      UI.showToast('El comentario no puede estar vacío', 'error');
      return;
    }

    // Deshabilitar botón y mostrar animación
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Publicando...';
    submitBtn.style.opacity = '0.6';

    try {
      const result = await API.submitComment(
        this.currentCountry,
        this.currentRecordId,
        comment,
        proofs,
        this.userId
      );

      // Cargar datos correctamente (IndexedDB o localStorage)
      let data = { records: [], threads: {} };
      if (typeof IndexedDBStorage !== 'undefined') {
        try {
          data = await IndexedDBStorage.loadData(this.currentCountry);
        } catch (error) {
          data = Utils.getLocalData(this.currentCountry);
        }
      } else {
        data = Utils.getLocalData(this.currentCountry);
      }
      
      // Asegurar que threads existe
      if (!data.threads) {
        data.threads = {};
      }
      
      data.threads[this.currentRecordId] = result.thread;
      data.lastUpdate = Date.now();
      
      // Guardar en ambos lugares
      if (typeof IndexedDBStorage !== 'undefined') {
        await IndexedDBStorage.saveData(this.currentCountry, data);
      }
      Utils.saveLocalData(this.currentCountry, data);
      
      // Registrar que el usuario comentó (rate limiting)
      CommentRateLimit.recordComment(this.currentRecordId, this.userId);
      
      // Notificar a otras pestañas
      if (typeof TabSync !== 'undefined') {
        TabSync.notifyNewComment(this.currentRecordId, result.thread, this.currentCountry);
      }
      
      // Renderizar solo 5 comentarios más recientes
      UI.renderComments(result.thread.comments, 5);
      form.reset();
      
      // Feedback de éxito
      submitBtn.innerHTML = '✅ Publicado';
      submitBtn.style.opacity = '1';
      UI.showToast('Comentario publicado', 'success');
      
      // Restaurar botón
      setTimeout(() => {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
      }, 2000);
    } catch (error) {
      // Restaurar botón en caso de error
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      
      // Manejar error de rate limiting del servidor
      if (error.status === 429) {
        UI.showToast(error.message || '⏱️ Debes esperar para comentar de nuevo', 'error');
      } else {
        UI.showToast(error.message || 'Error al publicar comentario', 'error');
      }
    }
  },

  async vote(voteType) {
    if (!this.currentRecordId) return;
    
    // Verificar si ya votó
    const voteKey = `vote_${this.currentCountry}_${this.currentRecordId}`;
    if (localStorage.getItem(voteKey)) {
      UI.showToast('Ya votaste en este caso', 'error');
      return;
    }
    
    // Deshabilitar botones para prevenir múltiples clicks
    const btnApprove = document.getElementById('btn-approve');
    const btnReject = document.getElementById('btn-reject');
    btnApprove.disabled = true;
    btnReject.disabled = true;

    try {
      const result = await API.vote(
        this.currentCountry,
        this.currentRecordId,
        voteType,
        this.userId
      );

      // Cargar datos correctamente
      let data = { records: [], threads: {} };
      if (typeof IndexedDBStorage !== 'undefined') {
        try {
          data = await IndexedDBStorage.loadData(this.currentCountry);
        } catch (error) {
          data = Utils.getLocalData(this.currentCountry);
        }
      } else {
        data = Utils.getLocalData(this.currentCountry);
      }
      
      if (!data.threads) {
        data.threads = {};
      }
      if (!data.threads[this.currentRecordId]) {
        data.threads[this.currentRecordId] = { comments: [], votes: { approve: 0, reject: 0 } };
      }
      
      data.threads[this.currentRecordId].votes = result.votes;
      data.lastUpdate = Date.now();
      
      // Guardar en ambos lugares
      if (typeof IndexedDBStorage !== 'undefined') {
        await IndexedDBStorage.saveData(this.currentCountry, data);
      }
      Utils.saveLocalData(this.currentCountry, data);
      
      // Guardar que el usuario ya votó
      localStorage.setItem(voteKey, voteType);
      
      // Notificar a otras pestañas
      if (typeof TabSync !== 'undefined') {
        TabSync.notifyNewVote(this.currentRecordId, result.votes, this.currentCountry);
      }
      
      document.getElementById('approve-count').textContent = result.votes.approve;
      document.getElementById('reject-count').textContent = result.votes.reject;
      
      // Actualizar balanza visual
      this.renderModalVoteBalance(result.votes);
      
      UI.showToast(
        voteType === 'approve' ? 'Voto de aprobación registrado' : 'Voto de refutación registrado',
        'success'
      );
      
      this.loadLocalData();
      
      // Ocultar botones y mostrar mensaje
      this.checkAndUpdateVoteButtons(this.currentRecordId);
    } catch (error) {
      UI.showToast(error.message || 'Error al registrar voto', 'error');
      // Rehabilitar botones en caso de error
      btnApprove.disabled = false;
      btnReject.disabled = false;
    }
  },

  async syncWithServer() {
    // Cargar datos de forma segura
    const localData = await this.loadDataSafe(this.currentCountry);
    console.log(`📊 Datos locales: ${localData.records.length} registros`);

    try {
      console.log(`🔄 Sincronizando con servidor (enviando ${localData.records.length} registros)...`);
      
      // 1. SINCRONIZAR CON SERVIDOR
      const result = await API.sync(
        this.currentCountry,
        localData,
        localData.lastUpdate
      );

      console.log(`📥 Servidor respondió con ${result.data?.records?.length || 0} registros`);

      // 2. MERGE INTELIGENTE (nunca perder datos)
      let mergedData = this.mergeData(localData, result.data);
      mergedData = Deduplicator.cleanCountryData(mergedData);
      mergedData.lastUpdate = Date.now();
      
      const totalRecords = mergedData.records.length;
      console.log(`✅ Total después de merge: ${totalRecords} registros`);
      
      // 3. SISTEMA HÍBRIDO CON CHUNKS REPLICADOS
      if (typeof IndexedDBStorage !== 'undefined' && typeof DistributedStorage !== 'undefined') {
        try {
          // Detectar capacidad del dispositivo
          const deviceMemory = navigator.deviceMemory || 4;
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          // Umbrales adaptativos
          let THRESHOLD;
          if (isMobile) {
            THRESHOLD = 1500;
          } else if (deviceMemory >= 8) {
            THRESHOLD = 3000;
          } else if (deviceMemory >= 4) {
            THRESHOLD = 2000;
          } else {
            THRESHOLD = 1000;
          }
          
          if (totalRecords < THRESHOLD) {
            // MODO COMPLETO: Guardar TODO (pocos datos)
            console.log(`💾 MODO COMPLETO: Guardando ${totalRecords} registros`);
            await IndexedDBStorage.saveData(this.currentCountry, mergedData);
            
          } else {
            // MODO CHUNKS REPLICADOS: Proteger contra pérdida
            console.log(`📦 MODO CHUNKS: ${totalRecords} registros (umbral: ${THRESHOLD})`);
            
            // Crear chunks
            const allChunks = DistributedStorage.createChunks(mergedData.records);
            console.log(`📦 ${allChunks.length} chunks creados (50 registros/chunk)`);
            
            // Asignar chunks CON REPLICACIÓN (factor 3)
            const myChunks = DistributedStorage.assignChunksToClient(allChunks, this.userId);
            console.log(`💾 Esta PC guardará ${myChunks.length} chunks (con replicación)`);
            
            // Guardar chunks en IndexedDB
            for (const chunk of myChunks) {
              await IndexedDBStorage.saveChunk({
                ...chunk,
                country: this.currentCountry
              });
            }
            
            // Guardar metadata
            const merkleRoot = DistributedStorage.buildMerkleTree(allChunks);
            await IndexedDBStorage.saveMetadata('merkle_root_' + this.currentCountry, merkleRoot);
            await IndexedDBStorage.saveMetadata('storage_mode_' + this.currentCountry, 'distributed');
            await IndexedDBStorage.saveMetadata('total_chunks_' + this.currentCountry, allChunks.length);
            await IndexedDBStorage.saveMetadata('total_records_' + this.currentCountry, totalRecords);
            await IndexedDBStorage.saveMetadata('my_chunks_' + this.currentCountry, myChunks.map(c => c.id));
            
            // Guardar índice ligero (solo IDs y nombres)
            const recordIndex = mergedData.records.map(r => ({
              id: r.id,
              nombres: r.nombres,
              apellidos: r.apellidos,
              edad: r.edad,
              departamento: r.departamento,
              createdAt: r.createdAt
            }));
            await IndexedDBStorage.saveMetadata('record_index_' + this.currentCountry, recordIndex);
            
            console.log(`✅ Sistema chunks activado: ${myChunks.length}/${allChunks.length} chunks guardados`);
            console.log(`📊 Ahorro de espacio: ${Math.round((1 - myChunks.length/allChunks.length) * 100)}%`);
          }
          
        } catch (error) {
          console.error('Error en sistema de chunks:', error);
          // Fallback: guardar todo
          await IndexedDBStorage.saveData(this.currentCountry, mergedData);
        }
      } else {
        // Sin IndexedDB, usar localStorage
        Utils.saveLocalData(this.currentCountry, mergedData);
      }
      
      // Recargar datos
      await this.loadLocalData();
      
      // FORZAR actualización de UI (especialmente para Brave)
      // Brave tiene problemas con IndexedDB y actualización de DOM
      if (typeof Filters !== 'undefined' && typeof Pagination !== 'undefined') {
        // Esperar a que IndexedDB termine de escribir
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Forzar re-renderizado completo
        Filters.setRecords(mergedData.records);
        
        console.log(`🔄 UI actualizada con ${mergedData.records.length} registros`);
      }
      
      UI.showToast(`✅ ${mergedData.records.length} registros sincronizados`, 'success');
    } catch (error) {
      console.error('Error en sincronización:', error);
      UI.showToast('Error de conexión. Trabajando en modo offline', 'error');
      throw error; // Re-lanzar para que el botón muestre error
    }
  },

  mergeData(localData, serverData) {
    const localCount = localData.records?.length || 0;
    const serverCount = serverData.records?.length || 0;
    
    console.log(`📊 Merge: Local=${localCount}, Servidor=${serverCount}`);
    
    // VALIDACIÓN: Si el servidor tiene MENOS datos que el cliente
    // probablemente se reinició y perdió datos
    if (serverCount > 0 && localCount > serverCount) {
      const difference = localCount - serverCount;
      const percentageLoss = (difference / localCount) * 100;
      
      // Si perdió más del 10% de datos, es sospechoso
      if (percentageLoss > 10) {
        console.warn(`⚠️ ALERTA: Servidor tiene ${difference} registros menos (${percentageLoss.toFixed(1)}% pérdida)`);
        console.warn(`⚠️ Posible reinicio del servidor. Manteniendo datos locales.`);
        
        // Mantener datos locales y agregar solo nuevos del servidor
        const merged = {
          records: [...localData.records],
          threads: { ...localData.threads },
          lastUpdate: Math.max(localData.lastUpdate || 0, serverData.lastUpdate || 0)
        };
        
        // Agregar solo registros NUEVOS del servidor (que no tenemos)
        const localRecordsMap = new Map(localData.records.map(r => [r.id, r]));
        serverData.records.forEach(serverRecord => {
          if (!localRecordsMap.has(serverRecord.id)) {
            console.log(`✅ Nuevo registro del servidor: ${serverRecord.nombres} ${serverRecord.apellidos}`);
            merged.records.push(serverRecord);
          }
        });
        
        // Merge threads
        Object.keys(serverData.threads).forEach(recordId => {
          if (!merged.threads[recordId]) {
            merged.threads[recordId] = serverData.threads[recordId];
          }
        });
        
        console.log(`✅ Merge protegido: ${merged.records.length} registros totales`);
        return merged;
      }
    }
    
    // MERGE NORMAL: Servidor tiene más o igual datos
    const merged = {
      records: [],
      threads: {},
      lastUpdate: serverData.lastUpdate
    };

    // Crear mapa de registros del servidor
    const serverRecordsMap = new Map(serverData.records.map(r => [r.id, r]));
    
    // Agregar todos los registros del servidor
    merged.records = [...serverData.records];
    
    // Agregar registros locales que no están en el servidor (pendientes de sync)
    localData.records.forEach(localRecord => {
      if (!serverRecordsMap.has(localRecord.id)) {
        console.log(`✅ Registro local no sincronizado: ${localRecord.nombres} ${localRecord.apellidos}`);
        merged.records.push(localRecord);
      }
    });

    // Merge de threads
    merged.threads = { ...serverData.threads };
    
    // Agregar threads locales que no están en el servidor
    Object.keys(localData.threads).forEach(recordId => {
      if (!merged.threads[recordId]) {
        merged.threads[recordId] = localData.threads[recordId];
      }
    });

    console.log(`✅ Merge normal: ${merged.records.length} registros totales`);
    return merged;
  },

  viewDetails(recordId) {
    window.location.href = `/details.html?id=${recordId}&country=${this.currentCountry}`;
  }
};

// Hacer disponible globalmente
window.App = App;

// Inicializar cuando el DOM esté listo Y después de GeoBlock
document.addEventListener('DOMContentLoaded', async () => {
  // Timeout de seguridad: ocultar loading después de 10 segundos
  const safetyTimeout = setTimeout(() => {
    console.warn('⚠️ Timeout: Ocultando loading screen por seguridad');
    App.hideLoadingScreen();
  }, 10000);
  
  try {
    // Esperar a que GeoBlock verifique el acceso
    const isAllowed = await GeoBlock.init();
    
    // Si no está permitido, GeoBlock ya mostró el mensaje de bloqueo
    if (!isAllowed) {
      clearTimeout(safetyTimeout);
      App.hideLoadingScreen();
      return;
    }
    
    // Si está permitido, inicializar la app
    await App.init();
    clearTimeout(safetyTimeout);
    
  } catch (error) {
    console.error('Error en inicialización:', error);
    clearTimeout(safetyTimeout);
    App.hideLoadingScreen();
    UI.showToast('Error al inicializar la aplicación', 'error');
  }
});
