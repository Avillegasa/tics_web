#!/bin/bash

# TICS Store - Script de Pruebas de Seguridad

echo "🔒 Iniciando pruebas de seguridad para TICS Store..."
echo "=================================================="

BASE_URL="http://localhost:3000"

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

echo -e "\n${YELLOW}1. 🚫 Pruebas de Autenticación${NC}"

# Prueba acceso sin token
echo -e "${BLUE}Probando acceso sin token...${NC}"
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/users")
if [ "$response" = "401" ]; then
    show_result 0 "Acceso denegado sin token (401)"
else
    show_result 1 "ERROR: Permite acceso sin token (Status: $response)"
fi

# Prueba token inválido
echo -e "${BLUE}Probando token inválido...${NC}"
response=$(curl -s -w "%{http_code}" -o /dev/null -H "Authorization: Bearer invalid_token_123" "$BASE_URL/api/users")
if [ "$response" = "403" ]; then
    show_result 0 "Token inválido rechazado (403)"
else
    show_result 1 "ERROR: Acepta token inválido (Status: $response)"
fi

echo -e "\n${YELLOW}2. 🛡️ Pruebas de Headers de Seguridad${NC}"

# Verificar headers de seguridad
echo -e "${BLUE}Verificando headers de seguridad...${NC}"
headers=$(curl -s -I "$BASE_URL")

if echo "$headers" | grep -q "X-Frame-Options"; then
    show_result 0 "X-Frame-Options presente"
else
    show_result 1 "X-Frame-Options faltante"
fi

if echo "$headers" | grep -q "X-Content-Type-Options"; then
    show_result 0 "X-Content-Type-Options presente"
else
    show_result 1 "X-Content-Type-Options faltante"
fi

echo -e "\n${YELLOW}3. 🔄 Pruebas de Rate Limiting${NC}"

echo -e "${BLUE}Probando rate limiting con múltiples requests...${NC}"
rate_limit_hit=false
for i in {1..25}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/health")
    if [ "$response" = "429" ]; then
        rate_limit_hit=true
        break
    fi
done

if [ "$rate_limit_hit" = true ]; then
    show_result 0 "Rate limiting funciona (429 después de múltiples requests)"
else
    show_result 1 "Rate limiting no activado o límite muy alto"
fi

echo -e "\n${YELLOW}4. 🗂️ Pruebas de Validación de Input${NC}"

# SQL Injection attempts
echo -e "${BLUE}Probando SQL injection...${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/sql_test -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin'\'' OR 1=1--",
    "password": "anything"
  }')

if [ "$response" = "401" ]; then
    show_result 0 "SQL injection bloqueado (401)"
else
    show_result 1 "PELIGRO: Posible SQL injection (Status: $response)"
    cat /tmp/sql_test
fi

# XSS attempt
echo -e "${BLUE}Probando XSS...${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/xss_test -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "<script>alert(\"xss\")</script>",
    "email": "test@test.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }')

# El usuario no debería crearse o debería sanitizar el input
if [ "$response" = "400" ] || [ "$response" = "422" ]; then
    show_result 0 "XSS input rechazado o sanitizado"
else
    show_result 1 "Revisar: XSS input aceptado (Status: $response)"
fi

echo -e "\n${YELLOW}5. 🔑 Pruebas de Gestión de Contraseñas${NC}"

# Contraseña débil
echo -e "${BLUE}Probando contraseña débil...${NC}"
response=$(curl -s -w "%{http_code}" -o /tmp/weak_pass_test -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "weakuser",
    "email": "weak@test.com",
    "password": "123",
    "first_name": "Weak",
    "last_name": "User"
  }')

if [ "$response" = "400" ]; then
    show_result 0 "Contraseña débil rechazada"
else
    show_result 1 "Revisar: Contraseña débil aceptada (Status: $response)"
fi

echo -e "\n${YELLOW}6. 🌐 Pruebas de CORS${NC}"

echo -e "${BLUE}Probando CORS desde origen no autorizado...${NC}"
response=$(curl -s -w "%{http_code}" -o /dev/null \
  -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "$BASE_URL/api/users")

# CORS debería permitir o denegar según configuración
echo "CORS response: $response"

echo -e "\n${YELLOW}7. 🔍 Pruebas de Enumeración de Usuarios${NC}"

echo -e "${BLUE}Probando enumeración de usuarios...${NC}"
# Intentar obtener usuario inexistente
response=$(curl -s -w "%{http_code}" -o /tmp/enum_test -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nonexistentuser12345",
    "password": "wrongpassword"
  }')

# Debería dar error genérico
if [ "$response" = "401" ]; then
    error_msg=$(cat /tmp/enum_test | grep -o '"error":"[^"]*"')
    if [[ "$error_msg" == *"Invalid credentials"* ]]; then
        show_result 0 "Error genérico - no revela si usuario existe"
    else
        show_result 1 "Posible enumeración: mensaje específico"
    fi
else
    show_result 1 "Respuesta inesperada para usuario inexistente"
fi

echo -e "\n${YELLOW}8. 🚪 Pruebas de Endpoints No Autorizados${NC}"

# Obtener token de admin
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    # Probar acceso con usuario regular a funciones de admin
    echo -e "${BLUE}Probando escalada de privilegios...${NC}"

    # Crear token de usuario regular
    USER_TOKEN=$(curl -s -X POST "$BASE_URL/api/users/register" \
      -H "Content-Type: application/json" \
      -d '{
        "username": "regularuser'$(date +%s)'",
        "email": "regular'$(date +%s)'@test.com",
        "password": "password123",
        "first_name": "Regular",
        "last_name": "User"
      }' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$USER_TOKEN" ]; then
        # Intentar listar usuarios con token de usuario regular
        response=$(curl -s -w "%{http_code}" -o /dev/null \
          -H "Authorization: Bearer $USER_TOKEN" \
          "$BASE_URL/api/users")

        if [ "$response" = "403" ]; then
            show_result 0 "Escalada de privilegios bloqueada (403)"
        else
            show_result 1 "PELIGRO: Usuario regular puede acceder a funciones admin"
        fi
    fi
fi

echo -e "\n${YELLOW}9. 📊 Pruebas de Information Disclosure${NC}"

echo -e "${BLUE}Probando revelación de información sensible...${NC}"
# Verificar que las contraseñas no se devuelven en responses
response=$(curl -s "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | grep -q '"password"'; then
    show_result 1 "PELIGRO: Contraseña incluida en response"
else
    show_result 0 "Contraseñas no expuestas en API"
fi

echo -e "\n${YELLOW}10. 🗄️ Pruebas de Base de Datos${NC}"

echo -e "${BLUE}Verificando protecciones de base de datos...${NC}"
# Verificar que archivos de DB no son accesibles vía web
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/database/store.db")
if [ "$response" = "404" ]; then
    show_result 0 "Base de datos no accesible vía web"
else
    show_result 1 "PELIGRO: Base de datos accesible (Status: $response)"
fi

echo -e "\n${GREEN}🎉 Pruebas de seguridad completadas!${NC}"
echo "=================================================="

# Limpiar archivos temporales
rm -f /tmp/*_test

echo -e "\n${BLUE}📋 Resumen de Seguridad:${NC}"
echo "- Verificar todos los ✅ antes de deploy"
echo "- Investigar y corregir todos los ❌"
echo "- Considerar implementar WAF para producción"
echo "- Usar HTTPS en producción"
echo "- Configurar rate limiting más estricto"