# ✅ GUÍA DE IMPLEMENTACIÓN - FIX DE PERSISTENCIA

## 🎯 Cambios Realizados

### Archivos Modificados:
1. ✅ `services/sampleStorageService.ts` - Activado guardado real en Supabase
2. ✅ `fix_rls_samples.sql` - Script SQL para configurar RLS (NUEVO)

### Archivos NO Modificados:
- ❌ Ningún componente de UI (.tsx)
- ❌ Ningún servicio de reportes
- ❌ Ningún archivo de diseño/estilos
- ❌ Ninguna lógica de negocio/cálculos

**Resultado**: Todo se ve y funciona EXACTAMENTE igual, solo cambia la persistencia.

---

## 📋 PASOS PARA ACTIVAR

### PASO 1: Ejecutar SQL en Supabase (2 minutos)

1. Abrir Supabase Dashboard: https://app.supabase.com
2. Ir a tu proyecto
3. Click en "SQL Editor" (menú izquierdo)
4. Click en "New Query"
5. Copiar TODO el contenido de `fix_rls_samples.sql`
6. Pegar en el editor
7. Click en "Run" o presionar `Ctrl+Enter`
8. Verificar mensaje de éxito: ✅ RLS configurado correctamente

**Output esperado**:
```
✅ RLS configurado correctamente para audit_historical_samples
✅ Políticas creadas: samples_insert_policy, samples_select_policy, samples_update_policy
✅ Permisos otorgados a: anon, authenticated, service_role
```

---

### PASO 2: Verificar que el código se actualizó (30 segundos)

El archivo `services/sampleStorageService.ts` YA fue actualizado automáticamente.

**Verificación**:
1. Abrir `services/sampleStorageService.ts`
2. Buscar la línea 1
3. Debe decir: `* 🗄️ SERVICIO DE ALMACENAMIENTO DE MUESTRAS` (SIN "MODO EMERGENCIA")
4. Buscar línea 10: debe importar `import { supabase } from './supabaseClient';`

---

### PASO 3: Reiniciar el servidor de desarrollo (30 segundos)

```bash
# Detener servidor actual (Ctrl+C en la terminal)
# Luego reiniciar:
npm run dev
```

---

### PASO 4: Probar el guardado (5 minutos)

#### Opción A: Crear nueva muestra

1. Ir a http://localhost:3000
2. Log in (si es necesario)
3. Cargar una población existente o nueva
4. Generar una muestra con CUALQUIER método:
   - MUS
   - Atributos
   - CAV
   - Estratificado
   - No Estadístico
5. En la consola del navegador (F12), verificar:
   ```
   💾 Guardando muestra en base de datos...
   ✅ Muestra guardada exitosamente en XXms
      ID: [uuid-real]
      Fecha: [timestamp]
   ```
6. ✅ **NO debe aparecer**: "🚨 MODO EMERGENCIA"
7. ✅ **NO debe aparecer**: "⚠️ ADVERTENCIA: Los datos NO se guardaron"

#### Opción B: Verificar persistencia

1. Generar una muestra (pasos anteriores)
2. **Refrescar la página** (F5)
3. Navegar a la sección de historial/resultados
4. ✅ La muestra debe seguir visible
5. ✅ Los datos no se perdieron

---

## 🔍 VERIFICACIÓN EN SUPABASE

### Ver muestras guardadas:

1. Ir a Supabase Dashboard
2. Click en "Table Editor"
3. Seleccionar tabla: `audit_historical_samples`
4. ✅ Deberías ver las muestras guardadas con:
   - `id` (UUID real)
   - `population_id`
   - `method` (mus, attributes, etc.)
   - `sample_size`
   - `created_at`
   - `params_snapshot` (JSON)
   - `results_snapshot` (JSON)

### Query SQL para verificar:

