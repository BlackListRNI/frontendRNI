// Algoritmo de recomendación basado en preferencias del usuario
const Algorithm = {
  // Obtener clave única del usuario (fingerprint o userId)
  async getUserKey() {
    try {
      const identity = await Fingerprint.getUserIdentity();
      return identity.fingerprint || identity.ip || Utils.getUserId();
    } catch (error) {
      return Utils.getUserId();
    }
  },

  // Obtener preferencias del usuario desde localStorage
  async getPreferences() {
    const userKey = await this.getUserKey();
    const storageKey = `user_preferences_${userKey}`;
    const prefs = localStorage.getItem(storageKey);
    return prefs ? JSON.parse(prefs) : {
      userKey,
      likedWords: {},
      dislikedWords: {},
      preferredTextLength: 'medium',
      likedDepartments: {},
      likedAges: {},
      likedOccupations: {},
      interactions: []
    };
  },

  // Guardar preferencias
  async savePreferences(prefs) {
    const userKey = await this.getUserKey();
    const storageKey = `user_preferences_${userKey}`;
    prefs.userKey = userKey;
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  },

  // Registrar interacción (like o dislike)
  async recordInteraction(record, liked) {
    const prefs = await this.getPreferences();
    
    // Registrar interacción
    prefs.interactions.push({
      recordId: record.id,
      liked,
      hasPhoto: !!record.foto,
      textLength: record.datosAdicionales?.length || 0,
      timestamp: Date.now()
    });
    
    // Mantener solo las últimas 100 interacciones
    if (prefs.interactions.length > 100) {
      prefs.interactions = prefs.interactions.slice(-100);
    }
    
    // Analizar preferencia de fotos (más agresivo)
    if (!prefs.photoPreference) {
      prefs.photoPreference = { withPhoto: 0, withoutPhoto: 0 };
    }
    
    if (record.foto) {
      prefs.photoPreference.withPhoto += liked ? 3 : -2;
    } else {
      prefs.photoPreference.withoutPhoto += liked ? 3 : -2;
    }
    
    if (liked) {
      // Analizar texto de datos adicionales
      if (record.datosAdicionales) {
        this.analyzeText(record.datosAdicionales, prefs.likedWords);
        
        // Determinar longitud de texto preferida (más preciso)
        const textLength = record.datosAdicionales.length;
        if (!prefs.textLengthPreference) {
          prefs.textLengthPreference = { short: 0, medium: 0, long: 0 };
        }
        
        if (textLength < 100) {
          prefs.textLengthPreference.short += 2;
        } else if (textLength > 300) {
          prefs.textLengthPreference.long += 2;
        } else {
          prefs.textLengthPreference.medium += 2;
        }
      }
      
      // Registrar departamento (más peso)
      if (record.departamento) {
        prefs.likedDepartments[record.departamento] = (prefs.likedDepartments[record.departamento] || 0) + 2;
      }
      
      // Registrar edad (más peso)
      const ageRange = this.getAgeRange(record.edad);
      prefs.likedAges[ageRange] = (prefs.likedAges[ageRange] || 0) + 2;
      
      // Registrar ocupación (más peso)
      if (record.ocupacion && record.ocupacion !== 'No especificado') {
        prefs.likedOccupations[record.ocupacion] = (prefs.likedOccupations[record.ocupacion] || 0) + 2;
      }
    } else {
      // Penalizar lo que no le gustó (más agresivo)
      if (record.datosAdicionales) {
        this.analyzeText(record.datosAdicionales, prefs.dislikedWords);
        
        const textLength = record.datosAdicionales.length;
        if (!prefs.textLengthPreference) {
          prefs.textLengthPreference = { short: 0, medium: 0, long: 0 };
        }
        
        if (textLength < 100) {
          prefs.textLengthPreference.short -= 1;
        } else if (textLength > 300) {
          prefs.textLengthPreference.long -= 1;
        } else {
          prefs.textLengthPreference.medium -= 1;
        }
      }
      
      // Penalizar departamento
      if (record.departamento) {
        prefs.likedDepartments[record.departamento] = (prefs.likedDepartments[record.departamento] || 0) - 1;
      }
      
      // Penalizar edad
      const ageRange = this.getAgeRange(record.edad);
      prefs.likedAges[ageRange] = (prefs.likedAges[ageRange] || 0) - 1;
      
      // Penalizar ocupación
      if (record.ocupacion && record.ocupacion !== 'No especificado') {
        prefs.likedOccupations[record.ocupacion] = (prefs.likedOccupations[record.ocupacion] || 0) - 1;
      }
    }
    
    await this.savePreferences(prefs);
  },

  // Analizar texto y extraer palabras clave
  analyzeText(text, wordMap) {
    // Palabras comunes a ignorar
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
      'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
      'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
      'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy', 'sin',
      'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo',
      'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
      'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella',
      'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'cosa',
      'tanto', 'hombre', 'parecer', 'nuestro', 'tan', 'donde', 'ahora', 'parte',
      'después', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar', 'dejar'
    ]);
    
    // Extraer palabras (3+ caracteres)
    const words = text.toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));
    
    // Contar frecuencia
    words.forEach(word => {
      wordMap[word] = (wordMap[word] || 0) + 1;
    });
  },

  // Obtener rango de edad
  getAgeRange(age) {
    if (age < 25) return '18-24';
    if (age < 30) return '25-29';
    if (age < 35) return '30-34';
    if (age < 40) return '35-39';
    return '40+';
  },

  // Calcular score de un registro basado en preferencias
  calculateScore(record, prefs, country) {
    let score = 0;
    
    // Score base por popularidad (votos, comentarios, vistas) - MEJORADO
    const data = Utils.getLocalData(country);
    const thread = data.threads[record.id];
    if (thread) {
      const approveVotes = thread.votes.approve || 0;
      const rejectVotes = thread.votes.reject || 0;
      const totalVotes = approveVotes + rejectVotes;
      const comments = thread.comments?.length || 0;
      const views = thread.views || 0;
      
      // Fórmula de popularidad: votos + comentarios + vistas
      const popularityScore = (totalVotes * 3) + (comments * 5) + (views * 0.1);
      score += Math.log(popularityScore + 1) * 5;
    }
    
    // Score por recencia - reducido
    const daysSinceCreated = (Date.now() - record.createdAt) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceCreated); // Reducido de 20 a 10
    
    // Score por preferencia de fotos (MUY IMPORTANTE)
    if (prefs.photoPreference) {
      const withPhotoScore = prefs.photoPreference.withPhoto || 0;
      const withoutPhotoScore = prefs.photoPreference.withoutPhoto || 0;
      
      if (record.foto && withPhotoScore > 0) {
        score += withPhotoScore * 20; // Aumentado de 10 a 20
      } else if (!record.foto && withoutPhotoScore > 0) {
        score += withoutPhotoScore * 20; // Aumentado de 10 a 20
      }
      
      // Penalizar fuertemente lo contrario
      if (record.foto && withoutPhotoScore > withPhotoScore) {
        score -= (withoutPhotoScore - withPhotoScore) * 15;
      } else if (!record.foto && withPhotoScore > withoutPhotoScore) {
        score -= (withPhotoScore - withoutPhotoScore) * 15;
      }
    }
    
    // Score por palabras en datos adicionales (MUY IMPORTANTE)
    if (record.datosAdicionales && Object.keys(prefs.likedWords).length > 0) {
      const text = record.datosAdicionales.toLowerCase();
      let wordScore = 0;
      
      Object.entries(prefs.likedWords).forEach(([word, count]) => {
        const occurrences = (text.match(new RegExp(word, 'g')) || []).length;
        wordScore += occurrences * count * 15; // Aumentado de 5 a 15
      });
      
      // Penalizar FUERTEMENTE por palabras que no le gustan
      Object.entries(prefs.dislikedWords).forEach(([word, count]) => {
        const occurrences = (text.match(new RegExp(word, 'g')) || []).length;
        wordScore -= occurrences * count * 10; // Aumentado de 3 a 10
      });
      
      score += wordScore;
    }
    
    // Score por longitud de texto preferida (MUY IMPORTANTE)
    if (record.datosAdicionales && prefs.textLengthPreference) {
      const textLength = record.datosAdicionales.length;
      const shortPref = prefs.textLengthPreference.short || 0;
      const mediumPref = prefs.textLengthPreference.medium || 0;
      const longPref = prefs.textLengthPreference.long || 0;
      
      if (textLength < 100 && shortPref > 0) {
        score += shortPref * 25; // Aumentado de 15 a 25
      } else if (textLength > 300 && longPref > 0) {
        score += longPref * 25;
      } else if (textLength >= 100 && textLength <= 300 && mediumPref > 0) {
        score += mediumPref * 25;
      }
      
      // Penalizar lo contrario
      if (textLength < 100 && shortPref < 0) {
        score += shortPref * 20; // Negativo
      } else if (textLength > 300 && longPref < 0) {
        score += longPref * 20;
      } else if (textLength >= 100 && textLength <= 300 && mediumPref < 0) {
        score += mediumPref * 20;
      }
    }
    
    // Score por departamento
    if (record.departamento && prefs.likedDepartments[record.departamento]) {
      const deptScore = prefs.likedDepartments[record.departamento];
      score += deptScore * 12; // Aumentado de 8 a 12
    }
    
    // Score por edad
    const ageRange = this.getAgeRange(record.edad);
    if (prefs.likedAges[ageRange]) {
      const ageScore = prefs.likedAges[ageRange];
      score += ageScore * 10; // Aumentado de 6 a 10
    }
    
    // Score por ocupación
    if (record.ocupacion && prefs.likedOccupations[record.ocupacion]) {
      const occScore = prefs.likedOccupations[record.ocupacion];
      score += occScore * 12; // Aumentado de 7 a 12
    }
    
    return score;
  },

  // Obtener registros recomendados
  async getRecommendations(allRecords, country, count = 50) {
    const prefs = await this.getPreferences();
    
    // Filtrar registros ya vistos
    const seenIds = new Set(prefs.interactions.map(i => i.recordId));
    const unseenRecords = allRecords.filter(r => !seenIds.has(r.id));
    
    // Si no hay registros sin ver, resetear
    if (unseenRecords.length === 0) {
      prefs.interactions = [];
      await this.savePreferences(prefs);
      return await this.getRecommendations(allRecords, country, count);
    }
    
    // Calcular score para cada registro
    const scoredRecords = unseenRecords.map(record => ({
      record,
      score: this.calculateScore(record, prefs, country)
    }));
    
    // Ordenar por score
    scoredRecords.sort((a, b) => b.score - a.score);
    
    // Mezclar: 85% top scores, 15% aleatorio (más enfocado en preferencias)
    const topCount = Math.floor(count * 0.85);
    const randomCount = count - topCount;
    
    const topRecords = scoredRecords.slice(0, topCount).map(s => s.record);
    const remainingRecords = scoredRecords.slice(topCount);
    const randomRecords = this.shuffleArray(remainingRecords)
      .slice(0, randomCount)
      .map(s => s.record);
    
    return [...topRecords, ...randomRecords];
  },

  // Mezclar array (Fisher-Yates)
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

window.Algorithm = Algorithm;
