# RNI Frontend (Netlify)

Frontend estático con todo el procesamiento en el cliente.

## 🚀 Deploy en Netlify

1. Sube esta carpeta a un repositorio Git
2. Conecta con Netlify
3. Configuración:
   - Build command: `echo 'Static site'`
   - Publish directory: `.`

## ⚙️ Configuración

Edita `js/config.js` y cambia:

```javascript
SIGNAL_SERVER: 'https://tu-app.koyeb.app'
```

Por la URL de tu servidor de señalización en Koyeb.

## 📦 Características

- ✅ Todo el procesamiento en el navegador
- ✅ IndexedDB para almacenamiento local
- ✅ Sistema de chunks distribuido
- ✅ Sincronización P2P vía servidor de señalización
- ✅ Sin backend pesado

## 🔧 Tecnologías

- Vanilla JavaScript
- IndexedDB
- LocalStorage
- Service Workers (opcional)
- Sistema de chunks distribuido