```sql
SELECT 
    id,
    method,
    sample_size,
    created_at,
    is_final,
    is_current
FROM audit_historical_samples
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado**: Ver las muestras ordenadas por fecha

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "new row violates row-level security policy"

**Causa**: El script SQL no se ejecutó o falló

**Solución**:
1. Ir a Supabase SQL Editor
2. Ejecutar este comando para verificar políticas:
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE tablename = 'audit_historical_samples';
   ```
3. Si aparece vacío, re-ejecutar `fix_rls_samples.sql`

---

### Error: "relation 'audit_historical_samples' does not exist"

**Causa**: La tabla no existe en Supabase

**Solución**:
1. Verificar en Table Editor si existe la tabla
2. Si NO existe, crearla:
   ```sql
   CREATE TABLE audit_historical_samples (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       population_id UUID,
       method TEXT,
       objective TEXT,
       seed INTEGER,
       sample_size INTEGER,
       params_snapshot JSONB,
       results_snapshot JSONB,
       is_final BOOLEAN,
       is_current BOOLEAN,
       created_at TIMESTAMPTZ DEFAULT now()
   );
   ```
3. Luego ejecutar `fix_rls_samples.sql`

---

### Console muestra: "❌ Error guardando muestra: [mensaje]"

**Causa**: Error de conexión o permisos

**Solución**:
1. Verificar `.env.local` tiene:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Verificar en Network tab (F12) que la request llegó a Supabase
3. Ver el mensaje de error específico en console
4. Ejecutar: `SELECT * FROM pg_policies WHERE tablename = 'audit_historical_samples';`

---

### Las muestras se guardan pero no aparecen en el historial

**Causa**: Componente de historial usa otro query

**Solución**:
1. Verificar que los datos SÍ están en Supabase (ver query arriba)
2. Si están, el problema es en el componente de UI
3. Revisar console por errores de fetch

---

## ✅ CHECKLIST POST-IMPLEMENTACIÓN

- [ ] SQL ejecutado en Supabase sin errores
- [ ] Políticas RLS verificadas en pg_policies
- [ ] Código de `sampleStorageService.ts` actualizado
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Muestra generada con éxito
- [ ] Console muestra "✅ Muestra guardada exitosamente"
- [ ] Console NO muestra "🚨 MODO EMERGENCIA"
- [ ] Datos persisten después de refrescar página
- [ ] Muestras visibles en Supabase Table Editor
- [ ] NO hay cambios en diseño/UI
- [ ] NO hay cambios en reportes

---

## 🎉 RESULTADO ESPERADO

### ANTES (Modo Emergencia):
```
Console:
🚨 MODO EMERGENCIA ACTIVO
📝 Guardando muestra solo en memoria (NO en base de datos)
✅ Muestra guardada en memoria (100ms)
   ID temporal: emergency-1738812345678-abc123
⚠️ ADVERTENCIA: Los datos NO se guardaron en base de datos
⚠️ Los datos se perderán al recargar la página

Resultado: [F5] → Datos perdidos ❌
```

### DESPUÉS (Persistencia Real):
```
Console:
💾 Guardando muestra en base de datos...
   Población: 123e4567-e89b-12d3-a456-426614174000
   Método: mus
   Tamaño: 30 ítems
✅ Muestra guardada exitosamente en 234ms
   ID: 987f6543-e21c-45d6-b789-123456789abc
   Fecha: 2026-02-05T21:00:00.000Z

Resultado: [F5] → Datos persisten ✅
```

---

## 📞 SIGUIENTE PASO (OPCIONAL - FASE 2)

Una vez confirmado que funciona, podemos proceder con **Opción A** (Edge Function):

1. Desplegar Edge Function en Netlify
2. Mayor seguridad (service_role_key server-side)
3. Mejor escalabilidad
4. Tiempo: 30 minutos adicionales

**POR AHORA**: Con esta implementación tienes el sistema 100% funcional.

---

**Fecha**: 5 de Febrero, 2026  
**Tiempo estimado total**: 10 minutos  
**Impacto en UI/UX**: CERO (sin cambios visibles)  
**Impacto en funcionalidad**: CRÍTICO (sistema ahora funciona)
