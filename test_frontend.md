# 🌐 Checklist de Pruebas Frontend - TICS Store

## 📋 Instrucciones
Abre http://localhost:3000 en tu navegador y verifica cada elemento:

---

## 🏠 Página Principal (index.html)

### Navegación
- [✅] Logo de empresa se muestra correctamente (imagen en lugar de emoji)
- [✅] Menú de navegación funciona (Inicio, Tienda, Sobre Nosotros, Contacto, Admin)
- [✅] Enlace "Admin" lleva al panel de administración
- [✅] Contador del carrito se muestra (0)
- [ ] Búsqueda funciona (escribir "phone" debería mostrar sugerencias)
- [ ] Menú responsive en móvil (reducir ventana a <768px)

### Contenido
- [ ] Hero section se carga con imagen de fondo
- [ ] Botones "Explorar Tienda" y "Ver Destacados" funcionan
- [ ] Productos destacados se cargan dinámicamente
- [ ] Cards de características se muestran correctamente
- [ ] Newsletter form está presente
- [ ] Footer se muestra con información correcta

### Responsive
- [ ] Diseño se adapta en móvil (< 768px)
- [ ] Navegación colapsa en hamburger menu
- [ ] Imágenes se redimensionan apropiadamente
- [ ] Texto es legible en todas las resoluciones

---

## 🛍️ Tienda (shop.html)

### Funcionalidad
- [ ] Productos se cargan desde products.json
- [ ] Filtros por categoría funcionan
- [ ] Ordenamiento por precio funciona
- [ ] Botón "Agregar al carrito" funciona
- [ ] Vista de grid/lista funciona
- [ ] Paginación funciona (si hay muchos productos)

### Visual
- [ ] Cards de productos se muestran correctamente
- [ ] Imágenes se cargan desde Unsplash
- [ ] Precios se muestran formateados
- [ ] Estados hover funcionan

---

## 🛒 Carrito (cart.html)

### Funcionalidad
- [ ] Productos agregados se muestran
- [ ] Cantidades se pueden modificar
- [ ] Eliminar productos funciona
- [ ] Total se calcula correctamente
- [ ] Botón checkout lleva a checkout.html

---

## 🔐 Autenticación

### Login (login.html)
- [ ] Formulario de login se muestra correctamente
- [ ] Logo de empresa se muestra
- [ ] Campos de usuario/email y contraseña funcionan
- [ ] Validación de campos vacíos
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas muestra error
- [ ] Enlace a registro funciona
- [ ] Redirección después de login exitoso

### Registro (register.html)
- [ ] Formulario de registro se muestra
- [ ] Todos los campos están presentes
- [ ] Validación de contraseñas coincidentes
- [ ] Validación de email
- [ ] Registro exitoso crea usuario y redirige
- [ ] Errores se muestran apropiadamente
- [ ] Enlace a login funciona

---

## 🎨 Pruebas Visuales

### Consistencia de Diseño
- [ ] Paleta de colores consistente
- [ ] Tipografía uniforme (Inter font)
- [ ] Espaciado consistente
- [ ] Bordes y shadows uniformes
- [ ] Botones con estados hover/focus

### Logo de Empresa
- [ ] Logo se muestra en navegación (40x40px)
- [ ] Logo se muestra en footer (40x40px)
- [ ] Logo se muestra en login/register (80x80px)
- [ ] Logo se muestra en admin panel (40x40px)
- [ ] Imagen se carga correctamente (Unsplash)

---

## 📱 Pruebas Responsive

### Breakpoints
- [ ] Desktop (>1200px) - Layout completo
- [ ] Tablet (768px-1200px) - Navegación adaptada
- [ ] Mobile (<=768px) - Hamburger menu, layout vertical

### Elementos Específicos
- [ ] Navegación colapsa apropiadamente
- [ ] Productos se muestran en grid responsivo
- [ ] Formularios se adaptan al ancho
- [ ] Imágenes se redimensionan
- [ ] Texto permanece legible

---

## 🔍 Pruebas de Funcionalidad JavaScript

### Carrito de Compras
```javascript
// Abrir DevTools (F12) y ejecutar:
// 1. Agregar producto al carrito
addToCart(1, 2); // Producto ID 1, cantidad 2
console.log('Carrito:', getCartItems());

// 2. Actualizar cantidad
updateCartQuantity(1, 3);
console.log('Carrito actualizado:', getCartItems());

// 3. Eliminar producto
removeFromCart(1);
console.log('Carrito después de eliminar:', getCartItems());
```

### Búsqueda
```javascript
// Abrir DevTools y ejecutar:
// 1. Buscar productos
searchProducts('phone');
console.log('Resultados de búsqueda para "phone"');

// 2. Limpiar búsqueda
clearSearch();
```

---

## 🚨 Pruebas de Error

### Errores de Red
- [ ] Desconectar internet y recargar página
- [ ] Verificar que se muestran mensajes de error apropiados
- [ ] Reconectar y verificar que funciona nuevamente

### Errores de Validación
- [ ] Enviar formularios con campos vacíos
- [ ] Usar emails inválidos
- [ ] Usar contraseñas muy cortas
- [ ] Verificar que los errores se muestran claramente

---

## ✅ Resultado de Pruebas

### Resumen
- Total de elementos probados: ___/___
- Elementos funcionando: ___
- Elementos con problemas: ___
- Problemas críticos: ___

### Problemas Encontrados
1. [ ] Problema: _________________
   - Severidad: Alta/Media/Baja
   - Pasos para reproducir: ___________

2. [ ] Problema: _________________
   - Severidad: Alta/Media/Baja
   - Pasos para reproducir: ___________

### Conclusión
- [ ] ✅ Frontend listo para producción
- [ ] ⚠️ Necesita correcciones menores
- [ ] ❌ Requiere correcciones importantes

---

## 🔧 Herramientas de Desarrollo

### Chrome DevTools
```bash
# Abrir DevTools: F12
# Console tab: Para ejecutar JavaScript
# Network tab: Para ver requests HTTP
# Application tab: Para ver localStorage
# Performance tab: Para medir rendimiento
```

### Lighthouse Audit
```bash
# En Chrome DevTools -> Lighthouse tab
# Ejecutar audit para:
# - Performance
# - Accessibility
# - Best Practices
# - SEO
```

### Responsive Testing
```bash
# En Chrome DevTools -> Device Toolbar (Ctrl+Shift+M)
# Probar con:
# - iPhone SE (375x667)
# - iPad (768x1024)
# - Desktop (1920x1080)
```