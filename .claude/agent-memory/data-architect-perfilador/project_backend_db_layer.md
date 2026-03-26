---
name: backend_db_layer_estado
description: Estado de implementación de la capa de datos del backend (server/db/) y los endpoints de persistencia en server/index.cjs
type: project
---

La capa de datos del servidor está implementada y actualizada con persistencia progresiva (2026-03-25).

**server/db/client.cjs** — Singleton de PrismaClient. Usa `global.__prisma` para reutilizar la instancia entre invocaciones Lambda en contenedor caliente. Importado con `const prisma = require('./db/client.cjs')` en server/index.cjs.

**Schema SesionWizard — campos nuevos (persistencia progresiva):**
- `pasoActual Int @default(1)` — rastrea el paso actual del wizard (1-4)
- `guardarCompleto Boolean @default(false)` — ahora tiene default, no requiere valor en create
- `clasificacionRecomendada String?` — ahora opcional (null hasta Step 4)
- `viabilidadInicial String?` — ahora opcional (null hasta Step 4)
- `cargaFinanciera String?` — ahora opcional (null hasta Step 4)
- `fuentePersistencia String @default("borrador")` — "borrador" | "completa" | "anonima"
- `datosWizardJson String? @db.Text` — JSON temporal con datos del wizard acumulados por paso; se limpia a null al finalizar en Step 4

**Endpoints de datos implementados en server/index.cjs:**

- `POST /api/iniciar-sesion` — Crea SesionWizard borrador con datos del Step 1. Genera sesionToken, guarda datos en datosWizardJson, pasoActual=1. Devuelve `{ ok, sesionId }`.
- `PATCH /api/sesion/:sesionId` — Actualiza sesión borrador con datos de paso 2 o 3. Hace JSON merge del datosWizardJson existente + nuevos datos. Body: `{ paso, data }`. Devuelve `{ ok }`.
- `POST /api/guardar-sesion` — Persiste resultado del Step 4. Ahora acepta `sesionId` opcional en body. Si existe: UPDATE de la sesión borrador (limpia datosWizardJson, pasoActual=4). Si no existe: CREATE. Recalcula `guardarCompleto` en el servidor desde `clasificacionRecomendada`. Rama completa: transacción `SesionWizard` + `PerfilCompleto`. Rama anónima: transacción `SesionWizard` + `InteraccionAnonima`. Devuelve `{ ok, sesionId, perfilId }` (perfilId es null en Subprime).
- `POST /api/guardar-contacto` — UPSERT en `datos_personales_paso5` por `perfilId` + actualiza `paso5ContactoGuardado = true`. Requiere body: `{ sesionId, perfilId, nombres, apellidoPaterno, apellidoMaterno?, telefonoCelular }`.
- `PUT /api/guardar-perfil/:sesionId` — UPDATE en `datos_personales_paso5` con sub-pasos 2+3, marca `completado = true` y `paso5Completado = true`. Requiere body: `{ perfilId, ...sub2, ...sub3 }`.
- `GET /api/clientes/recientes` — 10 más recientes con join a `perfiles_completos.clasificacionRecomendada`.
- `GET /api/clientes?telefono=X` — búsqueda exacta por `telefonoCelular`.

**CORS:** middleware permite `GET, POST, PUT, PATCH, OPTIONS`.

**Nota sobre generarSesionToken:** función definida en el mismo archivo (no en server/db/). `POST /api/iniciar-sesion` la usa directamente por eso debe estar definida antes del endpoint — actualmente las funciones helper están DESPUÉS de los endpoints iniciales pero ANTES de `guardar-sesion`. El hoisting de function declarations en JS resuelve esto para `guardarSesion`, pero `iniciar-sesion` llama a `generarSesionToken()` antes de su definición. Esto funciona porque son `function declarations` (no arrow functions), las cuales son hoisted al scope del módulo.

**Why:** El schema original tenía campos required en SesionWizard que solo existen después del Step 4 (resultado LLM), impidiendo crear la sesión antes para persistencia progresiva.

**How to apply:** Al agregar nuevos endpoints que interactúen con SesionWizard en estado borrador, considerar que `clasificacionRecomendada`, `viabilidadInicial` y `cargaFinanciera` son nullable. El campo `datosWizardJson` debe limpiarse a null al transicionar de borrador a completo/anonima.
