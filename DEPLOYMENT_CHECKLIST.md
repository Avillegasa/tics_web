# 🚀 Checklist de Deploy - TICS Store

## 📋 Pre-Deploy - Desarrollo

### ✅ Pruebas Completadas
- [x] **Backend API**: Todas las pruebas pasaron ✅
- [x] **Frontend**: Funcionalidad verificada ✅
- [x] **Admin Panel**: CRUD completo funcionando ✅
- [x] **Seguridad**: 8/10 pruebas pasaron ⚠️
- [x] **Performance**: Excelente rendimiento ✅
- [ ] **Docker**: No probado (requiere Docker instalado) ⏳

### 🔧 Configuración de Entorno

#### Variables de Entorno para Producción
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=CAMBIAR_POR_VALOR_SEGURO_64_CARACTERES
DB_PATH=/app/database/store.db
CORS_ORIGIN=https://tu-dominio.com
```

#### Base de Datos
- [x] Esquema creado automáticamente
- [x] Usuario admin por defecto configurado
- [x] Datos de prueba disponibles
- [ ] ⚠️ **CRÍTICO**: Cambiar contraseña de admin en producción

---

## 🔒 Seguridad - Issues a Resolver

### ❌ Problemas Encontrados
1. **XSS Input**: Scripts en nombres de usuario no sanitizados
   ```bash
   # Solución: Agregar express-validator con escape
   body('username').escape()
   ```

2. **Rate Limiting**: No activado o límite muy alto
   ```javascript
   // En server.js, reducir límite:
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 50 // máximo 50 requests por IP
   });
   ```

3. **DB Expuesta**: Base de datos accesible vía web
   ```javascript
   // Agregar en server.js:
   app.use('/database', (req, res) => res.status(404).send('Not Found'));
   ```

### ✅ Seguridad Correcta
- JWT Authentication ✅
- Password hashing ✅
- Input validation ✅
- CORS configuration ✅
- Security headers ✅
- Role-based access ✅

---

## 🌐 Deploy Local para Pruebas

### Método 1: Node.js Directo
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables
cp .env .env.production
nano .env.production  # Editar valores seguros

# 3. Iniciar en producción
NODE_ENV=production npm start
```

### Método 2: Docker (Recomendado)
```bash
# 1. Construir imagen
docker build -t tics-store .

# 2. Ejecutar contenedor
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=tu_secreto_seguro \
  -v $(pwd)/database:/app/database \
  tics-store

# 3. O usar docker-compose
docker-compose up -d
```

### Método 3: Con Nginx (Producción)
```bash
# Usar docker-compose con perfil de producción
docker-compose --profile production up -d
```

---

## ☁️ Deploy en la Nube

### Preparación General
```bash
# 1. Crear .dockerignore
echo "node_modules
.git
.env
*.log
test_*
*.md" > .dockerignore

# 2. Optimizar Dockerfile para producción
# (Ya está optimizado)

# 3. Configurar variables de entorno seguras
```

### Opción A: Heroku
```bash
# 1. Instalar Heroku CLI
# 2. Login y crear app
heroku login
heroku create tu-tics-store

# 3. Configurar variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=tu_secreto_super_seguro_64_caracteres
heroku config:set DB_PATH=/app/database/store.db

# 4. Deploy
git push heroku main
```

