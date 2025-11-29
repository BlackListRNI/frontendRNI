document.addEventListener('DOMContentLoaded', () => {
    const app = {
        init() {
            this.router();
            this.bindEvents();
            window.Auth.updateNav();
        },

        bindEvents() {
            // Handle navigation links
            document.querySelectorAll('a[data-route]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const route = e.target.getAttribute('data-route');
                    window.location.hash = '#/' + route;
                });
            });

            // Handle hash changes
            window.addEventListener('hashchange', () => {
                this.router();
            });
        },

        router() {
            const hash = window.location.hash.slice(2) || 'home'; // Remove #/
            this.loadView(hash);
        },

        async loadView(viewName) {
            const content = document.getElementById('app-content');
            content.innerHTML = '<div class="loader"></div>';

            try {
                // Check if it's a thread view
                if (viewName.startsWith('hilo/')) {
                    const reportId = viewName.split('/')[1];
                    if (window.ReportsModule) {
                        await window.ReportsModule.renderThread(content, reportId);
                    }
                    return;
                }

                switch (viewName) {
                    case 'home':
                        if (window.ReportsModule) {
                            await window.ReportsModule.renderList(content);
                        }
                        break;
                    case 'registrar':
                        if (window.ReportsModule) {
                            window.ReportsModule.renderForm(content);
                        }
                        break;
                    case 'login':
                        if (window.AuthModule) {
                            window.AuthModule.renderLogin(content);
                        }
                        break;
                    case 'registro':
                        if (window.AuthModule) {
                            window.AuthModule.renderRegister(content);
                        }
                        break;
                    case 'perfil':
                        if (window.ProfileModule) {
                            await window.ProfileModule.renderProfile(content);
                        }
                        break;
                    default:
                        content.innerHTML = '<h1>404 - Página no encontrada</h1>';
                }
            } catch (error) {
                console.error('Error loading view:', error);
                content.innerHTML = `<p class="text-center" style="color:var(--color-error)">Error al cargar la página: ${error.message}</p>`;
            }
        }
    };

    app.init();
});
