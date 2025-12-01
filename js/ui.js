// Módulo de UI
const UI = {
  currentSort: { column: null, ascending: true },
  
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    // Si no existe el contenedor (página bloqueada), no mostrar toast
    if (!container) {
      console.log('Toast:', message);
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✗',
      info: 'ℹ',
      warning: '⚠'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-message">${Utils.escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  detectDuplicates(records) {
    const seen = new Map();
    const duplicates = new Set();
    
    records.forEach(record => {
      const key = `${record.nombres.toLowerCase()}_${record.apellidos.toLowerCase()}`;
      if (seen.has(key)) {
        duplicates.add(record.id);
        duplicates.add(seen.get(key));
      } else {
        seen.set(key, record.id);
      }
    });
    
    return duplicates;
  },

  sortRecords(records, column) {
    if (this.currentSort.column === column) {
      this.currentSort.ascending = !this.currentSort.ascending;
    } else {
      this.currentSort.column = column;
      this.currentSort.ascending = true;
    }

    const duplicates = this.detectDuplicates(records);
    
    // Separar duplicados y no duplicados
    const nonDuplicates = records.filter(r => !duplicates.has(r.id));
    const duplicateRecords = records.filter(r => duplicates.has(r.id));
    
    // Ordenar no duplicados
    nonDuplicates.sort((a, b) => {
      let valA, valB;
      
      switch(column) {
        case 'nombres':
          valA = a.nombres.toLowerCase();
          valB = b.nombres.toLowerCase();
          break;
        case 'apellidos':
          valA = a.apellidos.toLowerCase();
          valB = b.apellidos.toLowerCase();
          break;
        case 'departamento':
          valA = a.departamento.toLowerCase();
          valB = b.departamento.toLowerCase();
          break;
        case 'distrito':
          valA = a.distrito.toLowerCase();
          valB = b.distrito.toLowerCase();
          break;
        case 'edad':
          valA = a.edad;
          valB = b.edad;
          break;
        default:
          return 0;
      }
      
      if (valA < valB) return this.currentSort.ascending ? -1 : 1;
      if (valA > valB) return this.currentSort.ascending ? 1 : -1;
      return 0;
    });
    
    // Ordenar duplicados también
    duplicateRecords.sort((a, b) => {
      const nameA = `${a.nombres} ${a.apellidos}`.toLowerCase();
      const nameB = `${b.nombres} ${b.apellidos}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Retornar no duplicados primero, luego duplicados
    return [...nonDuplicates, ...duplicateRecords];
  },

  updateSortIndicators(column) {
    // Remover indicadores anteriores
    document.querySelectorAll('.sort-indicator').forEach(el => el.remove());
    
    // Agregar nuevo indicador
    const th = document.querySelector(`th[data-sort="${column}"]`);
    if (th) {
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = this.currentSort.ascending ? ' ▲' : ' ▼';
      th.appendChild(indicator);
    }
  },

  renderTable(records) {
    const tbody = document.getElementById('table-body');
    
    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-state">
          <td colspan="10">
            <div class="empty-message">
              <span class="empty-icon">💔</span>
              <p>No hay registros aún</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Detectar duplicados
    const duplicates = this.detectDuplicates(records);

    tbody.innerHTML = records.map(record => {
      const status = this.getRecordStatus(record.id);
      const isDuplicate = duplicates.has(record.id);
      
      // Contar datos extra: datos adicionales + comentarios con pruebas
      const extraData = this.getExtraDataInfo(record.id, record);
      
      const photoHtml = record.foto 
        ? `<div style="position: relative; display: inline-block;">
             <img src="${Utils.escapeHtml(record.foto)}" 
                  class="table-photo" 
                  style="cursor: pointer;" 
                  onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                  alt="Foto">
             <div class="table-photo-placeholder" 
                  style="display: none; cursor: pointer; background: linear-gradient(135deg, var(--soft-pink), var(--primary-pink)); color: #1a1a1a; font-weight: 700; font-size: 0.7rem; line-height: 1.2; padding: 5px; text-align: center;"
                  onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')"
                  title="Click para ver la foto">
               <div style="font-size: 1.5rem; margin-bottom: 2px;">👤</div>
               <div style="text-shadow: 0 1px 2px rgba(255,255,255,0.5);">Ver foto</div>
             </div>
           </div>`
        : `<div class="table-photo-placeholder" style="background: linear-gradient(135deg, #ddd, #bbb); color: #666;">
             <div style="font-size: 1.5rem; margin-bottom: 2px;">👤</div>
             <div style="font-size: 0.65rem; font-weight: 600;">Sin foto</div>
           </div>`;
      
      const instagramHtml = record.instagram 
        ? `<a href="${Utils.formatInstagramLink(record.instagram)}" target="_blank" class="social-icon" title="Ver Instagram">📷</a>`
        : '-';
      
      // Renderizar datos extra con tooltip
      const extraHtml = extraData.total > 0
        ? `<span class="extra-data-badge" title="${extraData.tooltip}">
             Sí
           </span>`
        : 'NO';
      
      return `
        <tr ${isDuplicate ? 'class="duplicate-row" title="⚠️ Posible duplicado detectado"' : ''}>
          <td>${photoHtml}</td>
          <td class="clickable-name" onclick="(async () => await App.openThread('${record.id}'))()" style="cursor: pointer; color: #d81b60; font-weight: 600;">
            ${isDuplicate ? '<span style="color: #ff9800; margin-right: 4px;" title="Duplicado">⚠️</span>' : ''}
            ${Utils.escapeHtml(record.nombres)}
          </td>
          <td style="font-weight: 600; color: #1a1a1a;">${Utils.escapeHtml(record.apellidos)}</td>
          <td>${Utils.escapeHtml(record.departamento)}</td>
          <td>${Utils.escapeHtml(record.distrito)}</td>
          <td>${record.edad}</td>
          <td>${instagramHtml}</td>
          <td>${extraHtml}</td>
          <td>${status}</td>
          <td>
            <button class="btn-view-details" onclick="App.viewDetails('${record.id}')">
              Ver todo el chisme
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  getRecordStatus(recordId) {
    const currentCountry = (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const thread = data.threads[recordId];
    
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
      return '<span class="status-badge status-approved">Aprobado</span>';
    } else if (approvePercent <= 30) {
      return '<span class="status-badge status-rejected">Refutado</span>';
    } else {
      return '<span class="status-badge status-mixed">Variado</span>';
    }
  },

  /**
   * Obtiene información sobre datos extra del registro
   */
  getExtraDataInfo(recordId, record) {
    const currentCountry = (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const thread = data.threads[recordId] || { comments: [] };
    
    let total = 0;
    const details = [];
    
    // 1. Datos adicionales del registro original
    if (record.datosAdicionales && record.datosAdicionales.trim().length > 0) {
      total++;
      details.push('Información adicional');
    }
    
    // 2. Comentarios con pruebas
    const commentsWithProofs = thread.comments?.filter(c => c.proofs && c.proofs.length > 0) || [];
    if (commentsWithProofs.length > 0) {
      total += commentsWithProofs.length;
      details.push(`${commentsWithProofs.length} comentario${commentsWithProofs.length > 1 ? 's' : ''} con pruebas`);
    }
    
    // 3. Total de comentarios (para contexto)
    const totalComments = thread.comments?.length || 0;
    if (totalComments > 0 && commentsWithProofs.length === 0) {
      details.push(`${totalComments} comentario${totalComments > 1 ? 's' : ''}`);
    }
    
    // Determinar icono según el tipo de datos
    let icon = '📝';
    if (commentsWithProofs.length > 0) {
      icon = '📸'; // Si hay pruebas fotográficas
    }
    
    return {
      total,
      icon,
      tooltip: details.length > 0 ? details.join(' • ') : 'Sin datos adicionales',
      hasData: total > 0,
    };
  },

  renderThreadInfo(record) {
    let photoHtml;
    if (record.foto) {
      photoHtml = `
        <div style="position: relative; display: inline-block;">
          <img src="${Utils.escapeHtml(record.foto)}" 
               style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-pink); margin-bottom: 15px; cursor: pointer;" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
               onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')"
               alt="Foto">
          <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, var(--soft-pink), var(--primary-pink)); display: none; flex-direction: column; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 15px; cursor: pointer; color: #1a1a1a; text-align: center; padding: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
               onclick="window.open('${Utils.escapeHtml(record.foto)}', '_blank')">
            <div style="font-size: 2.5rem; margin-bottom: 5px;">👤</div>
            <div style="font-size: 0.7rem; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 2px rgba(255,255,255,0.5);">Click para ver su rostro</div>
          </div>
        </div>
      `;
    } else {
      photoHtml = `
        <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #ddd, #bbb); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 15px; color: #666; text-align: center; padding: 10px;">
          <div style="font-size: 2.5rem; margin-bottom: 5px;">👤</div>
          <div style="font-size: 0.65rem; font-weight: 600; line-height: 1.2;">Sin foto</div>
        </div>
      `;
    }
    
    const instagramHtml = record.instagram 
      ? `<div class="thread-info-item">
          <div class="thread-info-label">Instagram</div>
          <div class="thread-info-value">
            <a href="${Utils.formatInstagramLink(record.instagram)}" target="_blank" style="color: var(--dark-pink); text-decoration: none;">
              📷 ${record.instagram.startsWith('@') ? record.instagram : '@' + record.instagram}
            </a>
          </div>
        </div>`
      : '';
    
    return `
      <div style="text-align: center; margin-bottom: 20px;">
        ${photoHtml}
      </div>
      ${instagramHtml}
      <div class="thread-info-row">
        <div class="thread-info-item">
          <div class="thread-info-label">Departamento</div>
          <div class="thread-info-value">${Utils.escapeHtml(record.departamento)}</div>
        </div>
        <div class="thread-info-item">
          <div class="thread-info-label">Distrito</div>
          <div class="thread-info-value">${Utils.escapeHtml(record.distrito)}</div>
        </div>
      </div>
      <div class="thread-info-row">
        <div class="thread-info-item">
          <div class="thread-info-label">Edad</div>
          <div class="thread-info-value">${record.edad} años</div>
        </div>
        <div class="thread-info-item">
          <div class="thread-info-label">Ocupación</div>
          <div class="thread-info-value">${Utils.escapeHtml(record.ocupacion || 'No especificado')}</div>
        </div>
      </div>
      <div class="thread-info-row">
        <div class="thread-info-item">
          <div class="thread-info-label">ETS</div>
          <div class="thread-info-value">${Utils.escapeHtml(record.ets || 'Desconocido')}</div>
        </div>
        <div class="thread-info-item">
          <div class="thread-info-label">Tiempo de relación</div>
          <div class="thread-info-value">${Utils.escapeHtml(record.tiempoRelacion || 'No especificado')}</div>
        </div>
      </div>
      <div class="thread-info-item">
        <div class="thread-info-label">Periodo de infidelidad</div>
        <div class="thread-info-value">${Utils.escapeHtml(record.periodoInfidelidad || 'No especificado')}</div>
      </div>
      ${record.datosAdicionales && record.datosAdicionales.trim() ? `
        <div class="thread-info-item" style="margin-top: 15px;">
          <div class="thread-info-label">Datos adicionales</div>
          <div class="thread-info-value" style="white-space: pre-wrap;">${Utils.escapeHtml(record.datosAdicionales)}</div>
        </div>
      ` : ''}
      ${record.pruebas && record.pruebas.length > 0 ? `
        <div class="thread-info-item" style="margin-top: 15px;">
          <div class="thread-info-label">Pruebas iniciales</div>
          <div class="comment-proofs">
            ${record.pruebas.map(url => `<img src="${Utils.escapeHtml(url)}" class="proof-img" onerror="this.style.display='none'" alt="Prueba" />`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  renderComments(comments, limit = null) {
    const commentsList = document.getElementById('comments-list');
    
    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay comentarios aún</p>';
      return;
    }

    // Ordenar por timestamp descendente (más recientes primero)
    const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp);
    
    // Limitar comentarios si se especifica
    const displayComments = limit ? sortedComments.slice(0, limit) : sortedComments;
    const hasMore = limit && comments.length > limit;

    commentsList.innerHTML = displayComments.map(comment => {
      // Generar nombre anónimo basado en userId
      const anonymousName = AnonymousNames.generate(comment.userId);
      
      return `
        <div class="comment-card">
          <div class="comment-header">
            <span class="comment-user">
              <span class="user-icon">🐾</span>
              ${Utils.escapeHtml(anonymousName)}
            </span>
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

    // Agregar botón "Ver todo el chisme" si hay más comentarios
    if (hasMore) {
      const moreButton = document.createElement('div');
      moreButton.style.cssText = 'text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--soft-pink);';
      moreButton.innerHTML = `
        <button onclick="App.viewDetails(App.currentRecordId)" class="btn-primary" style="padding: 12px 30px; font-size: 1rem;">
          <span style="font-size: 1.2rem;">👀</span> Mira todo el chisme (${comments.length} comentarios)
        </button>
      `;
      commentsList.appendChild(moreButton);
    }
  },

  openModal(modalId) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('modal-new-record').style.display = modalId === 'new-record' ? 'block' : 'none';
    document.getElementById('modal-thread').style.display = modalId === 'thread' ? 'block' : 'none';
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('form-new-record').reset();
  },

  closeThreadModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    App.currentRecordId = null;
  }
};

// Hacer disponible globalmente
window.UI = UI;

// Funciones globales para onclick
window.closeModal = () => UI.closeModal();
window.closeThreadModal = () => UI.closeThreadModal();
