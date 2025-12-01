// Sistema de votación para editar campos
const FieldVoting = {
  async proposeFieldChange(country, recordId, fieldName, newValue) {
    const identity = await Fingerprint.getUserIdentity();
    
    if (!identity.fingerprint || !identity.ip) {
      throw new Error('No se pudo validar tu identidad');
    }
    
    const result = await API.request('/api/field-proposal', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        fieldName,
        newValue,
        fingerprint: identity.fingerprint,
        ip: identity.ip,
        userId: identity.userId
      })
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  },

  async voteFieldProposal(country, recordId, fieldName, proposalValue, support) {
    const identity = await Fingerprint.getUserIdentity();
    
    if (!identity.fingerprint || !identity.ip) {
      throw new Error('No se pudo validar tu identidad');
    }
    
    const result = await API.request('/api/field-vote', {
      method: 'POST',
      body: JSON.stringify({
        country,
        recordId,
        fieldName,
        proposalValue,
        support,
        fingerprint: identity.fingerprint,
        ip: identity.ip,
        userId: identity.userId
      })
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  },

  renderFieldProposals(record, thread) {
    if (!thread.fieldProposals) return '';
    
    const editableFields = record.editableFields || [];
    if (editableFields.length === 0) return '';
    
    const proposals = Object.entries(thread.fieldProposals)
      .filter(([fieldName]) => editableFields.includes(fieldName))
      .map(([fieldName, proposalData]) => {
        const totalVotes = Object.values(proposalData).reduce((sum, p) => sum + p.votes, 0);
        const topProposal = Object.entries(proposalData)
          .sort((a, b) => b[1].votes - a[1].votes)[0];
        
        if (!topProposal || topProposal[1].votes < 3) return null;
        
        const [value, data] = topProposal;
        const percentage = totalVotes > 0 ? Math.round((data.votes / totalVotes) * 100) : 0;
        
        return {
          fieldName,
          value,
          votes: data.votes,
          percentage,
          currentValue: record[fieldName]
        };
      })
      .filter(p => p !== null);
    
    if (proposals.length === 0) return '';
    
    return `
      <div class="field-proposals-section">
        <h3>📊 Propuestas de Cambios (Votación Comunitaria)</h3>
        <p class="proposals-hint">La comunidad está proponiendo cambios a estos campos. Se necesitan al menos 3 votos para considerar un cambio.</p>
        ${proposals.map(p => `
          <div class="proposal-card">
            <div class="proposal-header">
              <span class="proposal-field">${this.getFieldLabel(p.fieldName)}</span>
              <span class="proposal-votes">${p.votes} votos (${p.percentage}%)</span>
            </div>
            <div class="proposal-values">
              <div class="current-value">
                <span class="value-label">Actual:</span>
                <span class="value-text">${Utils.escapeHtml(p.currentValue || 'No especificado')}</span>
              </div>
              <div class="arrow">→</div>
              <div class="proposed-value">
                <span class="value-label">Propuesto:</span>
                <span class="value-text">${Utils.escapeHtml(p.value)}</span>
              </div>
            </div>
            <div class="proposal-actions">
              <button class="btn-vote-proposal" onclick="FieldVoting.voteProposal('${p.fieldName}', '${Utils.escapeHtml(p.value)}', true, this)">
                👍 Apoyar
              </button>
              <button class="btn-vote-proposal reject" onclick="FieldVoting.voteProposal('${p.fieldName}', '${Utils.escapeHtml(p.value)}', false, this)">
                👎 Rechazar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  getFieldLabel(fieldName) {
    const labels = {
      ocupacion: 'Ocupación',
      ets: 'ETS',
      tiempoRelacion: 'Tiempo de relación',
      periodoInfidelidad: 'Periodo de infidelidad',
      departamento: 'Departamento',
      distrito: 'Distrito',
      edad: 'Edad',
      foto: 'Foto',
      instagram: 'Instagram'
    };
    return labels[fieldName] || fieldName;
  },

  async voteProposal(fieldName, value, support, buttonElement) {
    // Deshabilitar botón para prevenir múltiples clicks
    if (buttonElement) {
      buttonElement.disabled = true;
    }
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const recordId = urlParams.get('id');
      const country = urlParams.get('country');
      
      await this.voteFieldProposal(country, recordId, fieldName, value, support);
      UI.showToast(support ? 'Voto de apoyo registrado' : 'Voto de rechazo registrado', 'success');
      
      // Recargar página para ver cambios
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      UI.showToast(error.message, 'error');
      // Rehabilitar botón en caso de error
      if (buttonElement) {
        buttonElement.disabled = false;
      }
    }
  },

  showProposeModal(fieldName, currentValue) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Proponer Cambio: ${this.getFieldLabel(fieldName)}</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 15px; color: #666;">
            Valor actual: <strong>${Utils.escapeHtml(currentValue || 'No especificado')}</strong>
          </p>
          <form id="form-propose-field">
            <div class="form-group">
              <label>Nuevo valor propuesto *</label>
              <input type="text" name="newValue" required class="elegant-input" placeholder="Ingresa el nuevo valor">
            </div>
            <p class="form-hint">
              Se necesitan 5 votos de la comunidad para que el cambio sea aplicado automáticamente.
            </p>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
              <button type="submit" class="btn-primary">Proponer</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#form-propose-field').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newValue = e.target.newValue.value.trim();
      
      if (!newValue) {
        UI.showToast('Debes ingresar un valor', 'error');
        return;
      }
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get('id');
        const country = urlParams.get('country');
        
        await this.proposeFieldChange(country, recordId, fieldName, newValue);
        UI.showToast('Propuesta creada exitosamente', 'success');
        modal.remove();
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });
  }
};

window.FieldVoting = FieldVoting;
