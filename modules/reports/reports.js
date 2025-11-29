window.ReportsModule = {
    async renderList(container) {
        container.innerHTML = `
            <div class="reports-header">
                <h2>Registro Público de Infieles</h2>
                <div class="reports-controls">
                    <input type="text" id="searchReports" class="search-input" placeholder="Buscar por nombre, ciudad...">
                    <button class="btn btn-primary" onclick="window.location.hash='#/registrar'">+ Registrar Infiel</button>
                </div>
            </div>
            <div id="reportsTableContainer" class="reports-table-container">
                <div class="loader"></div>
            </div>
        `;

        try {
            const data = await Api.get('/reports?country=PE');
            this.renderTable(data.reports || []);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('reportsTableContainer').innerHTML =
                `<p class="text-center" style="color:var(--color-error)">Error cargando reportes: ${error.message}</p>`;
        }
    },

    renderTable(reports) {
        const container = document.getElementById('reportsTableContainer');

        if (reports.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 2rem;">No hay reportes registrados aún.</p>';
            return;
        }

        let html = `
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Ubicación</th>
                        <th>Edad</th>
                        <th>Ocupación</th>
                        <th>Estado</th>
                        <th>ETS</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const user = window.Auth.getUser();
        
        reports.forEach(report => {
            const isMyReport = user && report.reporterIds && report.reporterIds.includes(user.userId);
            const rowStyle = isMyReport ? 'background: #e8f5e9; cursor: pointer;' : 'cursor: pointer;';
            
            html += `
                <tr onclick="window.ReportsModule.openDetail('${report._id}')" style="${rowStyle}">
                    <td>
                        <strong>${report.reportedName} ${report.reportedLastName}</strong>
                        ${isMyReport ? '<span style="color: #4caf50; margin-left: 5px;">✓ Tu reporte</span>' : ''}
                    </td>
                    <td>${report.city || '-'}, ${report.department}</td>
                    <td>${report.age}</td>
                    <td>${report.occupation}</td>
                    <td><span class="status-badge status-${report.status}">${this.translateStatus(report.status)}</span></td>
                    <td style="text-align: center;">
                        ${report.hasSTD ? '<span style="color: #c62828; font-size: 1.2rem;" title="Alerta ETS">⚠️</span>' : '-'}
                    </td>
                    <td><button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.7rem;">Ver Hilo</button></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    async openDetail(reportId) {
        window.location.hash = `#/hilo/${reportId}`;
    },

    renderForm(container) {
        container.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto;">
                <h2>Registrar Infiel</h2>
                <p class="mb-2">Ayuda a la comunidad reportando casos verificables de infidelidad.</p>
                
                <form id="createReportForm" onsubmit="window.ReportsModule.submitReport(event)">
                    <div class="form-group">
                        <label class="form-label">Nombres</label>
                        <input type="text" name="reportedName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Apellidos</label>
                        <input type="text" name="reportedLastName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Departamento</label>
                        <input type="text" name="department" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Distrito</label>
                        <input type="text" name="district" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Edad Aproximada</label>
                        <input type="number" name="age" class="form-input" required min="18">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ocupación</label>
                        <input type="text" name="occupation" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Evidencias (Opcional)</label>
                        <input type="file" id="evidenceFiles" accept="image/*" multiple class="form-input" 
                               onchange="window.ReportsModule.previewEvidence(event)">
                        <small style="color: var(--color-text-muted); display: block; margin-top: 4px;">
                            Máximo 5 imágenes, 2MB cada una
                        </small>
                        <div id="evidencePreview" style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Información Adicional (Opcional)</label>
                        <textarea name="additionalInfo" class="form-textarea" maxlength="2000"></textarea>
                    </div>

                    <div class="form-group" style="border-top: 2px solid #ddd; padding-top: 1rem; margin-top: 1rem;">
                        <h4 style="color: var(--color-error); margin-bottom: 1rem;">⚠️ Alerta de Salud (ETS)</h4>
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" name="hasSTD" id="hasSTD" onchange="window.ReportsModule.toggleSTDFields()">
                            <span>Esta persona tiene o tuvo una Enfermedad de Transmisión Sexual</span>
                        </label>
                        <div id="stdFields" style="display: none; margin-top: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Detalles de ETS (Opcional)</label>
                                <textarea name="stdInfo" class="form-textarea" maxlength="500" 
                                          placeholder="Tipo de ETS, evidencias, contexto..."></textarea>
                                <small style="color: var(--color-text-muted);">Esta información ayuda a proteger a la comunidad</small>
                            </div>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="isTreated">
                                <span>Está recibiendo tratamiento</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group" style="border-top: 2px solid #ddd; padding-top: 1rem; margin-top: 1rem;">
                        <h4 style="margin-bottom: 1rem;">📅 Período de Relación (Opcional)</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label class="form-label">Desde</label>
                                <input type="date" name="startDate" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Hasta</label>
                                <input type="date" name="endDate" class="form-input">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Anécdotas (Opcional)</label>
                        <textarea name="anecdotes" class="form-textarea" maxlength="2000" 
                                  placeholder="Comparte experiencias, situaciones o detalles relevantes de la relación..."></textarea>
                        <small style="color: var(--color-text-muted);">Esto ayuda a otros a identificar patrones de comportamiento</small>
                    </div>

                    <div class="form-group mt-2">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Registrar Infiel</button>
                    </div>
                </form>
            </div>
        `;
    },

    toggleSTDFields() {
        const checkbox = document.getElementById('hasSTD');
        const fields = document.getElementById('stdFields');
        fields.style.display = checkbox.checked ? 'block' : 'none';
    },

    previewEvidence(event) {
        const files = event.target.files;
        const preview = document.getElementById('evidencePreview');
        preview.innerHTML = '';

        if (files.length > 5) {
            window.Toast.error('Máximo 5 imágenes permitidas');
            event.target.value = '';
            return;
        }

        Array.from(files).forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                window.Toast.error(`${file.name} es demasiado grande. Máximo 2MB`);
                event.target.value = '';
                preview.innerHTML = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width: 100px; height: 100px; object-fit: cover; border-radius: 4px;';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    },

    async submitReport(event) {
        event.preventDefault();
        
        if (!window.Auth.isLoggedIn()) {
            window.Toast.warning('Debes iniciar sesión para registrar un infiel');
            setTimeout(() => window.location.hash = '#/login', 1000);
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const files = document.getElementById('evidenceFiles').files;
        const evidence = [];

        for (let file of files) {
            if (file.size > 2 * 1024 * 1024) {
                window.Toast.error(`${file.name} supera el límite de 2MB`);
                return;
            }
            const base64 = await this.fileToBase64(file);
            evidence.push(base64);
        }

        data.evidence = evidence;
        data.deviceFingerprint = window.DeviceFingerprint.generate();
        data.age = parseInt(data.age);
        data.hasSTD = document.getElementById('hasSTD').checked;
        data.isTreated = data.isTreated === 'on';
        
        if (data.startDate || data.endDate) {
            data.relationshipPeriod = {
                startDate: data.startDate,
                endDate: data.endDate
            };
        }

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            
            await Api.post('/reports', data);
            
            window.Sound.playSuccess();
            window.Toast.success('¡Infiel registrado exitosamente!');
            
            setTimeout(() => window.location.hash = '#/perfil', 1500);
        } catch (error) {
            window.Toast.error(error.message || 'Error al enviar el reporte');
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Registrar Infiel';
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async renderThread(container, reportId) {
        container.innerHTML = '<div class="loader"></div>';

        try {
            const report = await Api.get(`/reports/${reportId}`);

            container.innerHTML = `
                <div style="max-width: 900px; margin: 0 auto;">
                    <button class="btn btn-outline" onclick="window.location.hash='#/'" style="margin-bottom: 1rem;">
                        ← Volver
                    </button>

                    <div style="background: white; padding: 2rem; border-radius: 4px; margin-bottom: 2rem;">
                        <h2>${report.reportedName} ${report.reportedLastName}</h2>
                        <p>${report.age} años • ${report.occupation} • ${report.district}, ${report.department}</p>
                        
                        <div style="margin-top: 1rem;">
                            <span class="status-badge status-${report.status}">${this.translateStatus(report.status)}</span>
                            <span style="margin-left: 10px; padding: 4px 12px; background: #e3f2fd; border-radius: 12px;">
                                ${report.communityStatus || 'Pendiente'}
                            </span>
                            ${report.hasSTD ? `
                                <span style="margin-left: 10px; padding: 4px 12px; background: #ffebee; color: #c62828; border-radius: 12px; font-weight: bold;">
                                    ⚠️ Alerta ETS
                                </span>
                            ` : ''}
                        </div>

                        ${report.hasSTD ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: #ffebee; border-left: 4px solid #c62828; border-radius: 4px;">
                                <strong style="color: #c62828;">⚠️ Alerta de Salud Pública</strong>
                                <p style="margin-top: 0.5rem;">Esta persona ha sido reportada con ETS.</p>
                                ${report.stdInfo ? `<p style="margin-top: 0.5rem;"><strong>Detalles:</strong> ${report.stdInfo}</p>` : ''}
                                <p style="margin-top: 0.5rem;"><strong>Tratamiento:</strong> ${report.isTreated ? '✅ En tratamiento' : '❌ No confirmado'}</p>
                            </div>
                        ` : ''}

                        ${report.relationshipPeriod && (report.relationshipPeriod.startDate || report.relationshipPeriod.endDate) ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
                                <strong>📅 Período de Relación:</strong>
                                ${report.relationshipPeriod.startDate ? `Desde ${new Date(report.relationshipPeriod.startDate).toLocaleDateString()}` : ''}
                                ${report.relationshipPeriod.endDate ? ` hasta ${new Date(report.relationshipPeriod.endDate).toLocaleDateString()}` : ' (continúa)'}
                            </div>
                        ` : ''}

                        ${report.anecdotes ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                                <strong>📖 Anécdotas:</strong>
                                <p style="margin-top: 0.5rem;">${report.anecdotes}</p>
                            </div>
                        ` : ''}

                        ${report.additionalInfo ? `<p style="margin-top: 1rem;">${report.additionalInfo}</p>` : ''}
                        
                        ${report.evidence && report.evidence.length > 0 ? `
                            <div style="display: flex; gap: 10px; margin-top: 1rem; flex-wrap: wrap;">
                                ${report.evidence.map(e => `<img src="${e.url}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="window.open('${e.url}', '_blank')">`).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div style="background: white; padding: 2rem; border-radius: 4px;">
                        <h3>Opiniones de la Comunidad</h3>
                        <div id="commentForm" style="margin: 1rem 0; padding: 1rem; background: #f9f9f9; border-radius: 4px;">
                            <div style="display: flex; gap: 10px; margin-bottom: 1rem;">
                                <button class="btn btn-outline" id="voteAgree" onclick="window.ReportsModule.selectVote('agree')">👍 De acuerdo</button>
                                <button class="btn btn-outline" id="voteDisagree" onclick="window.ReportsModule.selectVote('disagree')">👎 En desacuerdo</button>
                                <button class="btn btn-outline" id="voteNeutral" onclick="window.ReportsModule.selectVote('neutral')">🤷 Neutral</button>
                            </div>
                            <textarea id="commentContent" placeholder="Tu opinión..." style="width: 100%; min-height: 80px; padding: 10px;" maxlength="1000"></textarea>
                            <button class="btn btn-primary" onclick="window.ReportsModule.submitComment('${reportId}')" style="margin-top: 1rem;">Publicar</button>
                        </div>
                        <div id="commentsContainer"><div class="loader"></div></div>
                    </div>
                </div>
            `;

            this.loadComments(reportId);
        } catch (error) {
            container.innerHTML = `<p style="color: var(--color-error);">Error: ${error.message}</p>`;
        }
    },

    selectedVote: null,

    selectVote(vote) {
        this.selectedVote = vote;
        ['voteAgree', 'voteDisagree', 'voteNeutral'].forEach(id => {
            const btn = document.getElementById(id);
            btn.style.background = 'white';
            btn.style.color = 'inherit';
        });
        const colors = { agree: '#4caf50', disagree: '#f44336', neutral: '#ff9800' };
        const btn = document.getElementById(`vote${vote.charAt(0).toUpperCase() + vote.slice(1)}`);
        btn.style.background = colors[vote];
        btn.style.color = 'white';
    },

    async submitComment(reportId) {
        if (!window.Auth.isLoggedIn()) {
            window.Toast.warning('Debes iniciar sesión para comentar');
            setTimeout(() => window.location.hash = '#/login', 1000);
            return;
        }

        if (!this.selectedVote) {
            window.Toast.error('Selecciona tu opinión');
            return;
        }

        const content = document.getElementById('commentContent').value.trim();
        if (!content) {
            window.Toast.error('Escribe tu opinión');
            return;
        }

        const user = window.Auth.getUser();
        try {
            await Api.post(`/comments/${reportId}`, {
                userId: user.userId,
                userName: user.name,
                content,
                vote: this.selectedVote
            });
            window.Toast.success('Opinión publicada');
            document.getElementById('commentContent').value = '';
            this.selectedVote = null;
            this.loadComments(reportId);
        } catch (error) {
            window.Toast.error(error.message);
        }
    },

    async loadComments(reportId) {
        try {
            const data = await Api.get(`/comments/${reportId}`);
            const container = document.getElementById('commentsContainer');

            if (!data.comments || data.comments.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem;">No hay opiniones aún</p>';
                return;
            }

            const user = window.Auth.getUser();
            let html = '';
            
            data.comments.forEach(comment => {
                const voteIcon = comment.vote === 'agree' ? '👍' : comment.vote === 'disagree' ? '👎' : '🤷';
                const voteColor = comment.vote === 'agree' ? '#4caf50' : comment.vote === 'disagree' ? '#f44336' : '#ff9800';
                const isMyComment = user && comment.userId === user.userId;
                const commentStyle = isMyComment ? 'border: 2px solid #4caf50; background: #e8f5e9;' : 'border: 1px solid #ddd;';
                
                html += `
                    <div style="${commentStyle} padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <strong>${comment.userName}</strong>
                                ${isMyComment ? '<span style="color: #4caf50; margin-left: 5px; font-size: 0.8rem;">✓ Tu opinión</span>' : ''}
                                <span style="margin-left: 10px; padding: 4px 8px; background: ${voteColor}; color: white; border-radius: 12px; font-size: 0.8rem;">
                                    ${voteIcon}
                                </span>
                            </div>
                            <small>${new Date(comment.createdAt).toLocaleDateString()}</small>
                        </div>
                        <p style="margin: 0.5rem 0;">${comment.content}</p>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.ReportsModule.voteComment('${comment._id}', 'up')" style="background: none; border: 1px solid #ddd; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
                                👍 ${comment.upvotes || 0}
                            </button>
                            <button onclick="window.ReportsModule.voteComment('${comment._id}', 'down')" style="background: none; border: 1px solid #ddd; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
                                👎 ${comment.downvotes || 0}
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } catch (error) {
            document.getElementById('commentsContainer').innerHTML = '<p style="color: var(--color-error);">Error cargando opiniones</p>';
        }
    },

    async voteComment(commentId, vote) {
        if (!window.Auth.isLoggedIn()) {
            window.Toast.warning('Debes iniciar sesión para votar');
            return;
        }

        const user = window.Auth.getUser();
        try {
            await Api.put(`/comments/${commentId}/vote`, { userId: user.userId, vote });
            window.Toast.success('Voto registrado');
            const reportId = window.location.hash.split('/')[2];
            this.loadComments(reportId);
        } catch (error) {
            window.Toast.error(error.message);
        }
    },

    translateStatus(status) {
        const map = {
            'pending': 'Pendiente',
            'verified': 'Verificado',
            'disputed': 'En Disputa',
            'rejected': 'Rechazado'
        };
        return map[status] || status;
    }
};
