// Auto-configuration based on environment
(function() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
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
        
        // Production on DuckDNS
        'coquettecraft.duckdns.org': {
            apiUrl: 'http://coquettecraft.duckdns.org:3070/api',
            environment: 'production'
        }
    };
    
    // Get config or use fallback
    let config = configs[hostname];
    
    if (!config) {
        // Fallback: same host, port 3070
        config = {
            apiUrl: `${protocol}//${hostname}:3070/api`,
            environment: 'production'
        };
    }
    
    // Set global config
    window.APP_CONFIG = {
        API_URL: config.apiUrl,
        ENVIRONMENT: config.environment,
        HOSTNAME: hostname
    };
    
    // Log configuration
    console.log('🌐 Environment:', config.environment);
    console.log('🔗 API URL:', config.apiUrl);
    console.log('📍 Hostname:', hostname);
})();
