// Sistema de Paginación
const Pagination = {
  currentPage: 1,
  pageSize: 25,
  totalRecords: 0,
  totalPages: 0,
  records: [],

  /**
   * Inicializa el sistema de paginación
   */
  init() {
    console.log('📄 Sistema de paginación iniciado');
  },

  /**
   * Establece los registros a paginar
   */
  setRecords(records) {
    this.records = records;
    this.totalRecords = records.length;
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    
    // Si la página actual es mayor que el total, volver a la primera
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    this.render();
  },

  /**
   * Obtiene los registros de la página actual
   */
  getCurrentPageRecords() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.records.slice(start, end);
  },

  /**
   * Renderiza la paginación y actualiza la tabla
   */
  render() {
    this.updatePaginationInfo();
    this.updatePaginationButtons();
    this.renderPageNumbers();
    
    // Renderizar solo los registros de la página actual
    const pageRecords = this.getCurrentPageRecords();
    UI.renderTable(pageRecords);
    
    // Scroll suave al inicio de la tabla
    this.scrollToTable();
  },

  /**
   * Actualiza la información de paginación
   */
  updatePaginationInfo() {
    const start = this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalRecords);
    
    const infoText = document.getElementById('pagination-info-text');
    infoText.textContent = `Mostrando ${start}-${end} de ${this.totalRecords} registros`;
  },

  /**
   * Actualiza el estado de los botones de navegación
   */
  updatePaginationButtons() {
    const btnFirst = document.getElementById('btn-first-page');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const btnLast = document.getElementById('btn-last-page');

    // Deshabilitar botones según la página actual
    btnFirst.disabled = this.currentPage === 1;
    btnPrev.disabled = this.currentPage === 1;
    btnNext.disabled = this.currentPage === this.totalPages || this.totalPages === 0;
    btnLast.disabled = this.currentPage === this.totalPages || this.totalPages === 0;
  },

  /**
   * Renderiza los números de página
   */
  renderPageNumbers() {
    const container = document.getElementById('pagination-pages');
    container.innerHTML = '';

    if (this.totalPages === 0) return;

    const maxVisible = 5; // Máximo de números visibles
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    // Ajustar si estamos cerca del final
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Primera página si no está visible
    if (startPage > 1) {
      container.appendChild(this.createPageButton(1));
      if (startPage > 2) {
        container.appendChild(this.createEllipsis());
      }
    }

    // Páginas visibles
    for (let i = startPage; i <= endPage; i++) {
      container.appendChild(this.createPageButton(i));
    }

    // Última página si no está visible
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        container.appendChild(this.createEllipsis());
      }
      container.appendChild(this.createPageButton(this.totalPages));
    }
  },

  /**
   * Crea un botón de número de página
   */
  createPageButton(pageNumber) {
    const button = document.createElement('button');
    button.className = 'page-number-btn';
    button.textContent = pageNumber;
    button.onclick = () => this.goToPage(pageNumber);
    
    if (pageNumber === this.currentPage) {
      button.classList.add('active');
    }
    
    return button;
  },

  /**
   * Crea puntos suspensivos
   */
  createEllipsis() {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    return span;
  },

  /**
   * Va a una página específica
   */
  goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.totalPages) return;
    
    this.currentPage = pageNumber;
    this.render();
  },

  /**
   * Va a la página anterior
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.render();
    }
  },

  /**
   * Va a la página siguiente
   */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.render();
    }
  },

  /**
   * Va a la última página
   */
  goToLastPage() {
    if (this.totalPages > 0) {
      this.currentPage = this.totalPages;
      this.render();
    }
  },

  /**
   * Cambia el tamaño de página
   */
  changePageSize(newSize) {
    this.pageSize = parseInt(newSize);
    this.currentPage = 1; // Volver a la primera página
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    this.render();
  },

  /**
   * Scroll suave al inicio de la tabla
   */
  scrollToTable() {
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Resetea la paginación
   */
  reset() {
    this.currentPage = 1;
    this.render();
  }
};

window.Pagination = Pagination;
