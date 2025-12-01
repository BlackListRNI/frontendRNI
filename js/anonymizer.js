// Sistema de Anonimización para Protección Legal
// Los datos originales NO se modifican, solo la visualización
const Anonymizer = {
  // Configuración
  config: {
    enabled: true, // Activar/desactivar anonimización
    showRealNames: false, // Nunca mostrar nombres reales
    showPhotos: false, // Nunca mostrar fotos reales
  },

  /**
   * Anonimiza un registro para visualización
   * NO modifica el objeto original
   */
  anonymizeRecord(record) {
    if (!this.config.enabled) return record;

    // Crear copia para no modificar original
    const anonymized = { ...record };

    // Anonimizar nombres
    anonymized.nombres = 'Anónimo';
    anonymized.apellidos = ''; // Ocultar apellidos

    // Anonimizar foto
    if (anonymized.foto) {
      anonymized.foto = ''; // No mostrar foto
      anonymized._hasPhoto = true; // Marcar que tenía foto
    }

    // Cambiar contexto de ubicación
    anonymized._originalDepartamento = anonymized.departamento;
    anonymized._originalDistrito = anonymized.distrito;
    
    // Mantener ubicación pero con contexto de "anécdota"
    // Los datos originales se mantienen para búsquedas

    return anonymized;
  },

  /**
   * Anonimiza un array de registros
   */
  anonymizeRecords(records) {
    if (!this.config.enabled || !records) return records;
    return records.map(r => this.anonymizeRecord(r));
  },

  /**
   * Obtiene el nombre para mostrar
   */
  getDisplayName(record) {
    return this.config.enabled ? 'Anónimo' : `${record.nombres} ${record.apellidos}`;
  },

  /**
   * Obtiene la foto para mostrar
   */
  getDisplayPhoto(record) {
    if (!this.config.enabled) return record.foto;
    return ''; // No mostrar fotos
  },

  /**
   * Obtiene el contexto de ubicación
   */
  getLocationContext() {
    return this.config.enabled ? 'de la anécdota' : '';
  }
};

window.Anonymizer = Anonymizer;
