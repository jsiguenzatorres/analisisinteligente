# 🌐 Guía de Despliegue: Edge Function (Opción 2 - Fallback de Seguridad)

## 📋 Resumen

El sistema de guardado de muestras usa una **estrategia híbrida**:

1. **Opción 1 (Principal)**: Guardado directo - Rápido y confiable ✅
2. **Opción 2 (Fallback)**: Edge Function - Seguro y server-side 🔒

La Edge Function es **OPCIONAL** pero recomendada para mayor seguridad.

## 🚀 Pasos para Desplegar Edge Function

### Prerequisitos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Verificar instalación
supabase --version
```

### 1. Inicializar Supabase (si no está inicializado)

```bash
# En la raíz del proyecto
supabase init
```

### 2. Crear la Función

```bash
# Crear directorio de funciones
mkdir -p supabase/functions/save_sample

# Copiar el código
cp netlify/functions/save_sample.ts supabase/functions/save_sample/index.ts
```

### 3. Configurar Variables de Entorno

Crear archivo `supabase/functions/.env`:

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 4. Desplegar la Función

```bash
# Login a Supabase
supabase login

# Link al proyecto
supabase link --project-ref tu-project-ref

# Desplegar función
supabase functions deploy save_sample
```

### 5. Configurar Secrets en Supabase

```bash
# Configurar URL
supabase secrets set SUPABASE_URL=https://tu-proyecto.supabase.co

# Configurar Service Role Key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 6. Verificar Despliegue

```bash
# Listar funciones desplegadas
supabase functions list

# Ver logs
supabase functions logs save_sample
```

## 🧪 Probar la Función

### Desde la línea de comandos:

```bash
curl -X POST \
  https://tu-proyecto.supabase.co/functions/v1/save_sample \
  -H "Authorization: Bearer tu_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "population_id": "test-id",
    "method": "mus",
    "sample_data": {
      "population_id": "test-id",
      "method": "mus",
      "objective": "Test",
      "seed": 12345,
      "sample_size": 50,
      "params_snapshot": {},
      "results_snapshot": {
        "sampleSize": 50,
        "sample": [],
        "totalErrorProjection": 0,
        "upperErrorLimit": 0,
        "findings": [],
        "methodologyNotes": []
      },
      "is_final": true,
      "is_current": true
    },
    "is_final": true
  }'
```

### Desde el código:

```typescript
import { supabase } from './supabaseClient';

const { data, error } = await supabase.functions.invoke('save_sample', {
  body: {
    population_id: 'test-id',
    method: 'mus',
    sample_data: { /* ... */ },
    is_final: true
  }
});
```

## 📊 Monitoreo

### Ver logs en tiempo real:

```bash
supabase functions logs save_sample --follow
```

### Dashboard de Supabase:

1. Ir a: https://app.supabase.com/project/tu-proyecto/functions
2. Seleccionar `save_sample`
3. Ver métricas y logs

## 🔧 Troubleshooting

### Error: "Function not found"

```bash
# Verificar que está desplegada
supabase functions list

# Re-desplegar
supabase functions deploy save_sample
```

### Error: "Missing environment variables"

```bash
# Verificar secrets
supabase secrets list

# Configurar de nuevo
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Error: "Permission denied"

- Verificar que el service role key es correcto
- Verificar RLS policies en Supabase Dashboard

## 🎯 Comportamiento del Sistema

### Con Edge Function Desplegada:

```
1. Intenta guardado directo (rápido)
   ↓ Si falla
2. Intenta Edge Function (seguro)
   ↓ Si falla
3. Muestra error al usuario
```

### Sin Edge Function Desplegada:

```
1. Intenta guardado directo (rápido)
   ↓ Si falla con retry
2. Muestra error al usuario
```

## 📈 Ventajas de Desplegar Edge Function

✅ **Seguridad**: Service role key no expuesta en cliente
✅ **Validaciones**: Lógica server-side adicional
✅ **Rate Limiting**: Control de uso desde servidor
✅ **Logging**: Logs centralizados en Supabase
✅ **Fallback**: Redundancia en caso de problemas

## ⚠️ Consideraciones

- **Costo**: Edge Functions tienen límite de invocaciones gratuitas
- **Latencia**: Agrega ~200-500ms vs guardado directo
- **Mantenimiento**: Requiere actualización cuando cambien estructuras

## 🔄 Actualizar la Función

```bash
# Editar el código
nano supabase/functions/save_sample/index.ts

# Re-desplegar
supabase functions deploy save_sample

# Verificar
supabase functions logs save_sample
```

## 📝 Notas Importantes

1. **El sistema funciona SIN la Edge Function** usando guardado directo
2. La Edge Function es un **fallback de seguridad opcional**
3. Se recomienda desplegar para producción
4. Para desarrollo local, el guardado directo es suficiente

## 🆘 Soporte

Si tienes problemas:

1. Revisar logs: `supabase functions logs save_sample`
2. Verificar secrets: `supabase secrets list`
3. Probar guardado directo primero
4. Contactar soporte de Supabase si persiste

---

**Estado Actual**: Edge Function NO desplegada (sistema usa guardado directo)
**Recomendación**: Desplegar para producción, opcional para desarrollo
