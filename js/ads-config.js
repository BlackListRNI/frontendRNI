// ============================================
// CONFIGURACIÓN DE PUBLICIDAD
// Edita este archivo para personalizar tu información de contacto
// ============================================

const AdsConfig = {
  // Tu información de contacto
  contact: {
    email: 'publicidad@rni.com',
    whatsapp: '+51999999999', // Formato: +código_país + número (sin espacios)
    // Ejemplo: '+51987654321' para Perú
    // Ejemplo: '+52155512345678' para México
  },
  
  // Estadísticas de tu sitio (se muestran en el popup)
  stats: {
    visitors: '10K+',      // Visitantes mensuales
    engagement: '85',      // Porcentaje de engagement
    countries: '20+'       // Países que visitan tu sitio
  },

  // Anuncios activos (solo imagen clickeable)
  ads: [
    {
      id: 'anuncio-1',
      image: '/assets/ads1-compota.jpg',
      link: 'https://wa.me/c/51957750290',
      position: 'left'
    }
    // Agrega más anuncios aquí siguiendo el mismo formato
  ]
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdsConfig;
}
