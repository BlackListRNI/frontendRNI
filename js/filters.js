// Sistema de búsqueda y filtros
const Filters = {
  allRecords: [],
  filteredRecords: [],
  activeFilters: {},
  searchTerm: '',

  init() {
    this.setupEventListeners();
    this.setupToggle();
  },

  setupToggle() {
    const toggleBtn = document.getElementById('btn-toggle-filters');
    const container = document.querySelector('.search-filter-container');
    const icon = document.getElementById('filter-toggle-icon');

    // Estado inicial: colapsado
    icon.textContent = '🔼';
    toggleBtn.setAttribute('data-tooltip', 'Mostrar filtros');

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = container.classList.contains('collapsed');
      
      if (isCollapsed) {
        // Expandir
        container.classList.remove('collapsed');
        icon.textContent = '🔽';
        toggleBtn.classList.add('active-filter-btn');
        toggleBtn.setAttribute('data-tooltip', 'Ocultar filtros');
        
        // Scroll suave hacia los filtros
        setTimeout(() => {
          container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        // Colapsar
        container.classList.add('collapsed');
        icon.textContent = '🔼';
        toggleBtn.classList.remove('active-filter-btn');
        toggleBtn.setAttribute('data-tooltip', 'Mostrar filtros');
      }
    });
  },

  setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase().trim();
      this.updateClearSearchButton();
      this.applyFilters();
    });

    // Botón limpiar búsqueda
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      searchInput.value = '';
      this.searchTerm = '';
      this.updateClearSearchButton();
      this.applyFilters();
    });

    // Cambiar modo de filtros
    document.getElementById('btn-simple-filters').addEventListener('click', () => {
      this.switchFilterMode('simple');
    });

    document.getElementById('btn-advanced-filters').addEventListener('click', () => {
      this.switchFilterMode('advanced');
    });

    // Limpiar todos los filtros
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      this.clearAllFilters();
    });

    // Filtros simples
    document.getElementById('filter-status').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-age').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-instagram').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-extra').addEventListener('change', () => this.applyFilters());

    // Filtros avanzados
    document.getElementById('filter-departamento').addEventListener('input', () => this.applyFilters());
    document.getElementById('filter-distrito').addEventListener('input', () => this.applyFilters());
    document.getElementById('filter-ocupacion').addEventListener('input', () => this.applyFilters());
    document.getElementById('filter-ets').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-age-min').addEventListener('input', () => this.applyFilters());
    document.getElementById('filter-age-max').addEventListener('input', () => this.applyFilters());
    document.getElementById('filter-sort').addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-photo').addEventListener('change', () => this.applyFilters());
  },

  switchFilterMode(mode) {
    const simpleBtn = document.getElementById('btn-simple-filters');
    const advancedBtn = document.getElementById('btn-advanced-filters');
    const simplePanel = document.getElementById('simple-filters');
    const advancedPanel = document.getElementById('advanced-filters');

    if (mode === 'simple') {
      simpleBtn.classList.add('active');
      advancedBtn.classList.remove('active');
      simplePanel.classList.add('active');
      advancedPanel.classList.remove('active');
    } else {
      simpleBtn.classList.remove('active');
      advancedBtn.classList.add('active');
      simplePanel.classList.remove('active');
      advancedPanel.classList.add('active');
    }
  },

  updateClearSearchButton() {
    const btn = document.getElementById('btn-clear-search');
    btn.style.display = this.searchTerm ? 'flex' : 'none';
  },

  setRecords(records) {
    this.allRecords = records;
    this.applyFilters();
  },

  applyFilters() {
    let filtered = [...this.allRecords];

    // Aplicar búsqueda
    if (this.searchTerm) {
      filtered = filtered.filter(record => {
        const searchableText = `
          ${record.nombres} 
          ${record.apellidos} 
          ${record.departamento} 
          ${record.distrito} 
          ${record.ocupacion || ''} 
          ${record.instagram || ''}
        `.toLowerCase();
        return searchableText.includes(this.searchTerm);
      });
    }

    // Aplicar filtros simples
    const status = document.getElementById('filter-status').value;
    if (status) {
      filtered = filtered.filter(record => {
        const recordStatus = this.getRecordStatus(record.id);
        return recordStatus === status;
      });
    }

    const ageRange = document.getElementById('filter-age').value;
    if (ageRange) {
      filtered = filtered.filter(record => {
        const age = record.edad;
        if (ageRange === '18-25') return age >= 18 && age <= 25;
        if (ageRange === '26-35') return age >= 26 && age <= 35;
        if (ageRange === '36-45') return age >= 36 && age <= 45;
        if (ageRange === '46+') return age >= 46;
        return true;
      });
    }

    const hasInstagram = document.getElementById('filter-instagram').value;
    if (hasInstagram) {
      filtered = filtered.filter(record => {
        const has = record.instagram && record.instagram.trim().length > 0;
        return hasInstagram === 'yes' ? has : !has;
      });
    }

    const hasExtra = document.getElementById('filter-extra').value;
    if (hasExtra) {
      filtered = filtered.filter(record => {
        const has = record.datosAdicionales && record.datosAdicionales.trim().length > 0;
        return hasExtra === 'yes' ? has : !has;
      });
    }

    // Aplicar filtros avanzados
    const departamento = document.getElementById('filter-departamento').value.toLowerCase().trim();
    if (departamento) {
      filtered = filtered.filter(record => 
        record.departamento.toLowerCase().includes(departamento)
      );
    }

    const distrito = document.getElementById('filter-distrito').value.toLowerCase().trim();
    if (distrito) {
      filtered = filtered.filter(record => 
        record.distrito.toLowerCase().includes(distrito)
      );
    }

    const ocupacion = document.getElementById('filter-ocupacion').value.toLowerCase().trim();
    if (ocupacion) {
      filtered = filtered.filter(record => 
        (record.ocupacion || '').toLowerCase().includes(ocupacion)
      );
    }

    const ets = document.getElementById('filter-ets').value;
    if (ets) {
      filtered = filtered.filter(record => record.ets === ets);
    }

    const ageMin = parseInt(document.getElementById('filter-age-min').value);
    if (!isNaN(ageMin)) {
      filtered = filtered.filter(record => record.edad >= ageMin);
    }

    const ageMax = parseInt(document.getElementById('filter-age-max').value);
    if (!isNaN(ageMax)) {
      filtered = filtered.filter(record => record.edad <= ageMax);
    }

    const hasPhoto = document.getElementById('filter-photo').value;
    if (hasPhoto) {
      filtered = filtered.filter(record => {
        const has = record.foto && record.foto.trim().length > 0;
        return hasPhoto === 'yes' ? has : !has;
      });
    }

    // Aplicar ordenamiento
    const sortBy = document.getElementById('filter-sort').value;
    filtered = this.sortRecords(filtered, sortBy);

    this.filteredRecords = filtered;
    this.updateResultsCount();
    this.updateActiveFiltersCount();
    
    // Pasar registros filtrados a la paginación
    Pagination.setRecords(filtered);
  },

  sortRecords(records, sortBy) {
    const sorted = [...records];

    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      case 'oldest':
        return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      case 'age-asc':
        return sorted.sort((a, b) => a.edad - b.edad);
      
      case 'age-desc':
        return sorted.sort((a, b) => b.edad - a.edad);
      
      case 'name-asc':
        return sorted.sort((a, b) => a.nombres.localeCompare(b.nombres));
      
      case 'name-desc':
        return sorted.sort((a, b) => b.nombres.localeCompare(a.nombres));
      
      case 'votes-desc':
        // MEJORADO: Calcular popularidad basada en votos, comentarios y vistas
        const popularityMap = new Map();
        sorted.forEach(record => {
          popularityMap.set(record.id, this.getPopularityScore(record.id));
        });
        return sorted.sort((a, b) => {
          return popularityMap.get(b.id) - popularityMap.get(a.id);
        });
      
      default:
        return sorted;
    }
  },

  getTotalVotes(recordId) {
    const currentCountry = (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const thread = data.threads[recordId];
    if (!thread || !thread.votes) return 0;
    return (thread.votes.approve || 0) + (thread.votes.reject || 0);
  },

  /**
   * Calcula score de popularidad basado en votos, comentarios y vistas
   */
  getPopularityScore(recordId) {
    const currentCountry = (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const thread = data.threads[recordId];
    
    if (!thread) return 0;
    
    const approveVotes = thread.votes?.approve || 0;
    const rejectVotes = thread.votes?.reject || 0;
    const totalVotes = approveVotes + rejectVotes;
    const comments = thread.comments?.length || 0;
    const views = thread.views || 0;
    
    // Fórmula de popularidad:
    // - Votos tienen peso 3
    // - Comentarios tienen peso 5 (más importante porque indica engagement)
    // - Vistas tienen peso 0.1 (menos importante pero suma)
    const popularityScore = (totalVotes * 3) + (comments * 5) + (views * 0.1);
    
    return popularityScore;
  },

  getRecordStatus(recordId) {
    const currentCountry = (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const thread = data.threads[recordId];
    
    if (!thread || !thread.votes) return 'pending';
    
    const { approve, reject } = thread.votes;
    const total = approve + reject;
    
    if (total === 0) return 'pending';
    
    const approvePercent = (approve / total) * 100;
    
    if (approvePercent >= 70) return 'approved';
    if (approvePercent <= 30) return 'rejected';
    return 'mixed';
  },

  updateResultsCount() {
    const count = this.filteredRecords.length;
    const total = this.allRecords.length;
    const countEl = document.getElementById('results-count');
    
    if (count === total) {
      countEl.textContent = `${total} resultado${total !== 1 ? 's' : ''}`;
    } else {
      countEl.textContent = `${count} de ${total} resultado${total !== 1 ? 's' : ''}`;
    }
  },

  updateActiveFiltersCount() {
    let activeCount = 0;
    
    // Contar filtros activos
    if (this.searchTerm) activeCount++;
    if (document.getElementById('filter-status').value) activeCount++;
    if (document.getElementById('filter-age').value) activeCount++;
    if (document.getElementById('filter-instagram').value) activeCount++;
    if (document.getElementById('filter-extra').value) activeCount++;
    if (document.getElementById('filter-departamento').value) activeCount++;
    if (document.getElementById('filter-distrito').value) activeCount++;
    if (document.getElementById('filter-ocupacion').value) activeCount++;
    if (document.getElementById('filter-ets').value) activeCount++;
    if (document.getElementById('filter-age-min').value) activeCount++;
    if (document.getElementById('filter-age-max').value) activeCount++;
    if (document.getElementById('filter-photo').value) activeCount++;
    
    const countEl = document.getElementById('active-filters-count');
    if (activeCount > 0) {
      countEl.textContent = `${activeCount} filtro${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}`;
      countEl.style.display = 'inline-block';
    } else {
      countEl.style.display = 'none';
    }
    
    // Actualizar badge en el botón de toggle
    this.updateToggleButtonBadge(activeCount);
  },

  updateToggleButtonBadge(count) {
    const toggleBtn = document.getElementById('btn-toggle-filters');
    let badge = toggleBtn.querySelector('.filter-badge');
    
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'filter-badge';
        toggleBtn.style.position = 'relative';
        toggleBtn.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      if (badge) {
        badge.remove();
      }
    }
  },

  clearAllFilters() {
    // Limpiar búsqueda
    document.getElementById('search-input').value = '';
    this.searchTerm = '';
    this.updateClearSearchButton();

    // Limpiar filtros simples
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-age').value = '';
    document.getElementById('filter-instagram').value = '';
    document.getElementById('filter-extra').value = '';

    // Limpiar filtros avanzados
    document.getElementById('filter-departamento').value = '';
    document.getElementById('filter-distrito').value = '';
    document.getElementById('filter-ocupacion').value = '';
    document.getElementById('filter-ets').value = '';
    document.getElementById('filter-age-min').value = '';
    document.getElementById('filter-age-max').value = '';
    document.getElementById('filter-sort').value = 'recent';
    document.getElementById('filter-photo').value = '';

    // Aplicar filtros (mostrará todos)
    this.applyFilters();
    
    UI.showToast('Filtros limpiados', 'info');
  },

  /**
   * Aplica filtro rápido (mini-filtros)
   */
  applyQuickFilter(filterType) {
    // Actualizar botones activos
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');

    // Aplicar ordenamiento según el filtro
    const sortSelect = document.getElementById('filter-sort');
    
    switch (filterType) {
      case 'recent':
        sortSelect.value = 'recent';
        break;
      case 'popular':
        sortSelect.value = 'votes-desc';
        break;
      case 'oldest':
        sortSelect.value = 'oldest';
        break;
      case 'all':
        sortSelect.value = 'recent';
        break;
    }

    // Aplicar filtros
    this.applyFilters();

    // Animación visual
    const tableWrapper = document.querySelector('.table-wrapper');
    tableWrapper.classList.add('filtering');
    setTimeout(() => {
      tableWrapper.classList.remove('filtering');
    }, 300);
  },

  sortBy(column) {
    // Ordenar los registros filtrados
    const sorted = UI.sortRecords([...this.filteredRecords], column);
    
    // Actualizar indicadores visuales
    UI.updateSortIndicators(column);
    
    // Renderizar con paginación
    Pagination.setRecords(sorted);
  }
};

window.Filters = Filters;

// Función global para mini-filtros
function applyQuickFilter(filterType) {
  Filters.applyQuickFilter(filterType);
}
