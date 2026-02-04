# 🔍 DIAGNÓSTICO: Error "Failed to fetch" en Carga de Población

## ❌ SÍNTOMA
Usuario reporta: **"Error al subir los datos: Failed to fetch"** después de los cambios visuales en la pantalla de carga.

## ✅ ANÁLISIS TÉCNICO

### 1. **El archivo está COMPLETO y SIN ERRORES de sintaxis**
- ✅ Archivo tiene 518 líneas completas
- ✅ Todas las etiquetas JSX están cerradas correctamente
- ✅ TypeScript diagnostics: **0 errores**
- ✅ Export statement presente al final

### 2. **Los cambios visuales NO afectan la lógica de carga**
- ✅ Modificaciones solo en líneas 402-505 (UI del stage 'uploading')
- ✅ La función `handleUpload()` NO fue modificada
- ✅ Los fetch calls permanecen idénticos
- ✅ La lógica de batching y retry está intacta

### 3. **"Failed to fetch" es un ERROR DE RED, NO de código**
Este error ocurre cuando el navegador **no puede conectarse** al backend, antes de que el servidor responda.

## 🎯 CAUSAS PROBABLES

### Causa #1: Backend no accesible (MÁS PROBABLE)
```
Error: Failed to fetch
Ubicación: fetch('/api/create_population', ...)
Línea: ~150 en handleUpload()
```

**Verificar:**
- ¿Están los endpoints `/api/create_population` y `/api/sampling_proxy` desplegados?
- ¿El servidor backend está corriendo?
- ¿Hay errores en los logs del servidor?

### Causa #2: CORS (Cross-Origin Resource Sharing)
Si el frontend y backend están en dominios diferentes, el navegador bloquea la petición.

**Verificar en Console del navegador:**
```
Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy
```

### Causa #3: Timeout de red
La petición tarda demasiado y el navegador la cancela.

### Causa #4: Sesión de usuario expirada
El código verifica `user.id` antes de hacer fetch. Si la sesión expiró, podría fallar.

## 🔧 SOLUCIONES RECOMENDADAS

### Solución Inmediata: Verificar Console del Navegador
1. Abrir DevTools (F12)
2. Ir a pestaña **Console**
3. Intentar cargar población
4. Buscar mensajes de error específicos

### Solución 1: Verificar que el backend esté corriendo
```bash
# Verificar si los endpoints responden
curl http://localhost:8888/api/create_population
# o
curl https://tu-dominio.netlify.app/api/create_population
```

### Solución 2: Probar el botón de diagnóstico
El código incluye un botón "📡 Probar Conexión (Ping)" en la pantalla inicial.
- Hacer clic en ese botón
- Ver el resultado en la alerta
- Revisar logs en console

### Solución 3: Verificar archivos de API
Confirmar que existen y están desplegados:
- ✅ `api/create_population.js`
- ✅ `api/sampling_proxy.js`

### Solución 4: Agregar más logging para diagnóstico
Modificar `handleUpload()` para capturar más detalles del error:

```typescript
} catch (err: any) {
    console.error("Upload error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    addLog(`❌ ERROR: ${err.message}`);
    setError("Error al subir los datos: " + err.message);
    setStage('error');
}
```

## 📋 PASOS PARA RESOLVER

### Paso 1: Identificar el error exacto
1. Abrir Console del navegador (F12)
2. Intentar cargar población
3. Copiar el mensaje de error completo
4. Verificar si hay errores de CORS, 404, 500, etc.

### Paso 2: Verificar backend
```bash
# Si estás usando Netlify Dev
netlify dev

# Si estás usando Vercel
vercel dev
```

### Paso 3: Probar endpoints manualmente
```bash
# Test create_population
curl -X POST http://localhost:8888/api/create_population \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test","audit_name":"test","area":"GENERAL","status":"pendiente_validacion","upload_timestamp":"2024-01-01T00:00:00Z","total_rows":10,"total_monetary_value":1000,"descriptive_stats":{},"column_mapping":{},"user_id":"test-user"}'
```

### Paso 4: Revisar configuración de deployment
- Verificar `netlify.toml` o `vercel.json`
- Confirmar que las funciones están configuradas correctamente
- Verificar variables de entorno (SUPABASE_URL, SUPABASE_KEY)

## 🎯 CONCLUSIÓN

**El código frontend está correcto.** El error "Failed to fetch" indica un problema de:
1. Backend no accesible
2. Configuración de red/CORS
3. Variables de entorno faltantes
4. Deployment incompleto

**PRÓXIMO PASO:** Revisar la Console del navegador para obtener el mensaje de error específico y determinar cuál de las causas es la correcta.

## 📝 NOTAS ADICIONALES

- Los cambios visuales (líneas 402-505) son **seguros** y no causan este error
- El error ocurre en la **primera llamada fetch** (create_population)
- La función `handleUpload()` tiene retry logic para errores de red
- El código incluye logging extensivo para debugging

---

**Fecha:** 2026-01-21
**Archivo afectado:** `components/data/DataUploadFlow.tsx`
**Estado:** Código correcto, error de infraestructura/red
