#!/bin/bash

# Script de deployment rápido para Vercel
# Uso: ./deploy-vercel.sh

echo "🚀 Iniciando deployment a Vercel..."
echo ""

# 1. Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# 2. Build del proyecto
echo "🔨 Building proyecto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build. Abortando deployment."
    exit 1
fi

echo "✅ Build exitoso!"
echo ""

# 3. Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI no está instalado."
    echo "Instalando Vercel CLI globalmente..."
    npm install -g vercel
fi

# 4. Deploy
echo "🚀 Desplegando a Vercel..."
echo ""
echo "Opciones:"
echo "1) Deploy a Preview (staging)"
echo "2) Deploy a Production"
echo ""
read -p "Selecciona una opción (1 o 2): " option

case $option in
    1)
        echo "📤 Desplegando a Preview..."
        vercel
        ;;
    2)
        echo "📤 Desplegando a Production..."
        vercel --prod
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment completado!"
echo ""
echo "📝 Recuerda configurar las variables de entorno en Vercel Dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
