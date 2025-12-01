// ============================================
// MANEJADOR DE CLICKS MEJORADO
// ============================================
// Asegura que los clicks en nombres/botones funcionen correctamente

window.addEventListener('DOMContentLoaded', () => {
    // Interceptar clicks en nombres (delegación de eventos)
    document.addEventListener('click', async (e) => {
        const clickableName = e.target.closest('.clickable-name');
        if (clickableName) {
            e.preventDefault();
            const onclick = clickableName.getAttribute('onclick');
            if (onclick) {
                // Extraer el recordId del onclick
                const match = onclick.match(/App\.openThread\('([^']+)'\)/);
                if (match && match[1]) {
                    const recordId = match[1];
                    await App.openThread(recordId);
                }
            }
        }
    });

    // Interceptar clicks en botones "Ver todo el chisme"
    document.addEventListener('click', (e) => {
        const viewDetailsBtn = e.target.closest('.btn-view-details');
        if (viewDetailsBtn) {
            const onclick = viewDetailsBtn.getAttribute('onclick');
            if (onclick) {
                // Extraer el recordId
                const match = onclick.match(/App\.viewDetails\('([^']+)'\)/);
                if (match && match[1]) {
                    const recordId = match[1];
                    // Asegurarse de que los datos estén sincronizados antes de navegar
                    const currentCountry = App.currentCountry || localStorage.getItem('selectedCountry') || 'PE';
                    
                    // Guardar en sessionStorage para que details.html lo use
                    sessionStorage.setItem('pendingRecordId', recordId);
                    sessionStorage.setItem('pendingCountry', currentCountry);
                }
            }
        }
    });
});

// Helper para asegurar que los datos estén disponibles
window.ensureRecordAvailable = async (recordId, country) => {
    let data = { records: [], threads: {} };
    
    // 1. Intentar IndexedDB
    if (typeof IndexedDBStorage !== 'undefined') {
        try {
            await IndexedDBStorage.init();
            data = await IndexedDBStorage.loadData(country);
        } catch (error) {
            console.error('Error cargando desde IndexedDB:', error);
        }
    }
    
    // 2. Fallback a localStorage
    if (!data.records || data.records.length === 0) {
        data = Utils.getLocalData(country);
    }
    
    // 3. Verificar si el registro existe
    const record = data.records.find(r => r.id === recordId);
    
    if (!record) {
        console.log('🔄 Registro no encontrado localmente, sincronizando...');
        
        // 4. Sincronizar con servidor
        try {
            const result = await API.sync(country, data);
            if (result && result.records) {
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.saveData(country, result);
                } else {
                    Utils.saveLocalData(country, result);
                }
                data = result;
            }
        } catch (error) {
            console.error('Error sincronizando:', error);
        }
    }
    
    return data.records.find(r => r.id === recordId);
};
