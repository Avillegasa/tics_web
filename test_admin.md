# 🛠️ Pruebas del Panel de Administración - TICS Store

## 📋 Instrucciones
Abre http://localhost:3000/admin en tu navegador y sigue estos pasos:

---

## 🔐 Autenticación

### Login del Administrador
1. [ ] **Acceder al panel**: http://localhost:3000/admin
2. [ ] **Verificar pantalla de login**:
   - [ ] Logo de empresa se muestra (60x60px)
   - [ ] Título "Panel de Administración"
   - [ ] Campos usuario y contraseña
   - [ ] Botón "Iniciar Sesión"
   - [ ] Enlace "Volver a la tienda"

3. [ ] **Probar credenciales incorrectas**:
   - Usuario: `admin`, Contraseña: `wrong`
   - [ ] Debe mostrar error "Invalid credentials"

4. [ ] **Login exitoso**:
   - Usuario: `admin`, Contraseña: `admin123`
   - [ ] Debe redirigir al dashboard
   - [ ] Debe mostrar navegación del admin

---

## 📊 Dashboard

### Elementos del Dashboard
- [ ] **Navegación superior**:
  - [ ] Logo "TICS Admin" con imagen
  - [ ] Enlaces: Dashboard, Usuarios, Productos, Pedidos
  - [ ] Menú de usuario con botón "Cerrar Sesión"

- [ ] **Estadísticas**:
  - [ ] Card "Usuarios Totales" con número
  - [ ] Card "Productos" (debería mostrar 8)
  - [ ] Card "Pedidos" (debería mostrar 0)
  - [ ] Card "Ingresos" (debería mostrar €0)

### Navegación
- [ ] Click en "Usuarios" cambia a sección de usuarios
- [ ] Click en "Dashboard" regresa al dashboard
- [ ] Links "Productos" y "Pedidos" muestran placeholder

---

## 👥 Gestión de Usuarios

### Lista de Usuarios
1. [ ] **Acceder a sección Usuarios**
2. [ ] **Verificar tabla de usuarios**:
   - [ ] Headers: ID, Usuario, Email, Nombre, Rol, Estado, Fecha Registro, Acciones
   - [ ] Al menos 2 usuarios: admin y el testuser creado
   - [ ] Botones "Editar" y "Eliminar" para cada usuario

### Crear Nuevo Usuario
1. [ ] **Click en "Agregar Usuario"**
2. [ ] **Verificar modal**:
   - [ ] Título "Agregar Usuario"
   - [ ] Campos: Usuario, Email, Contraseña, Rol, Nombre, Apellido, etc.
   - [ ] Botones "Cancelar" y "Guardar"

3. [ ] **Crear usuario de prueba**:
   ```
   Usuario: admintest
   Email: admintest@test.com
   Contraseña: test123
   Rol: customer
   Nombre: Admin
   Apellido: Test
   ```
   - [ ] Click "Guardar"
   - [ ] Debe mostrar mensaje de éxito
   - [ ] Usuario debe aparecer en la lista

### Editar Usuario
1. [ ] **Click "Editar" en un usuario**
2. [ ] **Verificar modal de edición**:
   - [ ] Título "Editar Usuario"
   - [ ] Campos pre-rellenados con datos del usuario
   - [ ] Campo contraseña vacío (opcional)

3. [ ] **Modificar datos**:
   - Cambiar nombre a "Usuario Modificado"
   - [ ] Click "Guardar"
   - [ ] Verificar que cambios se reflejan en la lista

### Eliminar Usuario
1. [ ] **Click "Eliminar" en usuario de prueba**
2. [ ] **Confirmar eliminación**:
   - [ ] Debe mostrar diálogo de confirmación
   - [ ] Click "OK"
   - [ ] Usuario debe desaparecer de la lista
   - [ ] Mensaje de éxito

### Paginación
1. [ ] **Si hay más de 10 usuarios**:
   - [ ] Botones de paginación aparecen
   - [ ] "Anterior" y "Siguiente" funcionan
   - [ ] Números de página funcionan

---

## 🔒 Seguridad del Admin

### Control de Acceso
1. [ ] **Logout y acceso directo**:
   - Click "Cerrar Sesión"
   - Intentar acceder a http://localhost:3000/admin directamente
   - [ ] Debe redirigir al login

