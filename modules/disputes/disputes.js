window.DisputesModule = {
    async renderForm(container, reportId) {
        container.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto;">
                <h2>Refutar Reporte</h2>
                <p class="mb-2" style="color: var(--color-text-muted);">
                    Si crees que este reporte es falso o inexacto, presenta tu caso con evidencia.
                </p>
                
                <form id="disputeForm" onsubmit="window.DisputesModule.submitDispute(event, '${reportId}')">
                    <div class="form-group">
                        <label class="form-label">Email de Contacto (Opcional)</label>
                        <input type="email" name="email" class="form-input" 
                               placeholder="tu@email.com">
                        <small style="color: var(--color-text-muted);">
                            Para notificaciones sobre tu disputa
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Teléfono de Contacto (Opcional)</label>
                        <input type="tel" name="phone" class="form-input" 
                               placeholder="+51 999 999 999">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Tu Declaración *</label>
                        <textarea name="statement" class="form-textarea" required 
                                  minlength="50" maxlength="1000"
                                  placeholder="Explica por qué este reporte es falso o inexacto. Mínimo 50 caracteres."></textarea>
                        <small style="color: var(--color-text-muted);">
                            <span id="charCount">0</span>/1000 caracteres
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Contra-Evidencia (Opcional)</label>
                        <input type="file" id="counterEvidence" accept="image/*" multiple 
                               class="form-input" onchange="window.DisputesModule.previewFiles(event)">
                        <small style="color: var(--color-text-muted);">
                            Máximo 5 imágenes, 5MB cada una
                        </small>
                        <div id="evidencePreview" class="evidence-preview mt-1"></div>
                    </div>

                    <div class="form-group mt-2">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Enviar Disputa
                        </button>
                        <button type="button" class="btn btn-outline mt-1" 
                                style="width: 100%;" onclick="window.ReportsModule.closeModal()">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Character counter
        const textarea = container.querySelector('textarea[name="statement"]');
        const charCount = container.querySelector('#charCount');
        textarea.addEventListener('input', () => {
            charCount.textContent = textarea.value.length;
        });
    },

    previewFiles(event) {
        const files = event.target.files;
        const preview = document.getElementById('evidencePreview');
        preview.innerHTML = '';

        if (files.length > 5) {
            alert('Máximo 5 imágenes permitidas');
            event.target.value = '';
            return;
        }

        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} es demasiado grande (máx 5MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'evidence-img';
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.marginRight = '10px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    },

    async submitDispute(event, reportId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const statement = formData.get('statement');
        if (statement.length < 50) {
            window.Toast.error('La declaración debe tener al menos 50 caracteres. Por favor proporciona más detalles.');
            return;
        }

        // Process counter-evidence
        const files = document.getElementById('counterEvidence').files;
        const counterEvidence = [];

        for (let file of files) {
            const base64 = await this.fileToBase64(file);
            counterEvidence.push(base64);
        }

        const data = {
            reportId: reportId,
            email: formData.get('email'),
            phone: formData.get('phone'),
            statement: statement,
            counterEvidence: counterEvidence
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            await Api.post('/disputes', data);
            window.Toast.success('Disputa enviada exitosamente. Será revisada por moderadores en 48 horas.');
            setTimeout(() => {
                window.ReportsModule.closeModal();
                window.location.reload();
            }, 2000);
        } catch (error) {
            let errorMsg = 'Error al enviar la disputa.';
            if (error.message.includes('disputa activa')) {
                errorMsg = 'Este reporte ya tiene una disputa activa. Espera a que sea resuelta.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            window.Toast.error(errorMsg);
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Enviar Disputa';
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
