// ============================================
// SISTEMA DE PUBLICIDAD
// ============================================

const AdsManager = {
  // Obtener configuración (usa AdsConfig si está disponible, sino valores por defecto)
  get config() {
    return typeof AdsConfig !== 'undefined' ? AdsConfig : {
      contact: {
        email: 'publicidad@rni.com',
        whatsapp: '+51999999999'
      },
      stats: {
        visitors: '10K+',
        engagement: '85',
        countries: '20+'
      },
      customAds: [],
      display: {
        showAdvertiseBox: true,
        showSampleAds: true
      }
    };
  },
  
  get contactEmail() {
    return this.config.contact.email;
  },
  
  get contactWhatsApp() {
    return this.config.contact.whatsapp;
  },
  
  get activeAds() {
    return this.config.ads || [];
  },
  
  // Renderizar anuncios
  renderAds() {
    console.log('🎨 Renderizando anuncios...');
    
    const leftSidebar = document.getElementById('ads-left');
    const rightSidebar = document.getElementById('ads-right');
    
    console.log('📍 Sidebars encontrados:', {
      left: !!leftSidebar,
      right: !!rightSidebar
    });
    
    if (!leftSidebar || !rightSidebar) {
      console.warn('⚠️ No se encontraron los sidebars de publicidad');
      return;
    }
    
    // Limpiar contenido existente
    leftSidebar.innerHTML = '';
    rightSidebar.innerHTML = '';
    
    // Renderizar anuncios activos (solo imágenes)
    const ads = this.activeAds;
    console.log(`📢 Renderizando ${ads.length} anuncios activos`);
    
    ads.forEach(ad => {
      const adElement = this.createImageAd(ad);
      if (ad.position === 'left') {
        leftSidebar.appendChild(adElement);
        console.log('➕ Anuncio agregado a sidebar izquierdo');
      } else {
        rightSidebar.appendChild(adElement);
        console.log('➕ Anuncio agregado a sidebar derecho');
      }
    });
    
    // Rellenar espacios vacíos con widgets "Publícitate"
    while (leftSidebar.children.length < 2) {
      leftSidebar.appendChild(this.createEmptyAdBox());
      console.log('📦 Widget vacío agregado a sidebar izquierdo');
    }
    
    while (rightSidebar.children.length < 2) {
      rightSidebar.appendChild(this.createEmptyAdBox());
      console.log('📦 Widget vacío agregado a sidebar derecho');
    }
    
    console.log('✅ Anuncios renderizados:', {
      leftCount: leftSidebar.children.length,
      rightCount: rightSidebar.children.length
    });
    
    // Crear popup (solo una vez)
    if (!document.getElementById('ad-popup-overlay')) {
      document.body.appendChild(this.createAdPopup());
      console.log('✅ Popup de publicidad creado');
    }
  },

  
  // Crear widget vacío con hover
  // Crear anuncio de solo imagen (clickeable)
  createImageAd(ad) {
    const container = document.createElement('div');
    container.className = 'ad-box ad-box-image';
    
    const link = document.createElement('a');
    link.href = ad.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'ad-image-link';
    link.onclick = () => this.trackClick(ad.id);
    
    const img = document.createElement('img');
    img.src = ad.image;
    img.alt = 'Publicidad';
    img.className = 'ad-image-full';
    img.onerror = () => {
      img.src = '/assets/logo.svg';
    };
    
    link.appendChild(img);
    
    // Agregar texto hover que abre el popup
    const hoverText = document.createElement('div');
    hoverText.className = 'ad-hover-text';
    hoverText.textContent = 'Publícitate con nosotros';
    hoverText.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openAdPopup();
    };
    
    container.appendChild(link);
    container.appendChild(hoverText);
    return container;
  },
  
  createEmptyAdBox() {
    const box = document.createElement('div');
    box.className = 'ad-box';
    box.innerHTML = `
      <div class="ad-hover-text">Publícitate con nosotros</div>
    `;
    
    box.addEventListener('click', () => {
      this.openAdPopup();
    });
    
    // También hacer clickeable el texto hover
    const hoverText = box.querySelector('.ad-hover-text');
    if (hoverText) {
      hoverText.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAdPopup();
      });
    }
    
    return box;
  },
  
  // Rastrear clicks en anuncios
  trackClick(adId) {
    console.log(`📊 Click en anuncio: ${adId}`);
    const clicks = JSON.parse(localStorage.getItem('ad_clicks') || '{}');
    clicks[adId] = (clicks[adId] || 0) + 1;
    localStorage.setItem('ad_clicks', JSON.stringify(clicks));
  },
  // Crear anuncio real
