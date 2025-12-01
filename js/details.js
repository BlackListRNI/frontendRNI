// Página de detalles
const DetailsPage = {
  recordId: null,
  country: null,
  userId: null,

  init() {
    this.userId = Utils.getUserId();
    this.parseURL();
    this.loadRecord();
    this.setupEventListeners();
    this.checkCommentCooldown();
  },

  parseURL() {
    const params = new URLSearchParams(window.location.search);
    this.recordId = params.get('id');
    this.country = params.get('country');

    if (!this.recordId || !this.country) {
      UI.showToast('Registro no encontrado', 'error');
      setTimeout(() => window.location.href = '/', 2000);
    }
  },

  setupEventListeners() {
    document.getElementById('form-comment').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitComment(e.target);
    });

    // Verificar si ya votó antes de agregar listeners
    this.checkAndUpdateVoteButtons();
  },

  checkAndUpdateVoteButtons() {
    const voteKey = `vote_${this.country}_${this.recordId}`;
    const hasVoted = localStorage.getItem(voteKey);
    
    const voteSection = document.querySelector('.thread-votes');
    
    if (hasVoted) {
      // Ocultar botones y mostrar mensaje
      voteSection.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #999; background: rgba(248, 180, 217, 0.1); border-radius: 8px;">
          <p style="font-size: 16px; margin-bottom: 10px;">✓ Ya votaste en este caso</p>
          <p style="font-size: 14px;">Tu voto: <strong>${hasVoted === 'approve' ? 'Aprobado' : 'Refutado'}</strong></p>
        </div>
      `;
    } else {
      // Agregar event listeners a los botones
      const btnApprove = document.getElementById('btn-approve');
      const btnReject = document.getElementById('btn-reject');
      
      if (btnApprove && btnReject) {
        btnApprove.addEventListener('click', () => {
          this.vote('approve');
        });
        btnReject.addEventListener('click', () => {
          this.vote('reject');
        });
      }
    }
  },

  async loadRecord() {
    // 1. Intentar cargar desde IndexedDB primero
    let data = { records: [], threads: {} };
    
    if (typeof IndexedDBStorage !== 'undefined') {
      try {
        await IndexedDBStorage.init();
        data = await IndexedDBStorage.loadData(this.country);
      } catch (error) {
        console.error('Error cargando desde IndexedDB:', error);
        // Fallback a localStorage
        data = Utils.getLocalData(this.country);
      }
    } else {
      data = Utils.getLocalData(this.country);
    }
    
    let record = data.records.find(r => r.id === this.recordId);
    
    // 2. Si no está local, intentar sincronizar chunks
    if (!record && typeof ChunkManager !== 'undefined') {
      console.log('📦 Registro no encontrado, sincronizando chunks...');
      UI.showToast('🔄 Buscando registro...', 'info');
      
      try {
        await ChunkManager.init(this.country);
        await ChunkManager.sync();
        
        // Recargar datos
        if (typeof IndexedDBStorage !== 'undefined') {
          data = await IndexedDBStorage.loadData(this.country);
        } else {
          data = Utils.getLocalData(this.country);
        }
        record = data.records.find(r => r.id === this.recordId);
      } catch (error) {
        console.error('Error sincronizando chunks:', error);
      }
    }
    
    const thread = data.threads[this.recordId] || { comments: [], votes: { approve: 0, reject: 0 } };

    if (!record) {
      UI.showToast('Registro no encontrado', 'error');
      setTimeout(() => window.location.href = '/', 2000);
      return;
    }

    // Actualizar SEO dinámicamente
    this.updateSEO(record, thread);
    
    this.renderRecord(record, thread);
  },

  updateSEO(record, thread) {
    const fullName = `${record.nombres} ${record.apellidos}`;
    const location = `${record.departamento}, ${record.distrito}`;
    const age = `${record.edad} años`;
    
    // Calcular veredicto
    const approve = thread.votes.approve || 0;
    const reject = thread.votes.reject || 0;
    const total = approve + reject;
    let verdict = 'Pendiente de verificación';
    if (total > 0) {
      const approvePercent = (approve / total) * 100;
      if (approvePercent >= 70) verdict = 'Caso verificado como infiel';
      else if (approvePercent <= 30) verdict = 'Caso refutado por la comunidad';
      else verdict = 'Caso en discusión';
    }
    
    const description = `${fullName} - ${age} - ${location}. ${verdict}. ${total} votos de la comunidad. Consulta pruebas y comentarios.`;
    const title = `${fullName} - Caso RNI | Registro Nacional de Infieles`;
    const currentUrl = window.location.href;
    
    // Actualizar title
    document.title = title;
    
    // Actualizar meta description
    this.updateMetaTag('name', 'description', description);
    
    // Actualizar Open Graph
    this.updateMetaTag('property', 'og:title', title);
    this.updateMetaTag('property', 'og:description', description);
    this.updateMetaTag('property', 'og:url', currentUrl);
    if (record.foto) {
      this.updateMetaTag('property', 'og:image', record.foto);
    }
    
    // Actualizar Twitter Card
    this.updateMetaTag('name', 'twitter:title', title);
    this.updateMetaTag('name', 'twitter:description', description);
    this.updateMetaTag('name', 'twitter:url', currentUrl);
    if (record.foto) {
      this.updateMetaTag('name', 'twitter:image', record.foto);
    }
    
    // Actualizar canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;
  },

  updateMetaTag(attribute, attributeValue, content) {
    let element = document.querySelector(`meta[${attribute}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  },

  renderRecord(record, thread) {
    const isEditable = (field) => record.editableFields && record.editableFields.includes(field);
    const editButton = (field, value) => isEditable(field) 
      ? `<button class="btn-edit-field" onclick="FieldVoting.showProposeModal('${field}', '${Utils.escapeHtml(value || 'No especificado').replace(/'/g, "\\'")}')">✏️ Proponer cambio</button>`
      : '';

    // Foto de perfil
    const photoContainer = document.getElementById('profile-photo-container');
    
    if (record.foto) {
      photoContainer.innerHTML = `
        <img id="profile-photo" 
             src="${Utils.escapeHtml(record.foto)}" 
             alt="Foto de perfil" 
             class="profile-photo" 
             style="cursor: pointer;"
             onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--soft-pink), var(--primary-pink)); display: none; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #1a1a1a; text-align: center; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 4px solid var(--primary-pink);"
             onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')">
          <div style="font-size: 3rem; margin-bottom: 8px;">👤</div>
          <div style="font-size: 0.8rem; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">Click para ver su rostro</div>
        </div>
      `;
    } else {
      photoContainer.innerHTML = `
        <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #ddd, #bbb); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; text-align: center; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 4px solid #999;">
          <div style="font-size: 3rem; margin-bottom: 8px;">👤</div>
          <div style="font-size: 0.75rem; font-weight: 600; line-height: 1.3;">Sin foto</div>
        </div>
      `;
    }

    // Nombre
    document.getElementById('profile-name').textContent = `${record.nombres} ${record.apellidos}`;

    // Instagram
    const socialEl = document.getElementById('profile-social');
    if (record.instagram) {
      socialEl.innerHTML = `
        <a href="${Utils.formatInstagramLink(record.instagram)}" target="_blank">
          📷 ${record.instagram.startsWith('@') ? record.instagram : '@' + record.instagram}
        </a>
        ${editButton('instagram', record.instagram)}
      `;
    } else {
      socialEl.innerHTML = editButton('instagram', '');
    }

    // Estado
    const statusEl = document.getElementById('profile-status');
    statusEl.innerHTML = this.getRecordStatus(thread);

    // Información con botones de edición
    document.getElementById('info-departamento').textContent = record.departamento;
    document.getElementById('info-distrito').textContent = record.distrito;
    document.getElementById('info-edad').textContent = `${record.edad} años`;
    
    const ocupacionEl = document.getElementById('info-ocupacion');
    ocupacionEl.innerHTML = `
      ${Utils.escapeHtml(record.ocupacion || 'No especificado')}
      ${editButton('ocupacion', record.ocupacion)}
    `;

    const etsEl = document.getElementById('info-ets');
    etsEl.innerHTML = `
      ${Utils.escapeHtml(record.ets || 'Desconocido')}
      ${editButton('ets', record.ets)}
    `;

    const tiempoEl = document.getElementById('info-tiempo');
    tiempoEl.innerHTML = `
      ${Utils.escapeHtml(record.tiempoRelacion || 'No especificado')}
      ${editButton('tiempoRelacion', record.tiempoRelacion)}
    `;

    const periodoEl = document.getElementById('info-periodo');
    periodoEl.innerHTML = `
      ${Utils.escapeHtml(record.periodoInfidelidad || 'No especificado')}
      ${editButton('periodoInfidelidad', record.periodoInfidelidad)}
    `;

    // Datos adicionales
    const datosSection = document.getElementById('datos-adicionales-section');
    if (record.datosAdicionales && record.datosAdicionales.trim()) {
      datosSection.style.display = 'block';
      document.getElementById('datos-adicionales-text').innerHTML = `
        ${Utils.escapeHtml(record.datosAdicionales)}
        ${editButton('datosAdicionales', record.datosAdicionales)}
      `;
    } else if (isEditable('datosAdicionales')) {
      datosSection.style.display = 'block';
      document.getElementById('datos-adicionales-text').innerHTML = `
        No especificado
        ${editButton('datosAdicionales', '')}
      `;
    }

    // Pruebas
    this.renderProofs(record.pruebas);

    // Votos
    document.getElementById('approve-count').textContent = thread.votes.approve || 0;
    document.getElementById('reject-count').textContent = thread.votes.reject || 0;

    // Renderizar balanza visual
    this.renderVoteBalance(thread.votes);

    // Renderizar propuestas de campos editables
    this.renderFieldProposals(record, thread);

    // Comentarios
    this.renderComments(thread.comments);
  },

  renderVoteBalance(votes) {
    const balanceEl = document.getElementById('vote-balance');
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

  renderFieldProposals(record, thread) {
    const container = document.getElementById('field-proposals-container');
    
    if (!thread.fieldProposals || Object.keys(thread.fieldProposals).length === 0) {
      container.style.display = 'none';
      return;
    }

    const editableFields = record.editableFields || [];
    if (editableFields.length === 0) {
      container.style.display = 'none';
      return;
    }

    const proposals = Object.entries(thread.fieldProposals)
      .filter(([fieldName]) => editableFields.includes(fieldName))
      .map(([fieldName, proposalData]) => {
        const allProposals = Object.entries(proposalData)
          .map(([value, data]) => ({ value, votes: data.votes || 0 }))
          .sort((a, b) => b.votes - a.votes);
        
        const topProposal = allProposals[0];
        
        if (!topProposal || topProposal.votes < 1) return null;
        
        const totalVotes = allProposals.reduce((sum, p) => sum + p.votes, 0);
        const percentage = totalVotes > 0 ? Math.round((topProposal.votes / totalVotes) * 100) : 0;
        
        return {
          fieldName,
          value: topProposal.value,
          votes: topProposal.votes,
          percentage,
          currentValue: record[fieldName]
        };
      })
      .filter(p => p !== null);

    if (proposals.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <h3>📊 Propuestas de Cambios (Votación Comunitaria)</h3>
      <p class="proposals-hint">💡 La comunidad está proponiendo cambios a estos campos. Puedes votar para apoyar o rechazar las propuestas.</p>
      ${proposals.map(p => `
        <div class="proposal-card">
          <div class="proposal-header">
            <span class="proposal-field">${this.getFieldLabel(p.fieldName)}</span>
            <span class="proposal-votes">${p.votes} voto${p.votes !== 1 ? 's' : ''} (${p.percentage}%)</span>
          </div>
          <div class="proposal-values">
            <div class="current-value">
              <span class="value-label">Actual</span>
              <span class="value-text">${Utils.escapeHtml(p.currentValue || 'No especificado')}</span>
            </div>
            <div class="arrow">→</div>
            <div class="proposed-value">
              <span class="value-label">Propuesto</span>
              <span class="value-text">${Utils.escapeHtml(p.value)}</span>
            </div>
          </div>
          <div class="proposal-actions">
            <button class="btn-vote-proposal" onclick="DetailsPage.voteOnProposal('${p.fieldName}', '${Utils.escapeHtml(p.value).replace(/'/g, "\\'")}', true, this)">
              👍 Apoyar
            </button>
            <button class="btn-vote-proposal reject" onclick="DetailsPage.voteOnProposal('${p.fieldName}', '${Utils.escapeHtml(p.value).replace(/'/g, "\\'")}', false, this)">
              👎 Rechazar
            </button>
          </div>
        </div>
      `).join('')}
    `;
  },

  getFieldLabel(fieldName) {
    const labels = {
      ocupacion: 'Ocupación',
      ets: 'ETS',
      tiempoRelacion: 'Tiempo de relación',
      periodoInfidelidad: 'Periodo de infidelidad',
      datosAdicionales: 'Datos adicionales',
      instagram: 'Instagram'
    };
    return labels[fieldName] || fieldName;
  },

  async voteOnProposal(fieldName, value, support, buttonElement) {
    if (buttonElement) {
      buttonElement.disabled = true;
    }

    try {
      await FieldVoting.voteFieldProposal(this.country, this.recordId, fieldName, value, support);
      UI.showToast(support ? 'Voto de apoyo registrado' : 'Voto de rechazo registrado', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      UI.showToast(error.message || 'Error al votar', 'error');
      if (buttonElement) {
        buttonElement.disabled = false;
      }
    }
  },

  getRecordStatus(thread) {
    if (!thread || !thread.votes) {
      return '<span class="status-badge status-pending">Pendiente</span>';
    }
    
    const { approve, reject } = thread.votes;
    const total = approve + reject;
    
    if (total === 0) {
      return '<span class="status-badge status-pending">Pendiente</span>';
    }
    
    const approvePercent = (approve / total) * 100;
    
    if (approvePercent >= 70) {
      return '<span class="status-badge status-approved">Mayormente Aprobado</span>';
    } else if (approvePercent <= 30) {
      return '<span class="status-badge status-rejected">Mayormente Refutado</span>';
    } else {
      return '<span class="status-badge status-mixed">Variado / Incierto</span>';
    }
  },

  renderProofs(proofs) {
    const gallery = document.getElementById('pruebas-gallery');
    
    if (!proofs || proofs.length === 0) {
      gallery.innerHTML = '<div class="gallery-empty">No hay pruebas disponibles</div>';
      return;
    }

    gallery.innerHTML = proofs.map(url => `
      <div class="gallery-item">
        <img src="${Utils.escapeHtml(url)}" 
             alt="Prueba" 
             style="cursor: pointer;"
             onclick="openImageModal('${Utils.escapeHtml(url)}')"
             onerror="this.parentElement.style.display='none'">
      </div>
    `).join('');
  },

  renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    
    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay comentarios aún</p>';
      return;
    }

    commentsList.innerHTML = comments.map(comment => {
      // Generar nombre anónimo para cada usuario
      const anonymousName = AnonymousNames.generate(comment.userId);
      
      return `
        <div class="comment-card">
          <div class="comment-header">
            <span>👤 ${Utils.escapeHtml(anonymousName)}</span>
            <span>${Utils.formatDate(comment.timestamp)}</span>
          </div>
          <div class="comment-text">${Utils.escapeHtml(comment.text)}</div>
          ${comment.proofs && comment.proofs.length > 0 ? `
            <div class="comment-proofs">
              ${comment.proofs.map(url => `<img src="${Utils.escapeHtml(url)}" class="proof-img" onerror="this.style.display='none'" alt="Prueba" />`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  async submitComment(form) {
    // Verificar rate limiting
    const rateLimitCheck = CommentRateLimit.canComment(this.recordId, this.userId, this.country);
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

    // Deshabilitar botón y mostrar loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Publicando...';
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';

    try {
      const result = await API.submitComment(
        this.country,
        this.recordId,
        comment,
        proofs,
        this.userId
      );

      // Cargar datos correctamente
      let data = { records: [], threads: {} };
      if (typeof IndexedDBStorage !== 'undefined') {
        try {
          data = await IndexedDBStorage.loadData(this.country);
        } catch (error) {
          data = Utils.getLocalData(this.country);
        }
      } else {
        data = Utils.getLocalData(this.country);
      }
      
      if (!data.threads) {
        data.threads = {};
      }
      
      data.threads[this.recordId] = result.thread;
      data.lastUpdate = Date.now();
      
      // Guardar en ambos lugares
      if (typeof IndexedDBStorage !== 'undefined') {
        await IndexedDBStorage.saveData(this.country, data);
      }
      await Utils.saveLocalData(this.country, data);
      
      // Registrar que el usuario comentó (rate limiting)
      CommentRateLimit.recordComment(this.recordId, this.userId);
      
      // Actualizar UI de cooldown
      this.checkCommentCooldown();
      
      this.renderComments(result.thread.comments);
      form.reset();
      UI.showToast('✅ Comentario publicado exitosamente', 'success');
      
      // Restaurar botón
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
      
      UI.showToast(error.message || 'Error al publicar comentario', 'error');
    }
  },

  checkCommentCooldown() {
    const rateLimitCheck = CommentRateLimit.canComment(this.recordId, this.userId, this.country);
    const cooldownNotice = document.getElementById('comment-cooldown-notice');
    const commentForm = document.getElementById('form-comment');
    const submitButton = commentForm.querySelector('button[type="submit"]');
    
    if (!rateLimitCheck.allowed) {
      // Mostrar aviso de cooldown
      cooldownNotice.style.display = 'block';
      document.getElementById('cooldown-time').textContent = rateLimitCheck.message;
      submitButton.disabled = true;
      
      // Actualizar el contador cada segundo
      this.cooldownInterval = setInterval(() => {
        const check = CommentRateLimit.canComment(this.recordId, this.userId, this.country);
        if (check.allowed) {
          cooldownNotice.style.display = 'none';
          submitButton.disabled = false;
          clearInterval(this.cooldownInterval);
        } else {
          document.getElementById('cooldown-time').textContent = check.message;
        }
      }, 1000);
    } else {
      cooldownNotice.style.display = 'none';
      submitButton.disabled = false;
    }
  },

  async vote(voteType) {
    // Verificar si ya votó
    const voteKey = `vote_${this.country}_${this.recordId}`;
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
        this.country,
        this.recordId,
        voteType,
        this.userId
      );

      // Cargar datos correctamente
      let data = { records: [], threads: {} };
      if (typeof IndexedDBStorage !== 'undefined') {
        try {
          data = await IndexedDBStorage.loadData(this.country);
        } catch (error) {
          data = Utils.getLocalData(this.country);
        }
      } else {
        data = Utils.getLocalData(this.country);
      }
      
      if (!data.threads) {
        data.threads = {};
      }
      if (!data.threads[this.recordId]) {
        data.threads[this.recordId] = { comments: [], votes: { approve: 0, reject: 0 } };
      }
      
      data.threads[this.recordId].votes = result.votes;
      data.lastUpdate = Date.now();
      
      // Guardar en ambos lugares
      if (typeof IndexedDBStorage !== 'undefined') {
        await IndexedDBStorage.saveData(this.country, data);
      }
      await Utils.saveLocalData(this.country, data);
      
      // Guardar que el usuario ya votó
      localStorage.setItem(voteKey, voteType);
      
      document.getElementById('approve-count').textContent = result.votes.approve;
      document.getElementById('reject-count').textContent = result.votes.reject;
      
      // Actualizar balanza visual
      this.renderVoteBalance(result.votes);
      
      const statusEl = document.getElementById('profile-status');
      statusEl.innerHTML = this.getRecordStatus(data.threads[this.recordId]);
      
      UI.showToast(
        voteType === 'approve' ? 'Voto de aprobación registrado' : 'Voto de refutación registrado',
        'success'
      );
      
      // Ocultar botones y mostrar mensaje
      this.checkAndUpdateVoteButtons();
    } catch (error) {
      UI.showToast(error.message || 'Error al registrar voto', 'error');
      // Rehabilitar botones en caso de error
      btnApprove.disabled = false;
      btnReject.disabled = false;
    }
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  DetailsPage.init();
});
