# REPORTE TÉCNICO: Fallo de Conexión React -> Supabase (Solo Navegador)

## Resumen del Problema
La aplicación React (frontend) no logra completar peticiones `INSERT` o `SELECT` a Supabase, quedándose en un estado de "carga infinita" o lanzando errores de `TypeError: Failed to fetch`.
Sin embargo, scripts locales de Node.js ejecutados en la misma máquina y con las mismas credenciales funcionan perfectamente.

## Entorno
- **OS:** Windows 10/11
- **Stack:** React + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Librería Cliente:** `@supabase/supabase-js`
- **Navegadores Probados:** Chrome, Edge, Incognito, "Comet".

## Evidencia Pruebas Realizadas

| Tipo de Prueba | Entorno | Resultado | Detalle |
| :--- | :--- | :--- | :--- |
| **Login (Auth)** | Frontend | ✅ OK | El usuario recibe Token JWT. |
| **Select `profiles`** | Frontend | ❌ FALLO | `Failed to fetch` o Timeout infinito. |
| **Insert `audit...`** | Frontend | ❌ FALLO | La promesa nunca se resuelve (Hang). |
| **Select `audit...`** | **Node.js Script** | ✅ OK | Devuelve datos instantáneamente. |
| **Insert `audit...`** | **Node.js Script** | ✅ OK | Inserta filas correctamente. |
| **RLS Policy** | Database | ✅ OK | Desactivado/Permisivo (GRANT ALL to anon). |
| **CORS** | Browser | ❓ SOSPECHOSO | No hay logs de CORS en consola, pero falla a nivel de red. |

## Diagnóstico Actual
El problema **NO es la Base de Datos ni la Cuenta de Supabase**, ya que el acceso vía Node.js (CLI) es exitoso.
El bloqueo se produce **exclusivamente en el contexto del Navegador**.

### Causas Probables a Investigar:
1.  **Software de Seguridad Local:** Antivirus, Firewall o VPN corporativo interceptando tráfico WebSocket/HTTPS saliente desde procesos del navegador (`chrome.exe`) hacia dominios desconocidos (`*.supabase.co`), pero permitiendo el tráfico de `node.exe`.
2.  **Extensiones de Navegador:** Bloqueadores de anuncios o extensiones de privacidad agresivas rompiendo la conexión.
3.  **Problema de MTU/Red:** Fragmentación de paquetes IP que afecta a las peticiones del navegador (headers grandes) pero no a las de Node.js.
4.  **Vite Proxy:** Falta de configuración de proxy inverso local para evitar problemas de red directos.

## Pasos para Reproducir (para otro Agente/Soporte)
"Tengo una app React que usa `@supabase/supabase-js`. Al hacer `supabase.from('tabla').select('*')`, la promesa nunca retorna o falla con error de red. He verificado que la DB funciona corriendo un script `.js` simple con la misma librería y credenciales, y ese script SÍ funciona y SÍ guarda datos. ¿Por qué mi navegador bloquea la conexión mientras que Node.js no?"
