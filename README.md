# Frontend - Lista Negra

Interfaz web elegante tipo revista/magazine para el sistema de reportes.

## Instalación

```bash
npm install
```

## Ejecución Local

### Opción 1: Python (Recomendado)
```bash
python -m http.server 3050
```

### Opción 2: Node.js http-server
```bash
npx http-server . -p 3050 -c-1 --cors
```

### Opción 3: PHP
```bash
php -S localhost:3050
```

Abre: http://localhost:3050

## Configuración

Edita `core/index.html` para cambiar la URL del backend:

```javascript
window.APP_CONFIG = {
    API_URL: 'http://localhost:3070/api'
};
```

## Estructura

```
frontend/
├── core/               # HTML principal y router
│   ├── index.html
│   └── app.js
├── modules/            # Módulos de UI
│   ├── reports/        # Sistema de reportes
│   │   ├── reports.html
│   │   ├── reports.js
│   │   ├── reports-extended.js
│   │   └── reports.css
│   └── disputes/       # Sistema de disputas
│       └── disputes.js
└── shared/             # Recursos compartidos
    ├── styles/         # Estilos globales
    │   ├── main.css
    │   ├── responsive.css
    │   └── ads.css
    ├── utils/          # Utilidades
    │   ├── api.js
    │   └── fingerprint.js
    └── components/     # Componentes
        └── ads.html
```

## Características

- ✅ Vanilla JavaScript (sin frameworks)
- ✅ Diseño elegante tipo revista
- ✅ Responsive mobile-first
- ✅ Device fingerprinting
- ✅ Tabla de reportes estilo Excel
- ✅ Sistema de modales
- ✅ Formularios validados
- ✅ Zonas de publicidad

## Diseño

### Paleta de Colores
- Primary: #4a0e16 (Burgundy)
- Accent: #d4af37 (Gold)
- Background: #fdfbf7 (Cream)

### Tipografía
- Headings: Playfair Display (serif)
- Body: Lato (sans-serif)

### Estilo
Magazine/Editorial elegante con sombras sutiles y transiciones suaves.

## Módulos

### Reports
- Lista de reportes con filtros
- Modal de detalles
- Formulario de nuevo reporte
- Verificación de reportes
- Galería de evidencias

### Disputes
- Formulario de disputa
- Upload de contra-evidencia
- Validación de campos

## Utilidades

### API Client
Cliente HTTP con fetch para comunicación con backend.

### Device Fingerprinting
Genera hash único basado en:
- Canvas fingerprint
- WebGL fingerprint
- Screen resolution
- Timezone
- User agent

## Deploy

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### Servidor estático
Cualquier servidor HTTP puede servir esta carpeta:
- Nginx
- Apache
- http-server
- Python SimpleHTTPServer

## Troubleshooting

### CORS Error
Verifica que `FRONTEND_URL` en backend/.env coincida con tu URL del frontend.

### API no responde
Verifica que el backend esté corriendo en el puerto configurado.

### Fingerprint no funciona
Verifica que el navegador soporte Canvas y WebGL APIs.
