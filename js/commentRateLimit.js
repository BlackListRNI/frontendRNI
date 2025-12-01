// Sistema de Rate Limiting para comentarios
const CommentRateLimit = {
  // Configuración por defecto
  defaultCooldown: 60 * 60 * 1000, // 1 hora en milisegundos

  /**
   * Verifica si el usuario puede comentar
   */
  canComment(recordId, userId, country = null) {
    const lastCommentKey = `last_comment_${recordId}_${userId}`;
    const lastCommentTime = localStorage.getItem(lastCommentKey);

    if (!lastCommentTime) {
      return { allowed: true };
    }

    const timeSinceLastComment = Date.now() - parseInt(lastCommentTime);
    const cooldown = this.getCooldownForRecord(recordId, country);

    if (timeSinceLastComment < cooldown) {
      const remainingTime = cooldown - timeSinceLastComment;
      return {
        allowed: false,
        remainingTime,
        message: this.formatRemainingTime(remainingTime),
      };
    }

    return { allowed: true };
  },

  /**
   * Registra que el usuario ha comentado
   */
  recordComment(recordId, userId) {
    const lastCommentKey = `last_comment_${recordId}_${userId}`;
    localStorage.setItem(lastCommentKey, Date.now().toString());
  },

  /**
   * Obtiene el cooldown configurado para un registro
   */
  getCooldownForRecord(recordId, country = null) {
    // Intentar obtener país de diferentes fuentes
    const currentCountry = country || 
                          (typeof App !== 'undefined' ? App.currentCountry : null) || 
                          localStorage.getItem('selectedCountry') || 
                          'PE';
    const data = Utils.getLocalData(currentCountry);
    const record = data.records.find(r => r.id === recordId);

    // Si el creador configuró un cooldown personalizado
    if (record && record.commentCooldown) {
      return record.commentCooldown;
    }

    // Usar cooldown por defecto
    return this.defaultCooldown;
  },

  /**
   * Formatea el tiempo restante en formato legible
   */
  formatRemainingTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Limpia registros antiguos (más de 7 días)
   */
  cleanup() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith('last_comment_')) {
        try {
          const timestamp = parseInt(localStorage.getItem(key));
          if (timestamp < sevenDaysAgo) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.error('Error limpiando rate limit:', error);
        }
      }
    }
  },

  /**
   * Obtiene opciones de cooldown para el formulario
   */
  getCooldownOptions() {
    return [
      { value: 5 * 60 * 1000, label: '5 minutos' },
      { value: 15 * 60 * 1000, label: '15 minutos' },
      { value: 30 * 60 * 1000, label: '30 minutos' },
      { value: 60 * 60 * 1000, label: '1 hora (recomendado)' },
      { value: 2 * 60 * 60 * 1000, label: '2 horas' },
      { value: 6 * 60 * 60 * 1000, label: '6 horas' },
      { value: 24 * 60 * 60 * 1000, label: '24 horas' },
    ];
  },
};

// Limpiar registros antiguos al cargar
CommentRateLimit.cleanup();

window.CommentRateLimit = CommentRateLimit;
