#!/bin/bash

# TICS Store - Script Maestro de Pruebas

echo "🚀 TICS Store - Suite Completa de Pruebas"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Función para mostrar secciones
show_section() {
    echo -e "\n${PURPLE}===========================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}===========================================${NC}\n"
}

# Función para mostrar subsecciones
show_subsection() {
    echo -e "\n${BLUE}--- $1 ---${NC}"
}

# Verificar que el servidor no esté corriendo
if pgrep -f "node server.js" > /dev/null; then
    echo -e "${YELLOW}⚠️ Deteniendo servidor existente...${NC}"
    pkill -f "node server.js"
    sleep 2
fi

# Iniciar servidor para pruebas
show_section "🔧 CONFIGURACIÓN INICIAL"
echo -e "${BLUE}Iniciando servidor para pruebas...${NC}"
npm start > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Esperar que el servidor esté listo
echo "Esperando que el servidor esté disponible..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor listo en puerto 3000${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Servidor no respondió a tiempo${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
done

# Función para cleanup
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpiando...${NC}"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
}

# Trap para cleanup al salir
trap cleanup EXIT

show_section "🧪 EJECUTANDO SUITE DE PRUEBAS"

# Contador de resultados
total_tests=0
passed_tests=0
failed_tests=0

# Función para ejecutar prueba
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_file="$3"

    show_subsection "$test_name"
    total_tests=$((total_tests + 1))

    if [ -f "$test_file" ]; then
        if eval "$test_command" 2>&1; then
            echo -e "${GREEN}✅ $test_name - PASÓ${NC}"
            passed_tests=$((passed_tests + 1))
        else
            echo -e "${RED}❌ $test_name - FALLÓ${NC}"
            failed_tests=$((failed_tests + 1))
        fi
    else
        echo -e "${YELLOW}⚠️ $test_name - Archivo no encontrado: $test_file${NC}"
        failed_tests=$((failed_tests + 1))
    fi
    echo ""
}

# Ejecutar todas las pruebas
run_test "Pruebas de API Backend" "./test_api.sh" "test_api.sh"
run_test "Pruebas de Seguridad" "./test_security.sh" "test_security.sh"
run_test "Pruebas de Performance" "./test_performance.sh" "test_performance.sh"

# Pruebas manuales (mostrar checklists)
show_subsection "📋 Checklists de Pruebas Manuales"

if [ -f "test_frontend.md" ]; then
    echo -e "${BLUE}📁 Frontend Testing Checklist disponible: test_frontend.md${NC}"
    echo "   👉 Abrir http://localhost:3000 y seguir checklist"
fi

if [ -f "test_admin.md" ]; then
    echo -e "${BLUE}📁 Admin Panel Testing Checklist disponible: test_admin.md${NC}"
    echo "   👉 Abrir http://localhost:3000/admin y seguir checklist"
fi

# Docker tests (opcional)
show_subsection "🐳 Pruebas de Docker (Opcional)"
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}Docker disponible - ejecutando pruebas...${NC}"
    # Detener servidor actual para evitar conflicto de puertos
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null

    if ./test_docker.sh; then
        echo -e "${GREEN}✅ Pruebas de Docker - PASARON${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}❌ Pruebas de Docker - FALLARON${NC}"
        failed_tests=$((failed_tests + 1))
    fi
    total_tests=$((total_tests + 1))

    # Reiniciar servidor para siguientes pruebas
    npm start > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    sleep 5
else
    echo -e "${YELLOW}⚠️ Docker no disponible - saltando pruebas de Docker${NC}"
    echo "   💡 Instalar Docker para pruebas completas de deploy"
fi

show_section "📊 RESUMEN DE RESULTADOS"

echo -e "${BLUE}Estadísticas de Pruebas:${NC}"
echo "  📝 Total de pruebas: $total_tests"
echo -e "  ${GREEN}✅ Pasaron: $passed_tests${NC}"
echo -e "  ${RED}❌ Fallaron: $failed_tests${NC}"

# Calcular porcentaje
if [ $total_tests -gt 0 ]; then
    percentage=$((passed_tests * 100 / total_tests))
    echo -e "  📊 Éxito: ${percentage}%"
else
    percentage=0
fi

echo ""

# Estado general
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODAS LAS PRUEBAS PASARON!${NC}"
    echo -e "${GREEN}   Tu aplicación está lista para deploy 🚀${NC}"
    final_status="SUCCESS"
elif [ $percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠️ MAYORÍA DE PRUEBAS PASARON${NC}"
    echo -e "${YELLOW}   Revisar issues menores antes de deploy${NC}"
    final_status="WARNING"
else
    echo -e "${RED}❌ MÚLTIPLES PRUEBAS FALLARON${NC}"
    echo -e "${RED}   Resolver problemas antes de deploy${NC}"
    final_status="FAILURE"
fi

show_section "📋 PRÓXIMOS PASOS"

case $final_status in
    "SUCCESS")
        echo -e "${GREEN}✅ Tu aplicación TICS Store está lista para producción!${NC}"
        echo ""
        echo "🚀 Para deploy:"
        echo "   1. Revisar DEPLOYMENT_CHECKLIST.md"
        echo "   2. Configurar variables de entorno de producción"
        echo "   3. Cambiar contraseña de admin"
        echo "   4. Ejecutar deploy con Docker o plataforma cloud"
        echo ""
        echo "🔗 Accesos actuales:"
        echo "   • Frontend: http://localhost:3000"
        echo "   • Admin: http://localhost:3000/admin"
        echo "   • API: http://localhost:3000/api"
        ;;
    "WARNING")
        echo -e "${YELLOW}⚠️ Revisar los siguientes puntos antes de deploy:${NC}"
        echo ""
        echo "🔍 Issues encontrados:"
        echo "   • Revisar fallos en pruebas de seguridad"
        echo "   • Verificar configuración de rate limiting"
        echo "   • Comprobar sanitización de inputs"
        echo ""
        echo "📚 Consultar:"
        echo "   • DEPLOYMENT_CHECKLIST.md para fixes"
        echo "   • Logs en /tmp/server.log para detalles"
        ;;
    "FAILURE")
        echo -e "${RED}❌ Resolver problemas críticos antes de deploy:${NC}"
        echo ""
        echo "🆘 Acciones requeridas:"
        echo "   • Revisar logs del servidor: /tmp/server.log"
        echo "   • Verificar configuración de base de datos"
        echo "   • Comprobar variables de entorno"
        echo "   • Re-ejecutar pruebas después de fixes"
        echo ""
        echo "💡 Comando para re-ejecutar:"
        echo "   ./run_all_tests.sh"
        ;;
esac

echo ""
echo -e "${BLUE}📖 Documentación disponible:${NC}"
echo "   • README.md - Información general"
echo "   • DEPLOYMENT_CHECKLIST.md - Guía de deploy completa"
echo "   • test_frontend.md - Pruebas manuales frontend"
echo "   • test_admin.md - Pruebas manuales admin"

show_section "🏁 PRUEBAS COMPLETADAS"

echo -e "${PURPLE}Tiempo total: $(date)${NC}"
echo -e "${PURPLE}Estado final: $final_status${NC}"

# Exit code basado en resultados
if [ "$final_status" = "SUCCESS" ]; then
    exit 0
elif [ "$final_status" = "WARNING" ]; then
    exit 1
else
    exit 2
fi