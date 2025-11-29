// Auto-configuration based on environment
(function() {
    const hostname = window.location.hostname;
    
    // Configuration map
    const configs = {
        // Local development
        'localhost': {
            apiUrl: 'http://localhost:3070/api',
            environment: 'development'
        },
        '127.0.0.1': {
            apiUrl: 'http://localhost:3070/api',
            environment: 'development'
        },
        
        // Production on Netlify - Backend en Koyeb
        'registronacionaldeinfieles.netlify.app': {
            apiUrl: 'https://TU-APP-KOYEB.koyeb.app/api', // ⚠️ ACTUALIZAR después del deploy
            environment: 'production'
        }
    };
    
    // Get config or use default production
    let config = configs[hostname] || {
        apiUrl: 'https://TU-APP-KOYEB.koyeb.app/api', // ⚠️ ACTUALIZAR después del deploy
        environment: 'production'
    };
    
    // Set global config
    window.APP_CONFIG = {
        API_URL: config.apiUrl,
        ENVIRONMENT: config.environment,
        HOSTNAME: hostname
    };
    
    // Log configuration for debugging
    console.log('🌐 Environment:', config.environment);
    console.log('🔗 API URL:', config.apiUrl);
    console.log('📍 Hostname:', hostname);
    console.log('✅ Config loaded successfully');
})();
