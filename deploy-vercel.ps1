# Script de deployment rápido para Vercel (PowerShell)
# Uso: .\deploy-vercel.ps1

Write-Host "🚀 Iniciando deployment a Vercel..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que node_modules existe
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# 2. Build del proyecto
Write-Host "🔨 Building proyecto..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build. Abortando deployment." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build exitoso!" -ForegroundColor Green
Write-Host ""

# 3. Verificar si Vercel CLI está instalado
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-Not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI no está instalado." -ForegroundColor Yellow
    Write-Host "Instalando Vercel CLI globalmente..." -ForegroundColor Yellow
    npm install -g vercel
}

# 4. Deploy
Write-Host "🚀 Desplegando a Vercel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Opciones:" -ForegroundColor White
Write-Host "1) Deploy a Preview (staging)" -ForegroundColor White
Write-Host "2) Deploy a Production" -ForegroundColor White
Write-Host ""

$option = Read-Host "Selecciona una opción (1 o 2)"

switch ($option) {
    "1" {
        Write-Host "📤 Desplegando a Preview..." -ForegroundColor Cyan
        vercel
    }
    "2" {
        Write-Host "📤 Desplegando a Production..." -ForegroundColor Cyan
        vercel --prod
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Deployment completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Recuerda configurar las variables de entorno en Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "   - SUPABASE_URL" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor White
