window.AuthModule = {
    // Render login form
    renderLogin(container) {
        container.innerHTML = `
            <div style="max-width: 400px; margin: 2rem auto;">
                <h2>Iniciar Sesión</h2>
                <p class="mb-2" style="color: var(--color-text-muted);">
                    Accede a tu cuenta para gestionar tus reportes
                </p>
                
                <form id="loginForm" onsubmit="window.AuthModule.handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" required 
                               placeholder="tu@email.com">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <div style="position: relative;">
                            <input type="password" name="password" id="loginPassword" class="form-input" required 
                                   placeholder="••••••••" style="padding-right: 45px;">
                            <button type="button" onclick="window.AuthModule.togglePassword('loginPassword', this)" 
                                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 5px;">
                                👁️
                            </button>
                        </div>
                    </div>

                    <div class="form-group mt-2">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Iniciar Sesión
                        </button>
                    </div>

                    <div class="text-center mt-1">
                        <p style="color: var(--color-text-muted);">
                            ¿No tienes cuenta? 
                            <a href="#/registro" data-route="registro" style="color: var(--color-primary); font-weight: 600;">
                                Regístrate aquí
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        `;

        // Bind navigation
        container.querySelectorAll('a[data-route]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '#/' + e.target.getAttribute('data-route');
            });
        });
    },

    // Render register form
    renderRegister(container) {
        container.innerHTML = `
            <div style="max-width: 400px; margin: 2rem auto;">
                <h2>Crear Cuenta</h2>
                <p class="mb-2" style="color: var(--color-text-muted);">
                    Regístrate para gestionar tus reportes
                </p>
                
                <form id="registerForm" onsubmit="window.AuthModule.handleRegister(event)">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" name="name" class="form-input" required 
                               placeholder="Tu nombre">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" required 
                               placeholder="tu@email.com">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <div style="position: relative;">
                            <input type="password" name="password" id="registerPassword" class="form-input" required 
                                   minlength="6" placeholder="Mínimo 6 caracteres" style="padding-right: 45px;">
                            <button type="button" onclick="window.AuthModule.togglePassword('registerPassword', this)" 
                                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 5px;">
                                👁️
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirmar Contraseña</label>
                        <div style="position: relative;">
                            <input type="password" name="confirmPassword" id="confirmPassword" class="form-input" required 
                                   placeholder="Repite tu contraseña" style="padding-right: 45px;">
                            <button type="button" onclick="window.AuthModule.togglePassword('confirmPassword', this)" 
                                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 5px;">
                                👁️
                            </button>
                        </div>
                    </div>

                    <div class="form-group mt-2">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Crear Cuenta
                        </button>
                    </div>

                    <div class="text-center mt-1">
                        <p style="color: var(--color-text-muted);">
                            ¿Ya tienes cuenta? 
                            <a href="#/login" data-route="login" style="color: var(--color-primary); font-weight: 600;">
                                Inicia sesión
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        `;

        // Bind navigation
        container.querySelectorAll('a[data-route]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '#/' + e.target.getAttribute('data-route');
            });
        });
    },

    // Handle login
    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Iniciando...';

            const response = await Api.post('/auth/login', data);
            
            // Save user and token
            window.Auth.setUser(response.user);
            window.Auth.setToken(response.token);
            
            window.Toast.success(`¡Bienvenido de vuelta, ${response.user.name}!`);
            setTimeout(() => {
                window.location.hash = '#/perfil';
            }, 1000);
        } catch (error) {
            window.Toast.error(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
        }
    },

    // Handle register
    async handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
            window.Toast.error('Las contraseñas no coinciden. Por favor verifica e intenta nuevamente.');
            return;
        }

        if (password.length < 6) {
            window.Toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: password,
            deviceFingerprint: await window.DeviceFingerprint.generate()
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Creando cuenta...';

            const response = await Api.post('/auth/register', data);
            
            // Save user and token
            window.Auth.setUser(response.user);
            window.Auth.setToken(response.token);
            
            window.Toast.success(`¡Cuenta creada exitosamente! Bienvenido, ${response.user.name}`);
            setTimeout(() => {
                window.location.hash = '#/perfil';
            }, 1000);
        } catch (error) {
            let errorMsg = 'Error al crear la cuenta.';
            if (error.message.includes('email')) {
                errorMsg = 'Este email ya está registrado. Intenta iniciar sesión o usa otro email.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            window.Toast.error(errorMsg);
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.textContent = 'Crear Cuenta';
        }
    },

    // Toggle password visibility
    togglePassword(inputId, button) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    },

    // Logout
    logout() {
        window.Auth.removeUser();
        window.Toast.info('Sesión cerrada exitosamente');
        setTimeout(() => {
            window.location.hash = '#/';
        }, 500);
    }
};
