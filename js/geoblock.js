// Sistema de bloqueo geográfico
const GeoBlock = {
  // Países permitidos (Latinoamérica + España)
  allowedCountries: [
    'PE', 'MX', 'CO', 'AR', 'CL', 'ES', 'VE', 'EC', 'BO', 'PY', 'UY',
    'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'PR'
  ],

  // Países bloqueados explícitamente (alta prioridad)
  blockedCountries: [
    'AF', // Afganistán
    'IN', // India
    'PK', // Pakistán
    'BD', // Bangladesh
    'CN', // China
    'RU', // Rusia
    'NG', // Nigeria
    'KE', // Kenia
    'GH', // Ghana
    'PH', // Filipinas
    'ID', // Indonesia
    'VN', // Vietnam
    'TH', // Tailandia
    'MY', // Malasia
    'EG', // Egipto
    'MA', // Marruecos
    'DZ', // Argelia
    'IQ', // Irak
    'IR', // Irán
    'SA', // Arabia Saudita
    'AE', // Emiratos Árabes
    'TR', // Turquía
    'UA', // Ucrania
    'BY', // Bielorrusia
    'KZ', // Kazajistán
    'UZ', // Uzbekistán
    'NP', // Nepal
    'LK', // Sri Lanka
    'MM', // Myanmar
    'KH', // Camboya
    'LA', // Laos
    'ET', // Etiopía
    'TZ', // Tanzania
    'UG', // Uganda
    'ZW', // Zimbabue
    'ZM', // Zambia
    'MW', // Malaui
    'MZ', // Mozambique
    'AO', // Angola
    'CD', // Congo
    'CM', // Camerún
    'CI', // Costa de Marfil
    'SN', // Senegal
    'ML', // Mali
    'BF', // Burkina Faso
    'NE', // Níger
    'TD', // Chad
    'SD', // Sudán
    'SS', // Sudán del Sur
    'SO', // Somalia
    'DJ', // Yibuti
    'ER', // Eritrea
    'YE', // Yemen
    'OM', // Omán
    'KW', // Kuwait
    'QA', // Catar
    'BH', // Baréin
    'JO', // Jordania
    'LB', // Líbano
    'SY', // Siria
    'PS', // Palestina
    'AM', // Armenia
    'AZ', // Azerbaiyán
    'GE', // Georgia
    'TM', // Turkmenistán
    'TJ', // Tayikistán
    'KG', // Kirguistán
    'MN', // Mongolia
    'KP', // Corea del Norte
    'BT', // Bután
    'MV', // Maldivas
    'LK', // Sri Lanka
    'AF', // Afganistán
    'US', // Estados Unidos
    'BR', // Brasil
    'CA', // Canadá
    'AU', // Australia
    'NZ', // Nueva Zelanda
    'JP', // Japón
    'KR', // Corea del Sur
    'SG', // Singapur
    'HK', // Hong Kong
    'TW', // Taiwán
    'IL', // Israel
    'ZA'  // Sudáfrica
  ],

  async checkAccess() {
    // Servicios de geolocalización con CORS habilitado
    // Usar el sistema de detección de Utils (sin APIs con límites)
    try {
      console.log('🌍 Detectando país...');
      
      // Utils.detectCountryByIP() usa idioma, timezone, GPS y servidor
      const userCountry = await Utils.detectCountryByIP();
      
      if (!userCountry) {
        console.error('❌ No se pudo detectar el país');
        this.blockAccess('No detectado', 'detection_failed');
        return false;
      }
      
      console.log(`✅ País detectado: ${userCountry}`);
      
      // Verificar si está en la lista de bloqueados
      if (this.blockedCountries.includes(userCountry)) {
        this.blockAccess(userCountry, 'blocked');
        return false;
      }
      
      // Verificar si NO está en la lista de permitidos
      if (!this.allowedCountries.includes(userCountry)) {
        this.blockAccess(userCountry, 'not_allowed');
        return false;
      }
      
      // Guardar información del usuario
      localStorage.setItem('user_country', userCountry);
      
      return true;
    } catch (error) {
      console.error('❌ Error detectando país:', error);
      this.blockAccess('Error', 'detection_error');
      return false;
    }
    return false;
  },

  blockAccess(country, reason) {
    // Solo limpiar localStorage si es un bloqueo real (no error de detección)
    if (reason !== 'detection_failed') {
      localStorage.clear();
    }

    // Determinar mensaje según la razón
    let title, message, icon, showRetry;

    if (reason === 'detection_failed') {
      icon = '🌍';
      title = 'No pudimos detectar tu ubicación';
      message = `
        <p style="font-size: 1.1rem; color: #666; line-height: 1.8; margin-bottom: 25px;">
          Esto puede deberse a varias razones:
        </p>
        <div style="text-align: left; margin-bottom: 30px; background: rgba(248, 180, 217, 0.1); padding: 20px; border-radius: 15px; border-left: 4px solid var(--primary-pink);">
          <p style="margin: 12px 0; color: #333; font-size: 1rem;">
            📱 <strong>Estás en móvil</strong> - La detección puede tardar más
          </p>
          <p style="margin: 12px 0; color: #333; font-size: 1rem;">
            ⏳ <strong>Conexión lenta</strong> - El servidor está ocupado
          </p>
          <p style="margin: 12px 0; color: #333; font-size: 1rem;">
            🌐 <strong>VPN o Proxy activo</strong> - Desactívalo temporalmente
          </p>
          <p style="margin: 12px 0; color: #333; font-size: 1rem;">
            🔒 <strong>Navegador bloqueando</strong> - Permite permisos de ubicación
          </p>
        </div>
      `;
      showRetry = true;
    } else {
      icon = '🚫';
      title = 'Acceso Restringido';
      const countryDisplay = country === 'undefined' ? 'No detectado' : country;
      message = `
        <p style="font-size: 1.1rem; color: #666; line-height: 1.6; margin-bottom: 20px;">
          Lo sentimos, este servicio solo está disponible para usuarios de Latinoamérica y España.
        </p>
        <p style="font-size: 0.95rem; color: #999; padding: 15px; background: rgba(248, 180, 217, 0.1); border-radius: 10px; border-left: 4px solid var(--primary-pink);">
          País detectado: <strong>${countryDisplay}</strong><br>
          Razón: ${reason === 'blocked' ? 'País bloqueado' : 'Región no permitida'}
        </p>
      `;
      showRetry = false;
    }

    // Crear pantalla de bloqueo con paleta de colores de la página
    document.body.innerHTML = `
      <style>
        :root {
          --primary-pink: #f8b4d9;
          --dark-pink: #d81b60;
          --soft-pink: #fce4ec;
          --elegant-black: #1a1a1a;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .retry-btn {
          background: linear-gradient(135deg, var(--primary-pink), var(--dark-pink));
          color: white;
          border: none;
          padding: 15px 40px;
          border-radius: 25px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(248, 180, 217, 0.4);
          transition: all 0.3s ease;
          margin-top: 20px;
        }
        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 180, 217, 0.6);
        }
      </style>
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--soft-pink) 0%, #ffffff 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <div style="
          background: white;
          padding: 50px 40px;
          border-radius: 25px;
          box-shadow: 0 20px 60px rgba(216, 27, 96, 0.15);
          max-width: 550px;
          animation: fadeIn 0.5s ease;
        ">
          <div style="font-size: 5rem; margin-bottom: 25px;">${icon}</div>
          <h1 style="
            font-size: 2.2rem;
            font-weight: 600;
            color: var(--dark-pink);
            margin-bottom: 20px;
            letter-spacing: -0.5px;
          ">${title}</h1>
          ${message}
          ${showRetry ? `
            <button class="retry-btn" onclick="location.reload()">
              🔄 Reintentar
            </button>
            <p style="font-size: 0.9rem; color: #999; margin-top: 20px; line-height: 1.6;">
              Si el problema persiste después de varios intentos,<br>
              es posible que tu región no esté soportada aún.
            </p>
          ` : `
            <p style="font-size: 0.9rem; color: #999; margin-top: 25px;">
              Si crees que esto es un error, contacta al soporte.
            </p>
          `}
        </div>
      </div>
    `;

    // Prevenir navegación solo si es bloqueo real
    if (reason !== 'detection_failed') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, '', window.location.href);
      };
    }
  },

  async init() {
    // Verificar si ya pasó el geoblock en esta sesión
    const sessionPassed = sessionStorage.getItem('geoblock_passed');
    if (sessionPassed === 'true') {
      return true;
    }

    const isAllowed = await this.checkAccess();

    // Si pasó, guardar en sessionStorage
    if (isAllowed) {
      sessionStorage.setItem('geoblock_passed', 'true');
    }

    return isAllowed;
  }
};

window.GeoBlock = GeoBlock;
