# 🚀 Guía de Deployment en Vercel

## ✅ Pre-requisitos Completados

- ✅ Build exitoso (`npm run build`)
- ✅ Archivos generados en `/dist`
- ✅ API routes en `/api` (formato Vercel)
- ✅ Configuración en `vercel.json`

## 📋 Pasos para Desplegar

### Opción 1: Deployment desde Git (RECOMENDADO)

#### 1. Subir código a GitHub/GitLab/Bitbucket

```bash
# Si aún no tienes repositorio
git init
git add .
git commit -m "feat: Versión lista para deployment con mejoras UI y retry logic"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

#### 2. Conectar con Vercel

1. Ir a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Importar tu repositorio de Git
4. Vercel detectará automáticamente:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

#### 3. Configurar Variables de Entorno

En el dashboard de Vercel, ir a **Settings → Environment Variables** y agregar:

```
SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
VITE_SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

⚠️ **IMPORTANTE:** 
- Las variables con prefijo `VITE_` son accesibles en el frontend
- Las variables sin prefijo solo están disponibles en las API routes (backend)

#### 4. Deploy

Click en **"Deploy"** y esperar ~2 minutos.

### Opción 2: Deployment con Vercel CLI

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login

```bash
vercel login
```

#### 3. Deploy

```bash
# Deploy a preview (staging)
vercel

# Deploy a producción
vercel --prod
```

#### 4. Configurar variables de entorno

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Luego redeploy:
```bash
vercel --prod
```

## 📁 Estructura del Proyecto para Vercel

```
proyecto/
├── api/                          ← Vercel Serverless Functions
│   ├── create_population.js
│   ├── sampling_proxy.js
│   ├── get_audit_results.js
│   ├── get_validation_data.js
│   ├── update_mapping.js
│   ├── update_risk_batch.js
│   └── validate_population.js
├── dist/                         ← Build output (generado)
│   ├── index.html
│   ├── assets/
│   └── ...
├── components/                   ← Source code
├── services/
├── vercel.json                   ← Configuración de Vercel
├── vite.config.ts
└── package.json
```

## ⚙️ Configuración Actual (vercel.json)

```json
{
    "rewrites": [
        {
            "source": "/((?!api/.*).*)",
            "destination": "/index.html"
        }
    ]
}
```

Esto asegura que:
- Rutas `/api/*` → Serverless Functions
- Todas las demás rutas → SPA (index.html)

## 🔍 Verificación Post-Deployment

### 1. Verificar que el sitio carga

```
https://tu-proyecto.vercel.app
```

### 2. Verificar API endpoints

```bash
# Test create_population
curl -X POST https://tu-proyecto.vercel.app/api/create_population \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test","audit_name":"test","area":"GENERAL","status":"pendiente_validacion","upload_timestamp":"2024-01-01T00:00:00Z","total_rows":10,"total_monetary_value":1000,"descriptive_stats":{},"column_mapping":{},"user_id":"test-user"}'
```

### 3. Verificar variables de entorno

En Vercel Dashboard → Settings → Environment Variables, confirmar que todas estén configuradas.

### 4. Revisar logs

En Vercel Dashboard → Deployments → [tu deployment] → Functions, revisar logs de las funciones serverless.

## 🐛 Troubleshooting

### Error: "Function Timeout"

**Causa:** Función tarda más de 10 segundos (límite en plan Hobby)

**Solución:**
1. Upgrade a plan Pro (timeout de 60s)
2. O optimizar la función para que termine en <10s

### Error: "Missing Environment Variables"

**Causa:** Variables de entorno no configuradas

**Solución:**
1. Ir a Settings → Environment Variables
2. Agregar todas las variables necesarias
3. Redeploy el proyecto

### Error: "Module not found"

**Causa:** Dependencia faltante en package.json

**Solución:**
```bash
npm install
npm run build
git add package.json package-lock.json
git commit -m "fix: Add missing dependencies"
git push
```

### Error: "API Route not found"

**Causa:** Ruta incorrecta o archivo no exporta handler

**Solución:**
Verificar que cada archivo en `/api` tenga:
```javascript
export default async function handler(req, res) {
    // ...
}
```

## 📊 Límites de Vercel (Plan Hobby - Gratis)

| Recurso | Límite |
|---------|--------|
| Bandwidth | 100 GB/mes |
| Serverless Function Execution | 100 GB-Hrs/mes |
| Function Timeout | 10 segundos |
| Function Size | 50 MB |
| Deployments | Ilimitados |
| Team Members | 1 |

## 🎯 Funcionalidades que Funcionarán

### ✅ Funcionando
- Login/Registro de usuarios
- Carga de poblaciones (con retry logic)
- Análisis de riesgo forense
- Generación de muestras (todos los métodos)
- Visualización de resultados
- Exportación a PDF
- Vista jerárquica en No Estadístico
- Gráficos interactivos
- UI mejorada con animaciones

### ⚠️ Limitaciones Conocidas
- **Guardado de muestras:** Puede fallar si no está configurado correctamente
- **Cold starts:** Primera llamada puede tardar 30-60s
- **Timeout:** Funciones limitadas a 10s en plan gratuito

## 🔐 Seguridad

### Variables Sensibles
- ✅ `SUPABASE_SERVICE_ROLE_KEY` solo en backend (API routes)
- ✅ `VITE_SUPABASE_ANON_KEY` en frontend (seguro, tiene RLS)
- ✅ Nunca commitear `.env` al repositorio

### CORS
Las API routes ya tienen headers CORS configurados:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
```

## 📝 Checklist Pre-Deployment

- [x] Build exitoso (`npm run build`)
- [x] TypeScript sin errores
- [x] API routes en formato Vercel
- [x] vercel.json configurado
- [ ] Variables de entorno preparadas
- [ ] Repositorio Git actualizado
- [ ] Cuenta de Vercel creada

## 🚀 Comando Rápido (si ya tienes todo configurado)

```bash
# Build local
npm run build

# Deploy a Vercel
vercel --prod
```

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en Vercel Dashboard
2. Verificar variables de entorno
3. Confirmar que API routes están desplegadas
4. Revisar console del navegador (F12)

---

**Fecha:** 2026-01-21
**Versión:** Lista para deployment
**Estado:** ✅ Build exitoso, listo para subir
