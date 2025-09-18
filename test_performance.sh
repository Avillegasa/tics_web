#!/bin/bash

# TICS Store - Script de Pruebas de Performance

echo "⚡ Iniciando pruebas de performance para TICS Store..."
echo "==================================================="

BASE_URL="http://localhost:3000"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para medir tiempo de respuesta
measure_response_time() {
    local url=$1
    local name=$2

    echo -e "${BLUE}Midiendo tiempo de respuesta: $name${NC}"

    # Hacer 5 requests y promediar
    total_time=0
    for i in {1..5}; do
        time=$(curl -s -w "%{time_total}" -o /dev/null "$url")
        total_time=$(echo "$total_time + $time" | bc -l)
    done

    avg_time=$(echo "scale=3; $total_time / 5" | bc -l)
    echo "Tiempo promedio: ${avg_time}s"

    # Evaluar performance
    if (( $(echo "$avg_time < 1.0" | bc -l) )); then
        echo -e "${GREEN}✅ Excelente (< 1s)${NC}"
    elif (( $(echo "$avg_time < 2.0" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Bueno (< 2s)${NC}"
    else
        echo -e "${RED}❌ Lento (> 2s)${NC}"
    fi
    echo ""
}

echo -e "\n${YELLOW}1. 🌐 Tiempo de Respuesta de Páginas${NC}"

measure_response_time "$BASE_URL" "Página Principal"
measure_response_time "$BASE_URL/shop.html" "Tienda"
measure_response_time "$BASE_URL/admin" "Panel Admin"
measure_response_time "$BASE_URL/login.html" "Login"

echo -e "\n${YELLOW}2. 🔌 Tiempo de Respuesta de API${NC}"

measure_response_time "$BASE_URL/api/health" "Health Check"

# Obtener token para pruebas autenticadas
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Midiendo API autenticada...${NC}"

    total_time=0
    for i in {1..5}; do
        time=$(curl -s -w "%{time_total}" -o /dev/null \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          "$BASE_URL/api/users")
        total_time=$(echo "$total_time + $time" | bc -l)
    done

    avg_time=$(echo "scale=3; $total_time / 5" | bc -l)
    echo "API Users (autenticada): ${avg_time}s"

    if (( $(echo "$avg_time < 0.5" | bc -l) )); then
        echo -e "${GREEN}✅ API muy rápida${NC}"
    elif (( $(echo "$avg_time < 1.0" | bc -l) )); then
        echo -e "${YELLOW}⚠️ API moderada${NC}"
    else
        echo -e "${RED}❌ API lenta${NC}"
    fi
fi

echo -e "\n${YELLOW}3. 📊 Throughput - Requests por Segundo${NC}"

echo -e "${BLUE}Midiendo throughput con ab (Apache Bench)...${NC}"

if command -v ab &> /dev/null; then
    echo "Ejecutando: ab -n 100 -c 10 $BASE_URL/api/health"
    ab -n 100 -c 10 "$BASE_URL/api/health" | grep -E "Requests per second|Time per request"
else
    echo "Apache Bench no instalado. Midiendo manualmente..."

    echo "Enviando 50 requests concurrentes..."
    start_time=$(date +%s.%N)

    for i in {1..50}; do
        curl -s -o /dev/null "$BASE_URL/api/health" &
    done
    wait

    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    rps=$(echo "scale=2; 50 / $duration" | bc -l)

    echo "Tiempo total: ${duration}s"
    echo "Requests por segundo: ${rps}"

    if (( $(echo "$rps > 100" | bc -l) )); then
        echo -e "${GREEN}✅ Buen throughput${NC}"
    elif (( $(echo "$rps > 50" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Throughput moderado${NC}"
    else
        echo -e "${RED}❌ Throughput bajo${NC}"
    fi
fi

echo -e "\n${YELLOW}4. 💾 Uso de Memoria${NC}"

echo -e "${BLUE}Verificando uso de memoria del proceso Node.js...${NC}"

# Encontrar proceso Node.js
node_pid=$(pgrep -f "node server.js" | head -1)

if [ -n "$node_pid" ]; then
    memory_kb=$(ps -p "$node_pid" -o rss= | tr -d ' ')
    memory_mb=$(echo "scale=2; $memory_kb / 1024" | bc -l)

    echo "Proceso Node.js (PID: $node_pid)"
    echo "Memoria utilizada: ${memory_mb} MB"

    if (( $(echo "$memory_mb < 100" | bc -l) )); then
        echo -e "${GREEN}✅ Uso de memoria eficiente${NC}"
    elif (( $(echo "$memory_mb < 250" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Uso de memoria normal${NC}"
    else
        echo -e "${RED}❌ Alto uso de memoria${NC}"
    fi
else
    echo "No se pudo encontrar el proceso Node.js"
fi

echo -e "\n${YELLOW}5. 📈 Stress Test${NC}"

echo -e "${BLUE}Realizando stress test ligero...${NC}"

# Test de carga con múltiples usuarios simultáneos
echo "Simulando 20 usuarios simultáneos por 10 segundos..."

stress_test() {
    local user_id=$1
    local requests=0
    local start_time=$(date +%s)
    local end_time=$((start_time + 10))

    while [ $(date +%s) -lt $end_time ]; do
        curl -s -o /dev/null "$BASE_URL/api/health"
        requests=$((requests + 1))
    done

    echo "Usuario $user_id: $requests requests"
}

total_requests=0
for i in {1..20}; do
    stress_test $i &
done

wait

echo -e "${GREEN}Stress test completado${NC}"

echo -e "\n${YELLOW}6. 🔍 Análisis de Tamaño de Respuesta${NC}"

echo -e "${BLUE}Analizando tamaño de páginas...${NC}"

# Medir tamaños de páginas principales
for page in "" "/shop.html" "/admin" "/login.html"; do
    if [ -z "$page" ]; then
        name="Página Principal"
        url="$BASE_URL"
    else
        name="$(basename $page .html)"
        url="$BASE_URL$page"
    fi

    size=$(curl -s "$url" | wc -c)
    size_kb=$(echo "scale=2; $size / 1024" | bc -l)

    echo "$name: ${size_kb} KB"

    if (( $(echo "$size_kb < 100" | bc -l) )); then
        echo -e "${GREEN}✅ Tamaño óptimo${NC}"
    elif (( $(echo "$size_kb < 300" | bc -l) )); then
        echo -e "${YELLOW}⚠️ Tamaño moderado${NC}"
    else
        echo -e "${RED}❌ Página grande${NC}"
    fi
done

echo -e "\n${YELLOW}7. 🚀 Recomendaciones de Optimización${NC}"

echo -e "${BLUE}Generando recomendaciones...${NC}"

echo "📋 Checklist de Performance:"
echo ""
echo "Frontend:"
echo "  □ Minificar CSS y JavaScript"
echo "  □ Optimizar imágenes (WebP, lazy loading)"
echo "  □ Implementar Service Worker para caching"
echo "  □ Usar CDN para assets estáticos"
echo "  □ Comprimir responses (gzip/brotli)"
echo ""
echo "Backend:"
echo "  □ Implementar caching de respuestas"
echo "  □ Optimizar queries de base de datos"
echo "  □ Usar conexión persistente a DB"
echo "  □ Implementar rate limiting más eficiente"
echo "  □ Usar clustering para múltiples cores"
echo ""
echo "Base de Datos:"
echo "  □ Agregar índices a columnas frecuentemente consultadas"
echo "  □ Implementar connection pooling"
echo "  □ Considerar migrar a PostgreSQL para producción"
echo ""
echo "Infraestructura:"
echo "  □ Usar reverse proxy (nginx)"
echo "  □ Implementar load balancing"
echo "  □ Configurar monitoring (PM2, New Relic)"
echo "  □ Usar CDN global"

echo -e "\n${GREEN}🎉 Pruebas de performance completadas!${NC}"
echo "==================================================="