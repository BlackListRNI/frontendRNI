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
            e.stopPropagation();
            
            const onclick = clickableName.getAttribute('onclick');
            if (onclick) {
                // Extraer el recordId del onclick
                const match = onclick.match(/App\.openThread\('([^']+)'\)/);
                if (match && match[1]) {
                    const recordId = match[1];
                    const currentCountry = App.currentCountry || localStorage.getItem('selectedCountry') || 'PE';
                    
                    // Redirigir a details.html
                    window.location.href = `/details.html?id=${recordId}&country=${currentCountry}`;
                }
            }
        }
    });

    // Interceptar clicks en botones "Ver todo el chisme"
    document.addEventListener('click', (e) => {
        const viewDetailsBtn = e.target.closest('.btn-view-details');
        if (viewDetailsBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const onclick = viewDetailsBtn.getAttribute('onclick');
            if (onclick) {
                // Extraer el recordId
                const match = onclick.match(/App\.viewDetails\('([^']+)'\)/);
                if (match && match[1]) {
                    const recordId = match[1];
                    const currentCountry = App.currentCountry || localStorage.getItem('selectedCountry') || 'PE';
                    
                    // Redirigir a details.html
                    window.location.href = `/details.html?id=${recordId}&country=${currentCountry}`;
                }
            }
        }
    });
});
