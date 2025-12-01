// Sistema de nombres anónimos con animales
const AnonymousNames = {
  animals: [
    'Panda', 'Oso', 'Koala', 'Tigre', 'León', 'Lobo', 'Zorro', 'Gato',
    'Perro', 'Conejo', 'Mapache', 'Ardilla', 'Búho', 'Águila', 'Halcón',
    'Delfín', 'Ballena', 'Pingüino', 'Foca', 'Nutria', 'Canguro', 'Elefante',
    'Jirafa', 'Cebra', 'Hipopótamo', 'Rinoceronte', 'Gorila', 'Mono',
    'Lemur', 'Perezoso', 'Hormiguero', 'Armadillo', 'Castor', 'Tejón',
    'Comadreja', 'Hurón', 'Marmota', 'Chinchilla', 'Capibara', 'Alpaca',
    'Llama', 'Camello', 'Reno', 'Alce', 'Bisonte', 'Búfalo', 'Yak',
    'Ñu', 'Antílope', 'Gacela', 'Ciervo', 'Venado', 'Jabalí', 'Tapir'
  ],

  /**
   * Genera un nombre anónimo basado en el userId
   * Cada usuario tiene un animal diferente, pero cambia en cada sesión
   */
  generate(userId) {
    // Obtener o crear timestamp de sesión (cambia cada vez que se recarga la página)
    const sessionKey = 'anonymous_session_id';
    let sessionId = sessionStorage.getItem(sessionKey);

    if (!sessionId) {
      // Generar nuevo ID de sesión único
      sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
      sessionStorage.setItem(sessionKey, sessionId);
    }

    // Generar nombre basado en userId + sessionId
    const animal = this.getRandomAnimal(userId, sessionId);
    return `${animal} Anónimo`;
  },

  /**
   * Obtiene un animal aleatorio pero consistente para un userId en esta sesión
   */
  getRandomAnimal(userId, sessionId) {
    // Combinar userId con sessionId para que cada usuario tenga un animal diferente
    // pero que cambie en cada sesión
    const combined = userId + sessionId;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    
    const index = Math.abs(hash) % this.animals.length;
    return this.animals[index];
  },

  /**
   * Fuerza un cambio de nombre (para testing)
   */
  regenerate(userId) {
    sessionStorage.removeItem('anonymous_name_session');
    sessionStorage.removeItem('session_start');
    return this.generate(userId);
  },

  /**
   * Obtiene el nombre actual sin generar uno nuevo
   */
  getCurrent() {
    return sessionStorage.getItem('anonymous_name_session') || null;
  }
};

window.AnonymousNames = AnonymousNames;
