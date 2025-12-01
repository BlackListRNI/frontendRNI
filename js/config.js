// Configuración del backend de señalización
const CONFIG = {
    // URL del servidor de señalización en Koyeb
    SIGNAL_SERVER: 'https://unemployed-lezlie-rninfiel3s-05cc3585.koyeb.app',
    
    // Configuración de cache
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
    
    // Configuración de chunks
    CHUNK_SIZE: 100,
    MAX_LOCAL_CHUNKS: 5,
    
    // Configuración de sincronización
    SYNC_INTERVAL: 60000, // 1 minuto
    
    // Rate limits
    SUBMIT_COOLDOWN: 30 * 60 * 1000, // 30 minutos
    COMMENT_COOLDOWN: 60 * 60 * 1000, // 1 hora
};

window.CONFIG = CONFIG;
