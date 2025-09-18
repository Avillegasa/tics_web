#!/bin/bash

# TICS Store - Script de Pruebas de API

echo "🚀 Iniciando pruebas de API para TICS Store..."
echo "=============================================="

BASE_URL="http://localhost:3000"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar resultados
show_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "\n${YELLOW}1. 🔍 Health Check${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$BASE_URL/api/health")
show_result $? "Health Check - Status: $response"
cat /tmp/health_response | jq 2>/dev/null || cat /tmp/health_response

echo -e "\n${YELLOW}2. 👤 Registro de Usuario de Prueba${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/register_response -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test'$(date +%s)'@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }')
show_result $? "Registro de Usuario - Status: $response"
cat /tmp/register_response | jq 2>/dev/null || cat /tmp/register_response

echo -e "\n${YELLOW}3. 🔐 Login de Admin${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/login_response -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')
show_result $? "Login de Admin - Status: $response"

# Extraer token
ADMIN_TOKEN=$(cat /tmp/login_response | jq -r '.token' 2>/dev/null)
if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo "🔑 Token obtenido correctamente"
else
    echo -e "${RED}❌ No se pudo obtener el token${NC}"
    cat /tmp/login_response
    exit 1
fi

echo -e "\n${YELLOW}4. 👥 Listar Usuarios (Admin)${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/users_response -X GET "$BASE_URL/api/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
show_result $? "Listar Usuarios - Status: $response"
cat /tmp/users_response | jq 2>/dev/null || cat /tmp/users_response

echo -e "\n${YELLOW}5. 👤 Perfil del Usuario Actual${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/profile_response -X GET "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
show_result $? "Perfil de Usuario - Status: $response"
cat /tmp/profile_response | jq 2>/dev/null || cat /tmp/profile_response

echo -e "\n${YELLOW}6. 🚫 Prueba de Acceso Sin Token${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/unauthorized_response -X GET "$BASE_URL/api/users")
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ Acceso denegado correctamente - Status: $response${NC}"
else
    echo -e "${RED}❌ Debería denegar acceso - Status: $response${NC}"
fi

echo -e "\n${YELLOW}7. 🔄 Rate Limiting Test${NC}"
echo "Enviando múltiples requests para probar rate limiting..."
for i in {1..10}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/health")
    echo -n "$response "
done
echo ""

echo -e "\n${GREEN}🎉 Pruebas de API completadas!${NC}"
echo "=============================================="

# Limpiar archivos temporales
rm -f /tmp/*_response