2. [ ] **Token expiration**:
   - Abrir DevTools > Application > Local Storage
   - Modificar o eliminar 'admin_token'
   - Recargar página
   - [ ] Debe redirigir al login

### Roles de Usuario
1. [ ] **Login con usuario regular**:
   - Crear usuario con rol "customer"
   - Intentar hacer login en /admin
   - [ ] Debe mostrar error "No tienes permisos de administrador"

---

## 🎨 Responsive Design

### Desktop (>1200px)
- [ ] Layout completo visible
- [ ] Navegación horizontal
- [ ] Tabla completa visible
- [ ] Modal centrado

### Tablet (768px-1200px)
- [ ] Navegación se adapta
- [ ] Tabla scrolleable horizontalmente
- [ ] Cards de estadísticas en grid

### Mobile (<768px)
- [ ] Navegación colapsa
- [ ] Tabla responsive
- [ ] Modal ocupa ancho completo
- [ ] Forms se adaptan a una columna

---

## 🚨 Pruebas de Error

### Validación de Formularios
1. [ ] **Usuario duplicado**:
   - Intentar crear usuario con email existente
   - [ ] Debe mostrar error "Username or email already exists"

2. [ ] **Campos requeridos**:
   - Enviar formulario con campos vacíos
   - [ ] Debe mostrar errores de validación

3. [ ] **Email inválido**:
   - Usar email sin formato válido
   - [ ] Debe mostrar error de validación

### Errores de Red
1. [ ] **Servidor caído**:
   - Detener servidor (Ctrl+C en terminal)
   - Intentar operaciones en admin
   - [ ] Debe mostrar errores de conexión apropiados

---

## 📱 Pruebas en Diferentes Navegadores

### Chrome
- [ ] Funcionalidad completa
- [ ] Estilos correctos
- [ ] JavaScript funciona

### Firefox
- [ ] Funcionalidad completa
- [ ] Estilos correctos
- [ ] JavaScript funciona

### Safari (si disponible)
- [ ] Funcionalidad completa
- [ ] Estilos correctos
- [ ] JavaScript funciona

---

## ⚡ Pruebas de Performance

### Tiempo de Carga
```javascript
// Abrir DevTools > Console y ejecutar:
performance.mark('start');
// Navegar por el admin
performance.mark('end');
performance.measure('admin-navigation', 'start', 'end');
console.log(performance.getEntriesByType('measure'));
```

### Memory Usage
1. [ ] **DevTools > Performance**:
   - Grabar sesión de uso del admin
   - [ ] Verificar que no hay memory leaks
   - [ ] Tiempo de respuesta < 2 segundos

---

## 🧪 Pruebas Automatizadas (Opcional)

### Con Selenium/Playwright
```javascript
// Ejemplo de test automatizado
test('Admin login and user creation', async () => {
  await page.goto('http://localhost:3000/admin');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin123');
  await page.click('button[type=submit]');

  // Verificar dashboard
  await expect(page.locator('#admin-username')).toContainText('Admin');

  // Ir a usuarios
  await page.click('[data-section="users"]');

  // Crear usuario
  await page.click('#add-user-btn');
  // ... más pasos
});
```

---

## ✅ Checklist Final

### Funcionalidad Core
- [ ] Login/logout funciona
- [ ] Dashboard carga estadísticas
- [ ] CRUD de usuarios completo
- [ ] Paginación funciona
- [ ] Validaciones funcionan
- [ ] Errores se muestran apropiadamente

### Seguridad
- [ ] Control de acceso por roles
- [ ] Validación de tokens
- [ ] Sanitización de inputs
- [ ] Protección CSRF implícita

### UX/UI
- [ ] Interfaz intuitiva
- [ ] Feedback visual apropiado
- [ ] Responsive design
- [ ] Consistencia visual

### Performance
- [ ] Carga rápida (< 3 segundos)
- [ ] Navegación fluida
- [ ] Sin memory leaks
- [ ] API responses < 1 segundo

---

## 📊 Resultado Final

**Estado del Panel de Admin:**
- [ ] ✅ Listo para producción
- [ ] ⚠️ Necesita ajustes menores
- [ ] ❌ Requiere correcciones importantes

**Problemas encontrados:**
1. ________________________________
2. ________________________________
3. ________________________________

**Recomendaciones:**
1. ________________________________
2. ________________________________
3. ________________________________