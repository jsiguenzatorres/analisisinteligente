# 🚀 Deployment Rápido a Vercel

## ✅ Estado Actual
- Build: **EXITOSO** ✅
- Código: **LISTO** ✅
- API Routes: **CONFIGURADAS** ✅

## 🎯 Opción 1: Deployment Automático (MÁS FÁCIL)

### Paso 1: Ejecutar script de deployment

**En Windows (PowerShell):**
```powershell
.\deploy-vercel.ps1
```

**En Mac/Linux:**
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

### Paso 2: Seguir las instrucciones en pantalla

El script te preguntará:
1. ¿Deploy a Preview o Production?
2. Login a Vercel (si es primera vez)
3. Confirmar configuración

### Paso 3: Configurar variables de entorno

Ir a: https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables

Agregar:
```
SUPABASE_URL = https://lodeqleukaoshzarebxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [tu service role key]
VITE_SUPABASE_URL = https://lodeqleukaoshzarebxu.supabase.co
VITE_SUPABASE_ANON_KEY = [tu anon key]
```

### Paso 4: Redeploy

Después de agregar variables:
```bash
vercel --prod
```

---

## 🎯 Opción 2: Deployment Manual

### Paso 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Paso 2: Login

```bash
vercel login
```

### Paso 3: Deploy

```bash
# Preview
vercel

# Production
vercel --prod
```

### Paso 4: Configurar variables (igual que Opción 1)

---

## 🎯 Opción 3: Deployment desde GitHub (RECOMENDADO)

### Paso 1: Subir a GitHub

```bash
git init
git add .
git commit -m "feat: Versión lista para deployment"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ir a https://vercel.com
2. Click "Add New Project"
3. Importar tu repositorio
4. Vercel detectará automáticamente la configuración
5. Click "Deploy"

### Paso 3: Configurar variables de entorno

En Vercel Dashboard → Settings → Environment Variables

### Paso 4: Listo!

Cada push a `main` desplegará automáticamente.

---

## 📋 Variables de Entorno Necesarias

```env
# Backend (API Routes)
SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Frontend (Vite)
VITE_SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

⚠️ **IMPORTANTE:** Nunca commitear el archivo `.env` al repositorio!

---

## 🔍 Verificación Post-Deployment

### 1. Verificar que el sitio carga
```
https://tu-proyecto.vercel.app
```

### 2. Probar login
- Ir al sitio
- Intentar hacer login
- Verificar que funcione

### 3. Probar carga de población
- Subir un archivo Excel
- Verificar que la pantalla de carga se vea bien
- Confirmar que los logs aparezcan con colores

### 4. Revisar logs en Vercel
- Ir a Vercel Dashboard
- Deployments → [tu deployment] → Functions
- Revisar logs de las API routes

---

## 🐛 Problemas Comunes

### "Function Timeout"
**Solución:** Upgrade a plan Pro o optimizar función

### "Missing Environment Variables"
**Solución:** Agregar variables en Vercel Dashboard y redeploy

### "API Route not found"
**Solución:** Verificar que archivos en `/api` estén correctos

### "Build Failed"
**Solución:** Ejecutar `npm run build` localmente y corregir errores

---

## 📊 Lo que Funcionará

### ✅ Funcionalidades Completas
- Login/Registro
- Carga de poblaciones (con retry logic y UI mejorada)
- Análisis de riesgo forense (9 modelos)
- Generación de muestras (todos los métodos)
- Vista jerárquica en No Estadístico
- Gráficos interactivos
- Exportación a PDF
- Observaciones y comentarios

### ⚠️ Limitaciones
- Guardado de muestras puede fallar (pendiente de configurar)
- Cold starts en primera llamada (30-60s)
- Timeout de 10s en funciones (plan gratuito)

---

## 🎉 Resultado Esperado

Después del deployment tendrás:

1. **URL pública:** `https://tu-proyecto.vercel.app`
2. **Auto-deploy:** Cada push a GitHub despliega automáticamente
3. **SSL gratis:** HTTPS configurado automáticamente
4. **CDN global:** Sitio rápido en todo el mundo
5. **Logs en tiempo real:** Debugging fácil

---

## 📞 Siguiente Paso

Una vez desplegado, comparte la URL para probar:
```
https://tu-proyecto.vercel.app
```

Y podemos continuar con:
1. Configurar guardado de muestras
2. Resolver problema de vista jerárquica (risk_factors)
3. Optimizaciones adicionales

---

**Fecha:** 2026-01-21
**Build:** ✅ Exitoso
**Estado:** 🚀 Listo para deployment
