# ✅ SOLUCIÓN: Error "Failed to fetch" - Problema de Rutas de API

## 🎯 CAUSA RAÍZ IDENTIFICADA

El proyecto tiene **configuración mixta** de Vercel y Netlify:

### ❌ PROBLEMA:
```typescript
// Frontend llama a rutas de VERCEL:
fetch('/api/create_population', ...)
fetch('/api/sampling_proxy?action=sync_chunk', ...)
```

### ✅ REALIDAD:
- Proyecto desplegado en **NETLIFY**
- Funciones están en: `netlify/functions/`
- Rutas correctas: `/.netlify/functions/nombre_funcion`

## 📁 ESTRUCTURA ACTUAL

```
Proyecto/
├── api/                          ← Funciones de VERCEL (no funcionan en Netlify)
│   ├── create_population.js
│   ├── sampling_proxy.js
│   └── ...
├── netlify/functions/            ← Funciones de NETLIFY (las correctas)
│   ├── create_population.ts
│   ├── insert_batch.ts
│   ├── save_sample.ts
│   └── get_validation_data.ts
├── vercel.json                   ← Config de Vercel
└── netlify.toml                  ← Config de Netlify
```

## 🔧 SOLUCIONES

### OPCIÓN 1: Usar Netlify Functions (RECOMENDADO)

Modificar `DataUploadFlow.tsx` para usar las rutas correctas de Netlify:

```typescript
// ANTES (Vercel):
const popRes = await fetch('/api/create_population', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(popPayload)
});

// DESPUÉS (Netlify):
const popRes = await fetch('/.netlify/functions/create_population', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(popPayload)
});
```

Y para el batch upload:

```typescript
// ANTES (Vercel):
const res = await fetch('/api/sampling_proxy?action=sync_chunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: batch })
});

// DESPUÉS (Netlify):
const res = await fetch('/.netlify/functions/insert_batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: batch })
});
```

### OPCIÓN 2: Agregar Redirects en netlify.toml

Agregar reglas de redirect para que `/api/*` apunte a `/.netlify/functions/*`:

```toml
[[redirects]]
  from = "/api/create_population"
  to = "/.netlify/functions/create_population"
  status = 200

[[redirects]]
  from = "/api/sampling_proxy"
  to = "/.netlify/functions/insert_batch"
  status = 200
```

### OPCIÓN 3: Migrar a Vercel

Si prefieres usar Vercel, desplegar el proyecto en Vercel en lugar de Netlify.

## 🚀 IMPLEMENTACIÓN RECOMENDADA

### Paso 1: Verificar funciones de Netlify

Revisar que `netlify/functions/create_population.ts` tenga la misma funcionalidad que `api/create_population.js`:

```bash
# Listar funciones disponibles
ls -la netlify/functions/
```

### Paso 2: Actualizar DataUploadFlow.tsx

Cambiar las rutas de API de Vercel a Netlify.

### Paso 3: Verificar que insert_batch.ts maneje el batching

La función `insert_batch.ts` debe manejar la inserción de lotes de datos.

### Paso 4: Probar localmente

```bash
# Instalar Netlify CLI si no lo tienes
npm install -g netlify-cli

# Ejecutar en modo desarrollo
netlify dev

# Esto levantará el servidor en http://localhost:8888
# Las funciones estarán en http://localhost:8888/.netlify/functions/
```

### Paso 5: Probar la carga

1. Abrir http://localhost:8888
2. Intentar cargar una población
3. Verificar en Console que las peticiones van a `/.netlify/functions/...`

## 📝 CAMBIOS NECESARIOS EN DataUploadFlow.tsx

### Ubicación 1: Crear población (línea ~150)

```typescript
// CAMBIAR ESTA LÍNEA:
const popRes = await fetch('/api/create_population', {

// POR ESTA:
const popRes = await fetch('/.netlify/functions/create_population', {
```

### Ubicación 2: Subir lotes (línea ~220)

```typescript
// CAMBIAR ESTA LÍNEA:
const res = await fetch('/api/sampling_proxy?action=sync_chunk', {

// POR ESTA:
const res = await fetch('/.netlify/functions/insert_batch', {
```

### Ubicación 3: Botón de prueba de conexión (línea ~340)

```typescript
// CAMBIAR ESTA LÍNEA:
const url = `${window.location.origin}/supaproxy/auth/v1/health`;

// POR ESTA (para probar función de Netlify):
const url = `${window.location.origin}/.netlify/functions/create_population`;
```

## ⚠️ IMPORTANTE

### Verificar que insert_batch.ts acepte el formato correcto

La función debe recibir:
```typescript
{
  rows: Array<{
    population_id: string,
    unique_id_col: string,
    monetary_value_col: number,
    category_col: string | null,
    subcategory_col: string | null,
    raw_json: object
  }>
}
```

### Variables de entorno

Asegurarse de que Netlify tenga configuradas:
```
SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
VITE_SUPABASE_URL=https://lodeqleukaoshzarebxu.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## 🎯 RESUMEN

**CAUSA:** Frontend usa rutas de Vercel (`/api/*`) pero proyecto está en Netlify (`/.netlify/functions/*`)

**SOLUCIÓN:** Cambiar 2 líneas en `DataUploadFlow.tsx` para usar rutas de Netlify

**IMPACTO:** Mínimo - solo cambiar URLs de fetch

**TIEMPO:** 5 minutos

---

**Fecha:** 2026-01-21
**Estado:** Solución identificada, pendiente implementación
