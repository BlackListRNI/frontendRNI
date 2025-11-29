# 🎨 Assets - Lista Negra

## Iconos Generados

Todos los iconos han sido generados automáticamente con el diseño de corazón roto + símbolo de advertencia.

### Archivos Disponibles

#### Iconos
```
✅ favicon-16x16.png      (409 bytes)  - Favicon pequeño
✅ favicon-32x32.png      (662 bytes)  - Favicon estándar
✅ apple-touch-icon.png   (3 KB)       - iOS home screen
✅ icon-192x192.png       (3 KB)       - Android home screen
✅ icon-512x512.png       (9 KB)       - Android splash screen
✅ favicon.svg            (Vector)     - Favicon moderno (navegadores nuevos)
```

#### Sonidos
```
✅ postsound.mp3          (Audio)      - Sonido de éxito al registrar infiel
```

## Diseño del Icono

### Elementos
- **Fondo:** Burgundy (#4a0e16)
- **Corazón roto:** Gold (#d4af37)
- **Símbolo de advertencia:** Cream (#fdfbf7)
- **Exclamación:** Burgundy (#4a0e16)

### Concepto
El icono representa:
- 💔 Corazón roto = Infidelidad
- ⚠️ Advertencia = Alerta comunitaria
- 🔴 Rojo oscuro = Seriedad del tema

## Uso en HTML

Los iconos ya están referenciados en `index.html`:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
```

## PWA Manifest

Los iconos también están configurados en `manifest.json`:

```json
{
  "icons": [
    {
      "src": "assets/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Regenerar Iconos

Si necesitas regenerar los iconos con un diseño diferente:

1. Edita `favicon.svg` con tu diseño
2. Usa una herramienta online como:
   - https://realfavicongenerator.net/
   - https://favicon.io/
3. O crea un script personalizado

## Verificar Iconos

### En Navegador
1. Abre la aplicación
2. Mira la pestaña del navegador
3. Deberías ver el icono del corazón roto

### En Mobile
1. Agrega a pantalla de inicio
2. El icono debería aparecer correctamente

## Tamaños Recomendados

| Tamaño | Uso |
|--------|-----|
| 16x16 | Favicon (pestaña navegador) |
| 32x32 | Favicon (retina) |
| 180x180 | Apple Touch Icon |
| 192x192 | Android Chrome |
| 512x512 | Android Splash Screen |

## Optimización

Los iconos están optimizados para:
- ✅ Tamaño de archivo pequeño
- ✅ Calidad visual alta
- ✅ Compatibilidad universal
- ✅ Carga rápida

---

**Generados:** 2025-11-29  
**Formato:** PNG (optimizado)  
**Total:** 6 archivos (15.5 KB)
