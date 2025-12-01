// Sistema de upload de imágenes a servicios externos
const ImageUploader = {
  // Modo de operación: 'base64' (sin API) o 'imgbb' (con API)
  mode: 'base64', // Cambiar a 'imgbb' si tienes API key
  
  // Configuración de servicios (puedes agregar tu API key de ImgBB aquí)
  services: {
    imgbb: {
      apiKey: 'TU_API_KEY_AQUI', // Obtén una gratis en https://api.imgbb.com/
      endpoint: 'https://api.imgbb.com/1/upload'
    }
  },

  /**
   * Convierte un archivo de imagen a URL usando ImgBB
   */
  async uploadToImgBB(file) {
    try {
      // Convertir archivo a base64
      const base64 = await this.fileToBase64(file);
      
      // Preparar datos para ImgBB
      const formData = new FormData();
      formData.append('key', this.services.imgbb.apiKey);
      formData.append('image', base64.split(',')[1]); // Remover el prefijo data:image
      
      // Subir a ImgBB
      const response = await fetch(this.services.imgbb.endpoint, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          url: data.data.url,
          deleteUrl: data.data.delete_url,
          service: 'ImgBB'
        };
      } else {
        throw new Error(data.error?.message || 'Error al subir imagen');
      }
    } catch (error) {
      console.error('Error en ImgBB:', error);
      throw error;
    }
  },

  /**
   * Convierte un archivo a base64 (útil para preview)
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Valida que el archivo sea una imagen válida
   */
  validateImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    let maxSize = 10 * 1024 * 1024; // 10MB por defecto
    
    // Si usamos base64, limitar a 2MB para mejor rendimiento
    if (this.mode === 'base64') {
      maxSize = 2 * 1024 * 1024; // 2MB
    }
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Formato no válido. Usa JPG, PNG, GIF o WebP'
      };
    }
    
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return {
        valid: false,
        error: `La imagen es muy grande. Máximo ${maxMB}MB`
      };
    }
    
    return { valid: true };
  },

  /**
   * Comprime una imagen antes de subirla
   */
  async compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es necesario
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = reject;
        img.src = e.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Función principal para subir imagen
   */
  async upload(file, compress = true) {
    // Validar imagen
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Comprimir si es necesario
    let fileToUpload = file;
    if (compress && file.size > 500 * 1024) { // Comprimir si es mayor a 500KB
      try {
        fileToUpload = await this.compressImage(file);
      } catch (error) {
        console.warn('No se pudo comprimir, usando original:', error);
      }
    }
    
    // Elegir método según configuración
    if (this.mode === 'base64') {
      // Modo base64: convertir imagen directamente sin API
      return await this.uploadAsBase64(fileToUpload);
    } else {
      // Modo ImgBB: subir a servicio externo
      try {
        return await this.uploadToImgBB(fileToUpload);
      } catch (error) {
        // Si falla ImgBB, usar base64 como fallback
        console.warn('ImgBB falló, usando base64 como fallback');
        return await this.uploadAsBase64(fileToUpload);
      }
    }
  },

  /**
   * Convierte imagen a base64 (no requiere API)
   */
  async uploadAsBase64(file) {
    try {
      const base64 = await this.fileToBase64(file);
      return {
        success: true,
        url: base64,
        service: 'Base64 (Local)',
        note: 'Imagen almacenada como base64. Para mejor rendimiento, considera usar ImgBB.'
      };
    } catch (error) {
      throw new Error('Error al procesar la imagen');
    }
  },

  /**
   * Crea un input de archivo con preview
   */
  createUploadInput(containerId, onUploadComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const uploadHTML = `
      <div class="image-upload-container">
        <input type="file" id="image-file-input" accept="image/*" style="display: none;">
        <div class="upload-area" id="upload-area">
          <div class="upload-icon">📷</div>
          <div class="upload-text">
            <strong>Click para subir imagen</strong>
            <span>o arrastra y suelta aquí</span>
          </div>
          <div class="upload-hint">JPG, PNG, GIF o WebP (máx. 10MB)</div>
        </div>
        <div class="upload-preview" id="upload-preview" style="display: none;">
          <img id="preview-image" src="" alt="Preview">
          <div class="preview-actions">
            <button type="button" class="btn-remove-preview" id="btn-remove-preview">✕ Quitar</button>
          </div>
        </div>
        <div class="upload-progress" id="upload-progress" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="progress-text" id="progress-text">Subiendo imagen...</div>
        </div>
        <input type="hidden" id="image-url-result" name="imageUrl">
      </div>
    `;
    
    container.innerHTML = uploadHTML;
    
    // Event listeners
    const fileInput = document.getElementById('image-file-input');
    const uploadArea = document.getElementById('upload-area');
    const preview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const progress = document.getElementById('upload-progress');
    const resultInput = document.getElementById('image-url-result');
    
    // Click para abrir selector
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await this.handleFileUpload(files[0], uploadArea, preview, previewImage, progress, resultInput, onUploadComplete);
      }
    });
    
    // Cambio de archivo
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this.handleFileUpload(e.target.files[0], uploadArea, preview, previewImage, progress, resultInput, onUploadComplete);
      }
    });
    
    // Botón de quitar
    document.getElementById('btn-remove-preview').addEventListener('click', () => {
      preview.style.display = 'none';
      uploadArea.style.display = 'flex';
      resultInput.value = '';
      fileInput.value = '';
    });
  },

  async handleFileUpload(file, uploadArea, preview, previewImage, progress, resultInput, callback) {
    try {
      // Mostrar preview inmediato
      const base64 = await this.fileToBase64(file);
      previewImage.src = base64;
      uploadArea.style.display = 'none';
      preview.style.display = 'block';
      progress.style.display = 'block';
      
      // Subir imagen
      const result = await this.upload(file);
      
      // Guardar URL
      resultInput.value = result.url;
      progress.style.display = 'none';
      
      // Callback
      if (callback) {
        callback(result.url);
      }
      
      // Mensaje de éxito
      let message = `Imagen procesada exitosamente`;
      if (result.service === 'Base64 (Local)') {
        message += ' (almacenada localmente)';
      } else {
        message += ` con ${result.service}`;
      }
      UI.showToast(message, 'success');
    } catch (error) {
      progress.style.display = 'none';
      uploadArea.style.display = 'flex';
      preview.style.display = 'none';
      UI.showToast(error.message, 'error');
    }
  }
};

window.ImageUploader = ImageUploader;
