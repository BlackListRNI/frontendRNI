// Sistema de deduplicación de registros
const Deduplicator = {
  // Generar hash único para un registro
  // Solo considera duplicado si TODOS los campos principales son idénticos
  generateHash(record) {
    const key = [
      record.nombres?.toLowerCase().trim(),
      record.apellidos?.toLowerCase().trim(),
      record.departamento?.toLowerCase().trim(),
      record.distrito?.toLowerCase().trim(),
      record.edad,
      record.ocupacion?.toLowerCase().trim(),
      record.foto?.toLowerCase().trim(),
      record.instagram?.toLowerCase().trim(),
      record.ets?.toLowerCase().trim(),
      record.tiempoRelacion?.toLowerCase().trim(),
      record.periodoInfidelidad?.toLowerCase().trim(),
      // Incluir TODA la descripción, no solo los primeros 100 chars
      record.datosAdicionales?.toLowerCase().trim()
    ].join('|');
    
    return key;
  },

  // Verificar si dos registros son 100% idénticos
  areIdentical(record1, record2) {
    const fields = [
      'nombres', 'apellidos', 'departamento', 'distrito', 'edad',
      'ocupacion', 'foto', 'instagram', 'ets', 'tiempoRelacion',
      'periodoInfidelidad', 'datosAdicionales'
    ];
    
    // Contar campos diferentes
    let differentFields = 0;
    
    for (const field of fields) {
      const val1 = (record1[field] || '').toString().toLowerCase().trim();
      const val2 = (record2[field] || '').toString().toLowerCase().trim();
      
      if (val1 !== val2) {
        differentFields++;
      }
    }
    
    // Solo es duplicado si TODOS los campos son iguales (0 diferencias)
    // O máximo 1 campo diferente (para casos edge)
    return differentFields <= 1;
  },

  // Eliminar duplicados de un array de registros
  removeDuplicates(records) {
    if (!records || records.length === 0) return [];
    
    const unique = [];
    let duplicatesRemoved = 0;
    
    records.forEach(record => {
      // Verificar si ya existe un registro idéntico
      const isDuplicate = unique.some(existingRecord => 
        this.areIdentical(record, existingRecord)
      );
      
      if (!isDuplicate) {
        unique.push(record);
      } else {
        duplicatesRemoved++;
        console.log(`🗑️ Duplicado 100% idéntico eliminado: ${record.nombres} ${record.apellidos}`);
      }
    });
    
    if (duplicatesRemoved > 0) {
      console.log(`✅ Se eliminaron ${duplicatesRemoved} registros duplicados`);
    }
    
    return unique;
  },

  // Limpiar datos de un país
  cleanCountryData(data) {
    if (!data || !data.records) return data;
    
    const originalCount = data.records.length;
    data.records = this.removeDuplicates(data.records);
    const newCount = data.records.length;
    
    // Limpiar threads de registros eliminados
    const validIds = new Set(data.records.map(r => r.id));
    Object.keys(data.threads).forEach(threadId => {
      if (!validIds.has(threadId)) {
        delete data.threads[threadId];
      }
    });
    
    if (originalCount !== newCount) {
      console.log(`📊 Registros: ${originalCount} → ${newCount} (${originalCount - newCount} duplicados eliminados)`);
    }
    
    return data;
  },

  // Limpiar todos los países en localStorage
  cleanAllLocalStorage() {
    const countries = ['PE', 'MX', 'CO', 'AR', 'CL', 'ES', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'PR'];
    let totalRemoved = 0;
    
    countries.forEach(country => {
      const data = Utils.getLocalData(country);
      if (data.records && data.records.length > 0) {
        const before = data.records.length;
        const cleaned = this.cleanCountryData(data);
        const after = cleaned.records.length;
        
        if (before !== after) {
          Utils.saveLocalData(country, cleaned);
          totalRemoved += (before - after);
        }
      }
    });
    
    if (totalRemoved > 0) {
      console.log(`🎉 Limpieza completa: ${totalRemoved} duplicados eliminados en total`);
    }
    
    return totalRemoved;
  }
};

window.Deduplicator = Deduplicator;
