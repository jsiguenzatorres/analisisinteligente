# Configuración SERVICE_ROLE_KEY

## Paso 1: Obtener la key de Supabase
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Settings → API
4. En "Project API keys", busca "service_role"
5. Haz clic en "Reveal" y copia la key completa

## Paso 2: Configurar en .env.local
Reemplaza la línea comentada en .env.local:

```
# Descomenta y reemplaza con tu key real:
SUPABASE_SERVICE_ROLE_KEY=tu_key_real_aqui
```

## Paso 3: Reiniciar servidor
```bash
# Detén el servidor (Ctrl+C)
# Luego reinicia:
npm run dev
```

## ¿Por qué es necesario?
- **PopulationManager**: Necesita service_role para listar poblaciones
- **AdminUserManagement**: Necesita service_role para gestionar usuarios
- **API Proxy**: Usa service_role para operaciones administrativas

Sin esta key, obtienes errores 500 en estas funciones.