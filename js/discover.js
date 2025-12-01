// Página de Descubrir (estilo Tinder/TikTok)
const Discover = {
  currentCountry: 'PE',
  recommendations: [],
  currentIndex: 0,
  userId: null,
  interactionsSinceRefresh: 0, // Contador de interacciones
  REFRESH_INTERVAL: 5, // Recargar cada 5 interacciones

  async init() {
    this.userId = Utils.getUserId();
    const countryDetected = await this.detectAndSetCountry();
    
    // Si no se detectó el país, no continuar
    if (!countryDetected) {
      this.hideLoadingScreen();
      return;
    }
    
    await this.syncWithServer();
    await this.loadDiscoverState(); // Cargar estado previo
    await this.loadRecommendations();
    this.setupEventListeners();
    
    // Ocultar loading screen
    this.hideLoadingScreen();
  },

  hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        loadingOverlay.remove();
      }, 300);
    }
  },

  async syncWithServer() {
    const localData = Utils.getLocalData(this.currentCountry);
    
    try {
      const result = await API.sync(
        this.currentCountry,
        localData,
        localData.lastUpdate
      );
      
      // SISTEMA HÍBRIDO INTELIGENTE
      if (typeof IndexedDBStorage !== 'undefined') {
        const totalRecords = result.data.records?.length || 0;
        
        // UMBRAL ADAPTATIVO según dispositivo
        const deviceMemory = navigator.deviceMemory || 4;
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        const THRESHOLD = isMobile ? 1500 : (deviceMemory >= 8 ? 3000 : 2000);
        
        if (totalRecords < THRESHOLD) {
          // MODO COMPLETO: Guardar todo
          console.log(`💾 MODO COMPLETO: Guardando ${totalRecords} registros`);
          await IndexedDBStorage.saveData(this.currentCountry, result.data);
          await IndexedDBStorage.saveMetadata('storage_mode_' + this.currentCountry, 'full');
          
        } else {
          // MODO DISTRIBUIDO: Usar chunks
          console.log(`📦 MODO DISTRIBUIDO: ${totalRecords} registros (usando chunks)`);
          
          if (typeof DistributedStorage !== 'undefined') {
            const allChunks = DistributedStorage.createChunks(result.data.records);
            const myChunks = DistributedStorage.assignChunksToClient(allChunks, this.userId);
            
            for (const chunk of myChunks) {
              await IndexedDBStorage.saveChunk({
                ...chunk,
                country: this.currentCountry
              });
            }
            
            const merkleRoot = DistributedStorage.buildMerkleTree(allChunks);
            await IndexedDBStorage.saveMetadata('merkle_root_' + this.currentCountry, merkleRoot);
            await IndexedDBStorage.saveMetadata('storage_mode_' + this.currentCountry, 'distributed');
            await IndexedDBStorage.saveMetadata('total_chunks_' + this.currentCountry, allChunks.length);
            await IndexedDBStorage.saveMetadata('total_records_' + this.currentCountry, totalRecords);
            await IndexedDBStorage.saveMetadata('my_chunks_' + this.currentCountry, myChunks.map(c => c.id));
            
            // Guardar índice
            const recordIndex = result.data.records.map(r => ({
              id: r.id,
              nombres: r.nombres,
              apellidos: r.apellidos,
              edad: r.edad,
              departamento: r.departamento,
              createdAt: r.createdAt
            }));
            await IndexedDBStorage.saveMetadata('record_index_' + this.currentCountry, recordIndex);
            
            console.log(`✅ ${myChunks.length}/${allChunks.length} chunks guardados`);
          }
        }
      }
      
      // Intentar guardar en localStorage
      try {
        Utils.saveLocalData(this.currentCountry, result.data);
      } catch (error) {
        console.log('⚠️ localStorage lleno, usando solo IndexedDB');
      }
    } catch (error) {
      console.log('Working offline');
    }
  },

  async detectAndSetCountry() {
    const savedCountry = localStorage.getItem('selectedCountry');
    
    if (savedCountry) {
      this.currentCountry = savedCountry;
      document.getElementById('country-select').value = savedCountry;
      return true;
    }
    
    // Intentar detectar país
    if (typeof UI !== 'undefined') {
      UI.showToast('🌍 Detectando tu ubicación...', 'info');
    }
    
    try {
      const detectedCountry = await Utils.detectCountryByIP();
      this.currentCountry = detectedCountry;
      document.getElementById('country-select').value = detectedCountry;
      localStorage.setItem('selectedCountry', detectedCountry);
      if (typeof UI !== 'undefined') {
        UI.showToast(`📍 País detectado: ${detectedCountry}`, 'success');
      }
      return true;
    } catch (error) {
      console.log('Could not detect country - GeoBlock will handle it');
      // GeoBlock ya manejó el error y mostró el mensaje
      return false;
    }
  },

  setupEventListeners() {
    document.getElementById('country-select').addEventListener('change', async (e) => {
      this.currentCountry = e.target.value;
      localStorage.setItem('selectedCountry', this.currentCountry);
      this.interactionsSinceRefresh = 0; // Resetear contador
      await this.loadRecommendations();
    });

    document.getElementById('btn-like').addEventListener('click', () => {
      this.handleLike();
    });

    document.getElementById('btn-dislike').addEventListener('click', () => {
      this.handleDislike();
    });

    // Soporte para teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.handleDislike();
      } else if (e.key === 'ArrowRight') {
        this.handleLike();
      }
    });

    // Soporte para swipe en móvil
    this.setupSwipe();
  },

  setupSwipe() {
    const card = document.getElementById('discover-card');
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    card.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      card.style.transform = `translateX(${diff}px) rotate(${diff * 0.1}deg)`;
    });

    card.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      
      const diff = currentX - startX;
      
      if (Math.abs(diff) > 100) {
        if (diff > 0) {
          this.handleLike();
        } else {
          this.handleDislike();
        }
      }
      
      card.style.transform = '';
    });
  },

  async loadRecommendations(keepIndex = false) {
    let data = { records: [], threads: {} };
    
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        const storageMode = await IndexedDBStorage.loadMetadata('storage_mode_' + this.currentCountry);
        
        if (storageMode === 'distributed') {
          // MODO DISTRIBUIDO: Reconstruir desde chunks
          console.log('📦 MODO DISTRIBUIDO: Reconstruyendo desde chunks...');
          
          // Cargar índice rápido
          const recordIndex = await IndexedDBStorage.loadMetadata('record_index_' + this.currentCountry);
          
          if (recordIndex && recordIndex.length > 0) {
            console.log(`⚡ Usando índice de ${recordIndex.length} registros`);
            data.records = recordIndex;
          }
          
          // Reconstruir completo en background
          if (typeof DistributedStorage !== 'undefined') {
            this.reconstructInBackground();
          }
          
        } else {
          // MODO COMPLETO: Cargar todo
          console.log('📦 MODO COMPLETO: Cargando datos completos...');
          const idbData = await IndexedDBStorage.loadData(this.currentCountry);
          if (idbData && idbData.records && idbData.records.length > 0) {
            console.log(`✅ ${idbData.records.length} registros cargados`);
            data = idbData;
          }
        }
      } catch (error) {
        console.error('Error cargando desde IndexedDB:', error);
      }
    }
    
    // Fallback: localStorage
    if (!data.records || data.records.length === 0) {
      console.log('📦 Fallback: Cargando desde localStorage...');
      data = Utils.getLocalData(this.currentCountry);
    }
    
    if (!data.records || data.records.length === 0) {
      this.showEmptyState();
      return;
    }

    // Obtener recomendaciones
    this.recommendations = await Algorithm.getRecommendations(data.records, this.currentCountry, 50);
    
    if (!keepIndex) {
      this.currentIndex = 0;
    }
    
    this.renderCurrentCard();
  },

  async reconstructInBackground() {
    try {
      const reconstructed = await DistributedStorage.reconstructData(
        this.currentCountry,
        this.userId
      );
      
      if (reconstructed && reconstructed.records && reconstructed.records.length > 0) {
        console.log(`✅ ${reconstructed.records.length} registros reconstruidos en background`);
        // Recargar recomendaciones con datos completos
        await this.loadRecommendations(true);
      }
    } catch (error) {
      console.error('Error reconstruyendo en background:', error);
    }
  },

  async refreshRecommendations() {
    console.log('🔄 Recargando recomendaciones basadas en tus preferencias...');
    
    // Mostrar toast de recarga
    if (typeof UI !== 'undefined') {
      UI.showToast('🔄 Actualizando recomendaciones...', 'info');
    }
    
    // Guardar índice actual
    const savedIndex = this.currentIndex;
    
    // Recargar recomendaciones
    await this.loadRecommendations(true);
    
    // Si hay más recomendaciones, continuar desde donde estaba
    if (this.recommendations.length > savedIndex) {
      this.currentIndex = savedIndex;
      this.renderCurrentCard();
    }
    
    // Resetear contador
    this.interactionsSinceRefresh = 0;
    
    // Guardar estado en IndexedDB
    await this.saveDiscoverState();
  },

  /**
   * Guarda el estado del descubrir (para persistencia entre sesiones)
   */
  async saveDiscoverState() {
    try {
      const userKey = await Algorithm.getUserKey();
      const state = {
        userKey,
        country: this.currentCountry,
        currentIndex: this.currentIndex,
        interactionsSinceRefresh: this.interactionsSinceRefresh,
        lastSession: Date.now(),
      };
      
      if (typeof IndexedDBStorage !== 'undefined') {
        await IndexedDBStorage.saveMetadata(`discover_state_${userKey}`, state);
      } else {
        localStorage.setItem(`discover_state_${userKey}`, JSON.stringify(state));
      }
    } catch (error) {
      console.error('Error guardando estado de descubrir:', error);
    }
  },

  /**
   * Carga el estado del descubrir
   */
  async loadDiscoverState() {
    try {
      const userKey = await Algorithm.getUserKey();
      let state = null;
      
      if (typeof IndexedDBStorage !== 'undefined') {
        state = await IndexedDBStorage.loadMetadata(`discover_state_${userKey}`);
      } else {
        const stored = localStorage.getItem(`discover_state_${userKey}`);
        state = stored ? JSON.parse(stored) : null;
      }
      
      if (state && state.country === this.currentCountry) {
        // Restaurar estado si es de la misma sesión (menos de 1 hora)
        const timeSinceLastSession = Date.now() - state.lastSession;
        if (timeSinceLastSession < 3600000) { // 1 hora
          this.currentIndex = state.currentIndex || 0;
          this.interactionsSinceRefresh = state.interactionsSinceRefresh || 0;
          console.log('✅ Estado de descubrir restaurado');
        }
      }
    } catch (error) {
      console.error('Error cargando estado de descubrir:', error);
    }
  },

  renderCurrentCard() {
    if (this.currentIndex >= this.recommendations.length) {
      this.showEndState();
      return;
    }

    const record = this.recommendations[this.currentIndex];
    const card = document.getElementById('discover-card');
    
    const photoHtml = record.foto 
      ? `<img src="${Utils.escapeHtml(record.foto)}" 
             class="card-photo" 
             alt="Foto" 
             onclick="openImageModal('${Utils.escapeHtml(record.foto)}')"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="card-photo-placeholder" style="display: none;">
           <span>👤</span>
         </div>`
      : `<div class="card-photo-placeholder">
           <span>👤</span>
         </div>`;

    const proofsHtml = record.pruebas && record.pruebas.length > 0
      ? `<div class="card-proofs">
           ${record.pruebas.map(url => `
             <img src="${Utils.escapeHtml(url)}" 
                  class="card-proof-img" 
                  onclick="openImageModal('${Utils.escapeHtml(url)}')"
                  onerror="this.style.display='none'">
           `).join('')}
         </div>`
      : '';

    card.innerHTML = `
      ${photoHtml}
      <div class="card-content">
        <div class="card-header">
          <div>
            <div class="card-name">${Utils.escapeHtml(record.nombres)} ${Utils.escapeHtml(record.apellidos)}</div>
            <div class="card-age">${record.edad} años</div>
          </div>
        </div>
        
        <div class="card-location">
          📍 ${Utils.escapeHtml(record.departamento)}${record.distrito !== 'No especificado' ? `, ${Utils.escapeHtml(record.distrito)}` : ''}
        </div>
        
        <div class="card-info-grid">
          ${record.ocupacion && record.ocupacion !== 'No especificado' ? `
            <div class="card-info-item">
              <div class="card-info-label">Ocupación</div>
              <div class="card-info-value">${Utils.escapeHtml(record.ocupacion)}</div>
            </div>
          ` : ''}
          
          ${record.ets && record.ets !== 'Desconocido' ? `
            <div class="card-info-item">
              <div class="card-info-label">ETS</div>
              <div class="card-info-value">${Utils.escapeHtml(record.ets)}</div>
            </div>
          ` : ''}
          
          ${record.tiempoRelacion && record.tiempoRelacion !== 'No especificado' ? `
            <div class="card-info-item">
              <div class="card-info-label">Tiempo de relación</div>
              <div class="card-info-value">${Utils.escapeHtml(record.tiempoRelacion)}</div>
            </div>
          ` : ''}
          
          ${record.periodoInfidelidad && record.periodoInfidelidad !== 'No especificado' ? `
            <div class="card-info-item">
              <div class="card-info-label">Periodo</div>
              <div class="card-info-value">${Utils.escapeHtml(record.periodoInfidelidad)}</div>
            </div>
          ` : ''}
        </div>
        
        ${record.datosAdicionales ? `
          <div class="card-description">
            <div class="card-description-text">${Utils.escapeHtml(record.datosAdicionales)}</div>
          </div>
        ` : ''}
        
        ${proofsHtml}
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.location.href='/details.html?id=${record.id}&country=${this.currentCountry}'" 
                  class="btn-primary">
            Ver detalles completos
          </button>
        </div>
      </div>
    `;
  },

  async handleLike() {
    if (this.currentIndex >= this.recommendations.length) return;
    
    const record = this.recommendations[this.currentIndex];
    
    // Registrar en el algoritmo
    await Algorithm.recordInteraction(record, true);
    
    // Incrementar contador de interacciones
    this.interactionsSinceRefresh++;
    
    // Animación
    this.animateCard('right');
    
    // Siguiente card
    this.currentIndex++;
    
    // Guardar estado
    await this.saveDiscoverState();
    
    // Verificar si necesita recargar recomendaciones
    if (this.interactionsSinceRefresh >= this.REFRESH_INTERVAL) {
      setTimeout(async () => {
        await this.refreshRecommendations();
      }, 300);
    } else {
      setTimeout(() => {
        this.renderCurrentCard();
      }, 300);
    }
  },

  async handleDislike() {
    if (this.currentIndex >= this.recommendations.length) return;
    
    const record = this.recommendations[this.currentIndex];
    
    // Registrar en el algoritmo
    await Algorithm.recordInteraction(record, false);
    
    // Incrementar contador de interacciones
    this.interactionsSinceRefresh++;
    
    // Animación
    this.animateCard('left');
    
    // Siguiente card
    this.currentIndex++;
    
    // Guardar estado
    await this.saveDiscoverState();
    
    // Verificar si necesita recargar recomendaciones
    if (this.interactionsSinceRefresh >= this.REFRESH_INTERVAL) {
      setTimeout(async () => {
        await this.refreshRecommendations();
      }, 300);
    } else {
      setTimeout(() => {
        this.renderCurrentCard();
      }, 300);
    }
  },

  animateCard(direction) {
    const card = document.getElementById('discover-card');
    const translateX = direction === 'right' ? '150%' : '-150%';
    const rotate = direction === 'right' ? '30deg' : '-30deg';
    
    card.style.transition = 'all 0.3s ease';
    card.style.transform = `translateX(${translateX}) rotate(${rotate})`;
    card.style.opacity = '0';
    
    setTimeout(() => {
      card.style.transition = 'none';
      card.style.transform = '';
      card.style.opacity = '1';
    }, 300);
  },

  showEmptyState() {
    const card = document.getElementById('discover-card');
    card.innerHTML = `
      <div class="card-empty">
        <div class="card-empty-icon">😔</div>
        <div class="card-empty-text">No hay registros disponibles</div>
        <div class="card-empty-hint">Intenta cambiar de país o vuelve más tarde</div>
      </div>
    `;
  },

  showEndState() {
    const card = document.getElementById('discover-card');
    card.innerHTML = `
      <div class="card-empty">
        <div class="card-empty-icon">🎉</div>
        <div class="card-empty-text">¡Has visto todos los registros!</div>
        <div class="card-empty-hint">Vuelve mañana para ver más</div>
        <button onclick="Discover.resetAndReload()" class="btn-primary" style="margin-top: 20px;">
          Ver de nuevo
        </button>
      </div>
    `;
  },

  async resetAndReload() {
    const prefs = await Algorithm.getPreferences();
    prefs.interactions = [];
    await Algorithm.savePreferences(prefs);
    this.interactionsSinceRefresh = 0; // Resetear contador
    await this.loadRecommendations();
  }
};

// Función global para abrir modal de imagen
function openImageModal(imageUrl) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  modal.style.display = 'block';
  modalImg.src = imageUrl;
}

window.Discover = Discover;
window.openImageModal = openImageModal;