### Opción B: Railway
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login y deploy
railway login
railway new
railway up
```

### Opción C: DigitalOcean App Platform
```bash
# 1. Conectar repositorio GitHub
# 2. Configurar variables de entorno en panel
# 3. Deploy automático desde main branch
```

### Opción D: AWS/GCP/Azure
```bash
# 1. Configurar container registry
# 2. Push imagen Docker
# 3. Deploy con servicio de containers
```

---

## 🔧 Configuración de Producción

### Nginx (Reverse Proxy)
```nginx
# /etc/nginx/sites-available/tics-store
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/HTTPS (Let's Encrypt)
```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Auto-renovación
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### PM2 (Process Manager)
```bash
# Instalar PM2
npm install -g pm2

# Crear ecosystem.config.js
module.exports = {
  apps: [{
    name: 'tics-store',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📊 Monitoreo y Logs

### Configurar Logs
```javascript
// Agregar a server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Health Checks
- [x] Endpoint `/api/health` implementado
- [ ] Configurar monitoring externo (UptimeRobot, Pingdom)
- [ ] Alertas por email/SMS

### Analytics
- [ ] Google Analytics para frontend
- [ ] API analytics con Morgan o similar
- [ ] Error tracking (Sentry, Bugsnag)

---

## 🗄️ Base de Datos en Producción

### SQLite (Actual - Desarrollo)
- ✅ Perfecto para desarrollo y pequeñas apps
- ⚠️ Limitado para alta concurrencia
- 📝 Hacer backups regulares del archivo .db

### PostgreSQL (Recomendado para Producción)
```javascript
// Modificar database/init.js para usar PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});
```

### Backups
```bash
# SQLite backup
cp database/store.db backups/store_$(date +%Y%m%d_%H%M%S).db

# Automatizar con cron
0 2 * * * cp /app/database/store.db /backups/store_$(date +\%Y\%m\%d_\%H\%M\%S).db
```

---

## 🚀 Proceso de Deploy Step-by-Step

### Pre-Deploy Checklist
- [ ] Todas las pruebas pasan
- [ ] Variables de entorno configuradas
- [ ] Secretos de JWT cambiados
- [ ] CORS configurado para dominio de producción
- [ ] Contraseña de admin cambiada
- [ ] Backup de base de datos actual

### Deploy Process
1. **Preparación**
   ```bash
   # Verificar que todo funciona localmente
   npm run dev
   # Abrir http://localhost:3000 y probar
   ```

2. **Build y Test**
   ```bash
   # Construir para producción
   NODE_ENV=production npm start
   # Ejecutar todas las pruebas
   ./test_api.sh
   ```

3. **Deploy**
   ```bash
   # Método 1: Docker
   docker-compose up -d

   # Método 2: Cloud Platform
   git push heroku main

   # Método 3: VPS
   rsync -av . user@servidor:/app/
   ssh user@servidor "cd /app && npm install && pm2 restart all"
   ```

4. **Verificación Post-Deploy**
   ```bash
   # Verificar que el sitio carga
   curl https://tu-dominio.com/api/health

   # Probar login de admin
   curl -X POST https://tu-dominio.com/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"NUEVA_CONTRASEÑA"}'
   ```

5. **Configuración Final**
   - [ ] Configurar DNS
   - [ ] SSL/HTTPS activo
   - [ ] Monitoring configurado
   - [ ] Backups programados

---

## 🧪 Testing en Producción

### Smoke Tests Post-Deploy
```bash
# Script para verificar funcionalidad básica
#!/bin/bash
PROD_URL="https://tu-dominio.com"

echo "🧪 Verificando deploy de producción..."

# Health check
curl -f "$PROD_URL/api/health" || echo "❌ Health check falló"

# Página principal
curl -f "$PROD_URL" | grep -q "TICS Store" || echo "❌ Página principal falló"

# Panel admin
curl -f "$PROD_URL/admin" | grep -q "Panel de Administración" || echo "❌ Admin falló"

echo "✅ Smoke tests completados"
```

### Performance Testing
```bash
# Con Apache Bench
ab -n 1000 -c 50 https://tu-dominio.com/api/health

# Objetivo: >100 requests/segundo, <1s response time
```

---

## 📚 Documentación para Usuario Final

### Credenciales de Acceso por Defecto
- **Admin Panel**: https://tu-dominio.com/admin
  - Usuario: `admin`
  - Password: `[NUEVA_CONTRASEÑA_SEGURA]`

### URLs Importantes
- **Tienda**: https://tu-dominio.com
- **Admin Panel**: https://tu-dominio.com/admin
- **API Health**: https://tu-dominio.com/api/health

### Soporte y Mantenimiento
- **Logs**: Ubicación de archivos de log
- **Backups**: Frecuencia y ubicación
- **Updates**: Proceso para actualizar la aplicación
- **Troubleshooting**: Pasos comunes para resolver problemas

---

## 🎯 Post-Deploy Optimizaciones

### Performance
- [ ] Implementar CDN para assets estáticos
- [ ] Configurar compresión gzip/brotli
- [ ] Optimizar imágenes (WebP, lazy loading)
- [ ] Implementar Service Workers para caching

### SEO
- [ ] Meta tags optimizados
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Google Search Console

### Analytics y Marketing
- [ ] Google Analytics
- [ ] Facebook Pixel
- [ ] Email marketing integration
- [ ] Social media integration

---

## 🆘 Troubleshooting

### Problemas Comunes

#### "Cannot connect to database"
```bash
# Verificar permisos de directorio
chmod 755 database/
ls -la database/

# Verificar variables de entorno
echo $DB_PATH
```

#### "Invalid JWT token"
```bash
# Verificar secret
echo $JWT_SECRET

# Regenerar tokens
# Los usuarios necesitarán re-login
```

#### "Permission denied"
```bash
# Verificar usuario del proceso
ps aux | grep node

# Cambiar ownership si es necesario
chown -R nodejs:nodejs /app
```

#### Alto uso de memoria
```bash
# Verificar memory leaks
node --inspect server.js
# Conectar Chrome DevTools para profiling

# Reiniciar si es necesario
pm2 restart all
```

---

## ✅ Checklist Final Pre-Producción

### 🔒 Seguridad
- [ ] JWT_SECRET cambiado y seguro (64+ caracteres)
- [ ] Contraseña de admin cambiada
- [ ] HTTPS configurado
- [ ] Rate limiting configurado apropiadamente
- [ ] XSS protection implementada
- [ ] Base de datos no accesible vía web
- [ ] CORS configurado para dominio específico

### 🔧 Configuración
- [ ] Variables de entorno de producción configuradas
- [ ] Base de datos inicializada
- [ ] Backup strategy implementada
- [ ] Logs configurados
- [ ] Monitoring configurado
- [ ] Error tracking configurado

### 🧪 Testing
- [ ] Todas las pruebas automatizadas pasan
- [ ] Smoke tests en producción exitosos
- [ ] Performance testing satisfactorio
- [ ] Security scanning completado
- [ ] Manual testing del flujo crítico

### 📊 Monitoreo
- [ ] Health checks configurados
- [ ] Uptime monitoring activo
- [ ] Error alerting configurado
- [ ] Performance monitoring activo
- [ ] Log aggregation configurado

### 📚 Documentación
- [ ] README actualizado
- [ ] API documentation disponible
- [ ] Deployment guide completo
- [ ] Troubleshooting guide disponible
- [ ] User manual creado

---

## 🎉 ¡Deploy Exitoso!

Una vez completado este checklist, tu aplicación TICS Store estará lista para producción con:

✅ **Sistema completo de gestión de usuarios**
✅ **Panel de administración profesional**
✅ **API RESTful segura**
✅ **Frontend responsive y moderno**
✅ **Base de datos normalizada**
✅ **Autenticación y autorización robusta**
✅ **Configuración para escalar**

### 📞 Soporte Post-Deploy
- 📧 Email: support@ticsstore.com
- 📖 Docs: https://docs.ticsstore.com
- 🐛 Issues: https://github.com/user/tics-store/issues

---

**¡Felicidades! 🎊 Tu aplicación está lista para conquistar la web! 🚀**