// Crear anuncio real
createRealAdBox(ad) {
  const box = document.createElement('div');
  box.className = 'ad-box ad-box-real';
  box.innerHTML = `
    <div class="ad-real-content">
      <img src="${ad.image}" alt="${ad.title}" class="ad-real-image" onerror="this.src='/assets/logo.svg'">
      <div class="ad-real-info">
        <h4 class="ad-real-title">${ad.title}</h4>
        <p class="ad-real-description">${ad.description}</p>
        <a href="${ad.ctaLink}" 
           class="ad-real-cta" 
           target="_blank" 
           rel="noopener"
           onclick="AdsManager.trackClick('${ad.id}', '${ad.title}')">
          ${ad.ctaText}
        </a>
      </div>
    </div>
  `;
  return box;
},

// Rastrear clicks
trackClick(adId, adTitle) {
  console.log(`Click en anuncio: ${adTitle}`);
  const clicks = JSON.parse(localStorage.getItem('ad_clicks') || '{}');
  clicks[adId] = (clicks[adId] || 0) + 1;
  localStorage.setItem('ad_clicks', JSON.stringify(clicks));
},


  // Crear popup de publicidad
  createAdPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'ad-popup-overlay';
    overlay.className = 'ad-popup-overlay';
    

    
    overlay.innerHTML = `
      <div class="ad-popup">
        <div class="ad-popup-header">
          <h2>Publicidad en RNI</h2>
          <p>Desde S/ 5.00 mensuales</p>
          <button class="ad-popup-close" onclick="AdsManager.closeAdPopup()">×</button>
        </div>
        
        <div class="ad-popup-body">
          <!-- Contacto PRIMERO -->
          <div class="ad-popup-section">
            <h3>Contáctanos</h3>
            <div class="contact-info-compact">
              <div class="ig-contact-grid">
                <div class="ig-profile-section">
                  <img src="/assets/logo.svg" alt="RNI Instagram" class="ig-profile-image">
                  <div class="ig-profile-info">
                    <div class="ig-profile-name">RNI - Registro Nacional de Infieles</div>
                    <div class="ig-profile-username">@rni.pe</div>
                    <div class="ig-profile-bio">¿Necesitas publicidad? Escríbenos al DM</div>
                  </div>
                </div>
                
                <div class="ig-screenshot-section">
                  <img src="/assets/instagram-capture.jpg" alt="Instagram RNI" class="ig-screenshot" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="ig-screenshot-placeholder" style="display: none;">
                    <div class="placeholder-icon">📸</div>
                    <div class="placeholder-text">Captura de Instagram</div>
                  </div>
                </div>
              </div>
              
              <div class="cta-buttons-top">
                
                <a href="https://www.instagram.com/rni.pe" 
                   class="cta-btn cta-btn-secondary" 
                   target="_blank" 
                   rel="noopener">
                  <span>Enviar mensaje</span>
                </a>
              </div>
            </div>
          </div>
          
          <!-- Info compacta -->
          <div class="ad-popup-section-compact">
            <div class="info-grid">
              <div class="info-card">
                <div class="info-title">Qué incluye</div>
                <div class="info-list">
                  <div>• Espacio en sidebar</div>
                  <div>• Banner personalizado</div>
                  <div>• Enlace directo</div>
                  <div>• Visibilidad total</div>
                </div>
              </div>
              
              <div class="info-card">
                <div class="info-title">Ventajas</div>
                <div class="info-list">
                  <div>• Alta visibilidad</div>
                  <div>• Audiencia segmentada</div>
                  <div>• Diseño responsive</div>
                  <div>• Plataforma en crecimiento</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    `;
    
    // Cerrar al hacer click fuera del popup
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeAdPopup();
      }
    });
    
    return overlay;
  },
  
  // Abrir popup
  openAdPopup() {
    const overlay = document.getElementById('ad-popup-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  
  // Cerrar popup
  closeAdPopup() {
    const overlay = document.getElementById('ad-popup-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  
  // Obtener estadísticas (desde configuración o simuladas)
  getStats() {
    return this.config.stats || {
      visitors: '10K+',
      engagement: '85',
      countries: '20+'
    };
  },
  
  // Inicializar sistema de anuncios
  init() {
    console.log('🎯 Inicializando sistema de publicidad...');
    console.log('📦 Anuncios activos:', this.activeAds);
    
    this.renderAds();
    
    console.log('✅ Sistema de publicidad inicializado');
    
    // Actualizar estadísticas cada 5 minutos
    setInterval(() => {
      this.renderAds();
    }, 5 * 60 * 1000);
  }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  console.log('⏳ Esperando a que el DOM esté listo...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM listo, inicializando AdsManager...');
    AdsManager.init();
  });
} else {
  console.log('✅ DOM ya está listo, inicializando AdsManager...');
  AdsManager.init();
}
