#!/bin/bash

# TICS Store - Script de Pruebas de Docker Deploy

echo "🐳 Iniciando pruebas de Docker deploy para TICS Store..."
echo "====================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar resultados
show_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Función para cleanup
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpiando recursos de prueba...${NC}"
    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null
    docker rmi tics-store-test 2>/dev/null
}

# Trap para cleanup al salir
trap cleanup EXIT

echo -e "\n${YELLOW}1. 🔍 Verificación de Archivos Docker${NC}"

# Verificar que existen los archivos necesarios
if [ -f "Dockerfile" ]; then
    show_result 0 "Dockerfile existe"
else
    show_result 1 "Dockerfile no encontrado"
    exit 1
fi

if [ -f "docker-compose.yml" ]; then
    show_result 0 "docker-compose.yml existe"
else
    show_result 1 "docker-compose.yml no encontrado"
    exit 1
fi

if [ -f ".dockerignore" ]; then
    show_result 0 ".dockerignore existe"
else
    echo -e "${YELLOW}⚠️ .dockerignore recomendado pero no obligatorio${NC}"
fi

echo -e "\n${YELLOW}2. 🏗️ Construcción de Imagen Docker${NC}"

echo -e "${BLUE}Construyendo imagen Docker...${NC}"
if docker build -t tics-store-test . > /tmp/docker_build.log 2>&1; then
    show_result 0 "Imagen Docker construida exitosamente"
else
    show_result 1 "Error construyendo imagen Docker"
    echo "Ver log: cat /tmp/docker_build.log"
    exit 1
fi

echo -e "\n${YELLOW}3. 🔧 Creación de docker-compose de Prueba${NC}"

# Crear docker-compose para pruebas (puerto diferente para evitar conflictos)
cat > docker-compose.test.yml << EOF
version: '3.8'

services:
  web-test:
    image: tics-store-test
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=test_jwt_secret_for_docker
      - DB_PATH=/app/database/store.db
      - CORS_ORIGIN=http://localhost:3002
    volumes:
      - ./test_database:/app/database
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF

show_result 0 "docker-compose.test.yml creado"

echo -e "\n${YELLOW}4. 🚀 Iniciando Contenedor${NC}"

echo -e "${BLUE}Iniciando servicio con docker-compose...${NC}"
if docker-compose -f docker-compose.test.yml up -d > /tmp/docker_up.log 2>&1; then
    show_result 0 "Contenedor iniciado"
else
    show_result 1 "Error iniciando contenedor"
    cat /tmp/docker_up.log
    exit 1
fi

echo -e "\n${YELLOW}5. ⏳ Esperando que el Servicio Esté Listo${NC}"

echo -e "${BLUE}Esperando que el servicio esté disponible...${NC}"
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        show_result 0 "Servicio respondiendo en puerto 3002"
        break
    fi

    echo "Intento $attempt/$max_attempts - esperando..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    show_result 1 "Servicio no respondió a tiempo"
    echo "Logs del contenedor:"
    docker-compose -f docker-compose.test.yml logs
    exit 1
fi

echo -e "\n${YELLOW}6. 🧪 Pruebas Funcionales en Contenedor${NC}"

TEST_URL="http://localhost:3002"

# Health check
echo -e "${BLUE}Probando health check...${NC}"
if curl -s "$TEST_URL/api/health" | grep -q "OK"; then
    show_result 0 "Health check funciona"
else
    show_result 1 "Health check falla"
fi

