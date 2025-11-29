window.ProfileModule = {
    async renderProfile(container) {
        if (!window.Auth.requireAuth()) return;

        const user = window.Auth.getUser();

        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="profile-header" style="background: var(--color-white); padding: 2rem; border-radius: 4px; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
                    <h2>Mi Perfil</h2>
                    <p style="color: var(--color-text-muted); margin-top: 0.5rem;">
                        <strong>Nombre:</strong> ${user.name}<br>
                        <strong>Email:</strong> ${user.email}<br>
                        <strong>Miembro desde:</strong> ${new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                </div>

                <div class="profile-tabs" style="margin-bottom: 2rem;">
                    <button class="btn btn-primary" onclick="window.ProfileModule.showTab('reportes')" id="tabReportes">
                        Mis Reportes
                    </button>
                    <button class="btn btn-outline" onclick="window.ProfileModule.showTab('disputas')" id="tabDisputas" style="margin-left: 1rem;">
                        Mis Disputas
                    </button>
                </div>

                <div id="profileContent">
                    <div class="loader"></div>
                </div>
            </div>
        `;

        this.showTab('reportes');
    },

    async showTab(tab) {
        const content = document.getElementById('profileContent');
        const user = window.Auth.getUser();

        // Update tab buttons
        document.getElementById('tabReportes').className = tab === 'reportes' ? 'btn btn-primary' : 'btn btn-outline';
        document.getElementById('tabDisputas').className = tab === 'disputas' ? 'btn btn-primary' : 'btn btn-outline';

        if (tab === 'reportes') {
            await this.renderMyReports(content);
        } else {
            await this.renderMyDisputes(content);
        }
    },

    async renderMyReports(container) {
        container.innerHTML = '<div class="loader"></div>';

        try {
            const user = window.Auth.getUser();
            const data = await Api.get(`/users/${user.userId}/reports`);
            const reports = data.reports || [];

            if (reports.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; background: var(--color-white); border-radius: 4px;">
                        <p style="color: var(--color-text-muted); margin-bottom: 1rem;">
                            No has creado ningún reporte aún
                        </p>
                        <a href="#/registrar" data-route="registrar" class="btn btn-primary">
                            Registrar Primer Infiel
                        </a>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="background: var(--color-white); border-radius: 4px; overflow: hidden;">
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th>Verificaciones</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            reports.forEach(report => {
                html += `
                    <tr>
                        <td><strong>${report.reportedName} ${report.reportedLastName}</strong></td>
                        <td>${report.city || '-'}, ${report.department}</td>
                        <td><span class="status-badge status-${report.status}">${this.translateStatus(report.status)}</span></td>
                        <td>${report.verificationScore}</td>
                        <td>${new Date(report.createdAt).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; margin-right: 4px;" 
                                    onclick="window.ProfileModule.editReport('${report._id}')">
                                Editar
                            </button>
                            <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: var(--color-error); border-color: var(--color-error);" 
                                    onclick="window.ProfileModule.deleteReport('${report._id}')">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;

        } catch (error) {
            container.innerHTML = `<p style="color: var(--color-error);">Error cargando reportes: ${error.message}</p>`;
        }
    },

    async renderMyDisputes(container) {
        container.innerHTML = '<div class="loader"></div>';

        try {
            const user = window.Auth.getUser();
            const data = await Api.get(`/users/${user.userId}/disputes`);
            const disputes = data.disputes || [];

            if (disputes.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; background: var(--color-white); border-radius: 4px;">
                        <p style="color: var(--color-text-muted);">
                            No has creado ninguna disputa
                        </p>
                    </div>
                `;
                return;
            }

            let html = '<div style="background: var(--color-white); border-radius: 4px; padding: 1rem;">';
            
            disputes.forEach(dispute => {
                html += `
                    <div style="border-bottom: 1px solid var(--color-border); padding: 1rem 0;">
                        <p><strong>Reporte:</strong> ${dispute.reportId.reportedName} ${dispute.reportId.reportedLastName}</p>
                        <p><strong>Estado:</strong> <span class="status-badge status-${dispute.status}">${this.translateStatus(dispute.status)}</span></p>
                        <p><strong>Fecha:</strong> ${new Date(dispute.createdAt).toLocaleDateString()}</p>
                        <p style="color: var(--color-text-muted); font-size: 0.9rem;">${dispute.statement.substring(0, 100)}...</p>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            container.innerHTML = `<p style="color: var(--color-error);">Error cargando disputas: ${error.message}</p>`;
        }
    },

    async editReport(reportId) {
        window.Toast.info('Función de edición en desarrollo. Por ahora puedes eliminar y crear uno nuevo.', 4000);
    },

    async deleteReport(reportId) {
        // Create confirmation toast
        const confirmToast = window.Toast.show(
            `<div>
                <p style="margin-bottom: 10px;">¿Estás seguro de eliminar este reporte?</p>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.ProfileModule.confirmDelete('${reportId}')" 
                            style="background: var(--color-error); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        Sí, eliminar
                    </button>
                    <button onclick="this.closest('.toast').remove()" 
                            style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        Cancelar
                    </button>
                </div>
            </div>`,
            'warning',
            0 // Don't auto-close
        );
    },

    async confirmDelete(reportId) {
        try {
            await Api.delete(`/reports/${reportId}`);
            window.Toast.success('Reporte eliminado exitosamente');
            setTimeout(() => {
                this.showTab('reportes');
            }, 1000);
        } catch (error) {
            window.Toast.error('Error al eliminar el reporte: ' + error.message);
        }
    },

    translateStatus(status) {
        const map = {
            'pending': 'Pendiente',
            'verified': 'Verificado',
            'disputed': 'En Disputa',
            'rejected': 'Rechazado',
            'under_review': 'En Revisión',
            'accepted': 'Aceptado'
        };
        return map[status] || status;
    }
};
