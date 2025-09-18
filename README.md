# TICS Store

Una tienda en línea moderna especializada en productos tecnológicos con sistema completo de gestión de usuarios.

## Características

- 🛍️ Catálogo de productos interactivo
- 🔍 Búsqueda en tiempo real
- 🛒 Carrito de compras
- 💳 Proceso de checkout
- 👥 Sistema completo de usuarios con CRUD
- 🔐 Autenticación y autorización
- 🛠️ Panel de administración
- 📱 Diseño responsive
- ⚡ Carga rápida y optimizada
- 🎨 Interfaz moderna y atractiva
- 🗄️ Base de datos SQLite normalizada

## Tecnologías

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Base de datos**: SQLite3
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: bcryptjs, helmet, CORS, rate limiting
- **Validación**: express-validator

### Frontend
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Diseño**: CSS Grid, Flexbox, Responsive Design
- **Imágenes**: Unsplash API para imágenes de alta calidad
- **Fuentes**: Google Fonts (Inter)

## Estructura del Proyecto

```
TICS_web/
├── database/
│   ├── init.js            # Inicialización de base de datos
│   └── store.db           # Base de datos SQLite (se crea automáticamente)
├── controllers/
│   └── userController.js  # Controladores de usuarios
├── routes/
│   └── users.js          # Rutas de API para usuarios
├── middleware/
│   └── auth.js           # Middleware de autenticación
├── css/
│   ├── styles.css        # Estilos principales
│   └── admin.css         # Estilos del panel de administración
├── js/
│   ├── main.js           # Funcionalidad principal
│   ├── products.js       # Gestión de productos
│   ├── cart.js           # Carrito de compras
│   ├── search.js         # Búsqueda de productos
│   ├── admin.js          # Panel de administración
│   └── auth.js           # Autenticación frontend
├── data/
│   └── products.json     # Base de datos de productos (temporal)
├── index.html            # Página principal
├── admin.html            # Panel de administración
├── login.html            # Página de inicio de sesión
├── register.html         # Página de registro
├── server.js             # Servidor principal
├── package.json          # Dependencias del proyecto
├── Dockerfile            # Configuración Docker
├── docker-compose.yml    # Orquestación Docker
└── nginx.conf            # Configuración nginx para producción
```

## Instalación y Uso

### Desarrollo Local

1. **Clona el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd TICS_web
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   ```bash
   cp .env.example .env
   # Edita .env con tus configuraciones
   ```

4. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Accede a la aplicación**
   - Frontend: `http://localhost:3000`
   - Panel Admin: `http://localhost:3000/admin`
   - API: `http://localhost:3000/api`

### Producción con Docker

1. **Construye y ejecuta con Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Para producción con nginx**
   ```bash
   docker-compose --profile production up -d
   ```

## API Endpoints

### Autenticación
- `POST /api/users/register` - Registrar nuevo usuario
- `POST /api/users/login` - Iniciar sesión

### Usuarios (Protegidas)
- `GET /api/users/profile` - Obtener perfil del usuario actual
- `GET /api/users` - Listar usuarios (solo admin)
- `GET /api/users/:id` - Obtener usuario por ID
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario (solo admin)

### Sistema
- `GET /api/health` - Health check

## Credenciales por Defecto

### Administrador
- **Usuario**: `admin`
- **Email**: `admin@ticsstore.com`
- **Contraseña**: `admin123`

## Base de Datos

La aplicación utiliza SQLite con las siguientes tablas:

### Usuarios (`users`)
- `id` - ID único
- `username` - Nombre de usuario único
- `email` - Email único
- `password` - Contraseña hasheada
- `first_name` - Nombre
- `last_name` - Apellido
- `role` - Rol (customer/admin)
- `phone` - Teléfono
- `address` - Dirección
- `city` - Ciudad
- `postal_code` - Código postal
- `country` - País
- `is_active` - Estado activo
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Productos (`products`)
- Estructura normalizada para productos del catálogo

### Pedidos (`orders`)
- Sistema de pedidos con items relacionados

## Panel de Administración

Accede al panel de administración en `/admin` con las credenciales de administrador:

### Funcionalidades:
- 📊 Dashboard con estadísticas
- 👥 Gestión completa de usuarios (CRUD)
- 📦 Gestión de productos (en desarrollo)
- 🛒 Gestión de pedidos (en desarrollo)
- 🔍 Búsqueda y filtrado
- 📄 Paginación
- 🔐 Control de acceso por roles

## Seguridad

### Implementadas:
- ✅ Autenticación JWT
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de entrada
- ✅ Rate limiting
- ✅ Headers de seguridad (helmet)
- ✅ CORS configurado
- ✅ Sanitización de datos

### Roles de Usuario:
- **Customer**: Usuario regular con acceso a tienda
- **Admin**: Acceso completo al panel de administración

## Scripts Disponibles

```bash
npm start          # Inicia servidor en producción
npm run dev        # Inicia servidor con nodemon para desarrollo
npm run lint       # Ejecuta ESLint
npm test           # Ejecuta tests (por configurar)
```

## Variables de Entorno

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
DB_PATH=./database/store.db
CORS_ORIGIN=http://localhost:3000
```

## Deploy en Producción

### Con Docker
1. Construye la imagen: `docker build -t tics-store .`
2. Ejecuta el contenedor: `docker run -p 3000:3000 tics-store`

### Con Docker Compose + Nginx
1. `docker-compose --profile production up -d`
2. La aplicación estará disponible en el puerto 80

### Consideraciones de Producción
- Cambiar `JWT_SECRET` por un valor seguro
- Configurar HTTPS con certificados SSL
- Configurar respaldos de la base de datos
- Configurar logs y monitoreo
- Usar un reverse proxy (nginx incluido)

## Desarrollo

### Agregar Nuevas Funcionalidades
1. Backend: Agrega rutas en `/routes`, controladores en `/controllers`
2. Frontend: Agrega JavaScript en `/js`, estilos en `/css`
3. Base de datos: Modifica `/database/init.js` para nuevas tablas

### Testing
```bash
npm test  # Ejecuta tests unitarios
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## Contacto

- **Email**: contacto@ticsstore.com
- **GitHub**: [TICS Store Repository]
- **Demo**: [https://ticsstore.com] (cuando esté desplegado)

---

Desarrollado con ❤️ para la comunidad tech