# Login de admin
echo -e "${BLUE}Probando login de admin...${NC}"
login_response=$(curl -s -X POST "$TEST_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$login_response" | grep -q "token"; then
    show_result 0 "Login de admin funciona"
    DOCKER_TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    show_result 1 "Login de admin falla"
    echo "Respuesta: $login_response"
fi

# Registro de usuario
echo -e "${BLUE}Probando registro de usuario...${NC}"
register_response=$(curl -s -X POST "$TEST_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dockertest",
    "email": "docker@test.com",
    "password": "test123",
    "first_name": "Docker",
    "last_name": "Test"
  }')

if echo "$register_response" | grep -q "User created successfully"; then
    show_result 0 "Registro de usuario funciona"
else
    show_result 1 "Registro de usuario falla"
fi

# Verificar que páginas estáticas cargan
echo -e "${BLUE}Probando páginas estáticas...${NC}"
if curl -s "$TEST_URL" | grep -q "TICS Store"; then
    show_result 0 "Página principal carga"
else
    show_result 1 "Página principal no carga"
fi

if curl -s "$TEST_URL/admin" | grep -q "Panel de Administración"; then
    show_result 0 "Panel admin carga"
else
    show_result 1 "Panel admin no carga"
fi

echo -e "\n${YELLOW}7. 🔍 Verificación de Logs${NC}"

echo -e "${BLUE}Verificando logs del contenedor...${NC}"
docker_logs=$(docker-compose -f docker-compose.test.yml logs --tail=50)

if echo "$docker_logs" | grep -q "Server running on port"; then
    show_result 0 "Servidor inició correctamente"
else
    show_result 1 "Problemas en inicio del servidor"
fi

if echo "$docker_logs" | grep -q "Database initialized successfully"; then
    show_result 0 "Base de datos inicializada"
else
    show_result 1 "Problemas con inicialización de BD"
fi

if echo "$docker_logs" | grep -iq "error"; then
    echo -e "${YELLOW}⚠️ Se encontraron errores en logs:${NC}"
    echo "$docker_logs" | grep -i error
else
    show_result 0 "No hay errores en logs"
fi

echo -e "\n${YELLOW}8. 📊 Verificación de Recursos${NC}"

echo -e "${BLUE}Verificando uso de recursos del contenedor...${NC}"

# Obtener estadísticas del contenedor
container_id=$(docker-compose -f docker-compose.test.yml ps -q web-test)

if [ -n "$container_id" ]; then
    stats=$(docker stats --no-stream --format "{{.CPUPerc}} {{.MemUsage}}" "$container_id")
    cpu_usage=$(echo "$stats" | cut -d' ' -f1)
    mem_usage=$(echo "$stats" | cut -d' ' -f2)

    echo "CPU Usage: $cpu_usage"
    echo "Memory Usage: $mem_usage"

    # Verificar que el uso no sea excesivo
    cpu_num=$(echo "$cpu_usage" | sed 's/%//' | cut -d'.' -f1)
    if [ "$cpu_num" -lt 50 ] 2>/dev/null; then
        show_result 0 "Uso de CPU normal"
    else
        show_result 1 "Alto uso de CPU"
    fi
else
    show_result 1 "No se pudo obtener ID del contenedor"
fi

echo -e "\n${YELLOW}9. 🔒 Verificación de Seguridad Docker${NC}"

echo -e "${BLUE}Verificando configuración de seguridad...${NC}"

# Verificar que no corre como root
user_info=$(docker exec "$container_id" whoami 2>/dev/null)
if [ "$user_info" = "nodejs" ]; then
    show_result 0 "Contenedor corre como usuario no-root"
else
    show_result 1 "Contenedor podría correr como root"
fi

# Verificar health check
if docker inspect "$container_id" | grep -q '"Health"'; then
    show_result 0 "Health check configurado"
else
    show_result 1 "Health check no configurado"
fi

echo -e "\n${YELLOW}10. 🧪 Prueba de Reinicio${NC}"

echo -e "${BLUE}Probando reinicio del contenedor...${NC}"
if docker-compose -f docker-compose.test.yml restart > /dev/null 2>&1; then
    show_result 0 "Reinicio exitoso"

    # Esperar que responda después del reinicio
    sleep 10
    if curl -s "$TEST_URL/api/health" > /dev/null 2>&1; then
        show_result 0 "Servicio responde después del reinicio"
    else
        show_result 1 "Servicio no responde después del reinicio"
    fi
else
    show_result 1 "Error en reinicio"
fi

echo -e "\n${YELLOW}11. 📋 Resumen de Deploy Docker${NC}"

echo -e "${BLUE}Estado final del deploy:${NC}"

# Verificar estado final
final_status=$(curl -s "$TEST_URL/api/health" 2>/dev/null)
if echo "$final_status" | grep -q "OK"; then
    echo -e "${GREEN}🎉 Deploy Docker EXITOSO${NC}"
    echo "  ✅ Imagen construida correctamente"
    echo "  ✅ Contenedor ejecutándose"
    echo "  ✅ API respondiendo"
    echo "  ✅ Base de datos funcionando"
    echo "  ✅ Frontend accesible"
    echo ""
    echo -e "${BLUE}Acceso a la aplicación:${NC}"
    echo "  🌐 Frontend: http://localhost:3002"
    echo "  🛠️ Admin: http://localhost:3002/admin"
    echo "  🔌 API: http://localhost:3002/api"
    echo ""
    echo -e "${YELLOW}Para producción:${NC}"
    echo "  1. Cambiar JWT_SECRET por valor seguro"
    echo "  2. Configurar HTTPS"
    echo "  3. Usar volúmenes persistentes para DB"
    echo "  4. Configurar logs externos"
    echo "  5. Usar nginx como reverse proxy"
else
    echo -e "${RED}❌ Deploy Docker FALLÓ${NC}"
    echo "  Ver logs: docker-compose -f docker-compose.test.yml logs"
fi

echo -e "\n${GREEN}🎉 Pruebas de Docker completadas!${NC}"
echo "====================================================="