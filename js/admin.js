// ============================================
// FUNCIONES SECRETAS DE ADMIN
// ============================================

const AdminTools = {
    async exportAllData() {
        try {
            console.log('🔐 Exportando datos de admin...');
            
            const exportData = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                localStorage: {},
                indexedDB: {}
            };

            // Exportar localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('rni_') || key.startsWith('lastSync_') || key.startsWith('uploaded_')) {
                    try {
                        exportData.localStorage[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        exportData.localStorage[key] = localStorage.getItem(key);
                    }
                }
            }

            // Exportar IndexedDB
            if (typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.init();
                
                // Obtener todos los países
                const countries = ['PE', 'MX', 'CO', 'AR', 'CL', 'ES', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'PR'];
                
                for (const country of countries) {
                    try {
                        const data = await IndexedDBStorage.loadData(country);
                        if (data && data.records && data.records.length > 0) {
                            exportData.indexedDB[country] = data;
                        }
                    } catch (e) {
                        // País sin datos
                    }
                }
            }

            // Crear archivo JSON
            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Descargar archivo
            const a = document.createElement('a');
            a.href = url;
            a.download = `rni-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Backup exportado exitosamente');
            
            if (typeof UI !== 'undefined') {
                UI.showToast('✅ Backup exportado', 'success');
            }

            return exportData;
        } catch (error) {
            console.error('Error exportando datos:', error);
            if (typeof UI !== 'undefined') {
                UI.showToast('❌ Error exportando backup', 'error');
            }
        }
    },

    async importData(jsonData) {
        try {
            console.log('🔐 Importando datos de admin...');
            
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Importar localStorage
            if (data.localStorage) {
                for (const [key, value] of Object.entries(data.localStorage)) {
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
            }

            // Importar IndexedDB
            if (data.indexedDB && typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.init();
                
                for (const [country, countryData] of Object.entries(data.indexedDB)) {
                    await IndexedDBStorage.saveData(country, countryData);
                }
            }

            console.log('✅ Datos importados exitosamente');
            
            if (typeof UI !== 'undefined') {
                UI.showToast('✅ Datos importados. Recarga la página.', 'success');
            }

            return true;
        } catch (error) {
            console.error('Error importando datos:', error);
            if (typeof UI !== 'undefined') {
                UI.showToast('❌ Error importando datos', 'error');
            }
            return false;
        }
    },

    getStats() {
        const stats = {
            localStorage: {
                size: 0,
                keys: 0
            },
            countries: {}
        };

        // Stats de localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('rni_')) {
                stats.localStorage.keys++;
                stats.localStorage.size += localStorage.getItem(key).length;
                
                const country = key.replace('rni_', '');
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    stats.countries[country] = {
                        records: data.records?.length || 0,
                        threads: Object.keys(data.threads || {}).length
                    };
                } catch (e) {
                    // Ignorar
                }
            }
        }

        return stats;
    }
};

// Interceptar búsqueda para comando secreto
function initAdminCommands() {
    const searchInput = document.getElementById('search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (e.target.value === 'ADMIN4321') {
                e.target.value = '';
                AdminTools.exportAllData();
            } else if (e.target.value === 'ADMINSTATS') {
                e.target.value = '';
                const stats = AdminTools.getStats();
                console.table(stats.countries);
                console.log('Total localStorage:', (stats.localStorage.size / 1024 / 1024).toFixed(2), 'MB');
                
                if (typeof UI !== 'undefined') {
                    UI.showToast('📊 Stats en consola', 'info');
                }
            }
        });
        console.log('🔐 Comandos admin activados');
    }
}

// Inicializar inmediatamente o cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminCommands);
} else {
    initAdminCommands();
}

window.AdminTools = AdminTools;
