# Perfilador Express de Orientación Comercial para Crédito Automotriz

despliegue en prod: https://main.d2t2etx0403nnk.amplifyapp.com/paso-1

Herramienta interna para asesores de piso en agencias y lotes de autos en México. Permite perfilar rápidamente a un cliente para orientar la gestión comercial de un crédito automotriz. **No aprueba créditos — es una guía comercial.**

## Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 3
- **Routing**: React Router v7
- **Backend/Proxy**: Express (`server/index.cjs`)
- **ORM**: Prisma (PostgreSQL en prod, SQLite opcional en dev)
- **Deploy**: AWS Amplify + Lambda (`server/lambda.cjs`) via `serverless-http`

## Desarrollo local

```bash
# Instalar dependencias (también ejecuta prisma generate vía postinstall)
npm install

# Crear archivo de variables de entorno local
cp .env.local.example .env.local   # Agrega tu DEEPSEEK_API_KEY

# Sincronizar la base de datos SQLite de desarrollo
npm run db:setup

# Iniciar frontend + proxy en paralelo
npm run dev:full

# O por separado:
npm run dev      # Vite en :5173
npm run server   # Proxy Express en :3001
```

La variable `VITE_API_URL` no se necesita en desarrollo — Vite redirige `/api` a `localhost:3001` automáticamente.

## Variables de entorno

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `DEEPSEEK_API_KEY` | `.env.local` / Lambda env | API key de DeepSeek (`sk-...`) |
| `DATABASE_URL` | `.env.local` / Lambda env | Cadena de conexión PostgreSQL o SQLite |
| `FRONTEND_ORIGIN` | Lambda env | URL de Amplify para CORS (`https://main.xxxx.amplifyapp.com`) |
| `VITE_API_URL` | Amplify env vars | URL base del API Gateway en producción (sin `/` final) |

### DATABASE_URL según entorno

```bash
# SQLite (dev local — usa schema.dev.prisma)
DATABASE_URL="file:./prisma/dev.db"

# Aurora Serverless v2 (producción — usa schema.prisma)
DATABASE_URL="postgresql://user:pass@cluster.us-east-1.rds.amazonaws.com:5432/perfilador_prod"
```

## Flujo de la aplicación

```
Paso 1 avanza → POST /api/iniciar-sesion ──────────────────────────────────┐
Paso 2 avanza → PATCH /api/sesion/:sesionId ───────────────────────────── SesionWizard (borrador)
Paso 3 analiza → PATCH /api/sesion/:sesionId ──────────────────────────── pasoActual: 1→2→3
       │
       └─ promptBuilder → Proxy /api/analyze → LLM → responseParser → ResultadoExpress
                                                                              │
                                                           POST /api/guardar-sesion (con sesionId)
                                                                              │
                                                   SesionWizard finalizada + PerfilCompleto | InteraccionAnonima
                                                                              │
                                                                    (si Banco o Financiera)
                                                                    Step5 mini-wizard (3 sub-pasos)
                                                                              │
                                                           POST /api/guardar-contacto (sub-paso 1)
                                                           PUT  /api/guardar-perfil/:sesionId (sub-paso 3)
```

### Pasos del wizard

| Paso | Archivo | Campos capturados |
|------|---------|-------------------|
| 1 — Datos del cliente | `Step1Cliente.jsx` | Ocupación, antigüedad, ingreso, comprobación, tipo de domicilio |
| 2 — Perfil financiero | `Step2PerfilFinanciero.jsx` | Historial (referencial), deudas, renta/hipoteca, dependientes |
| 3 — Auto y operación | `Step3AutoOperacion.jsx` | Precio, año, tipo, enganche (≥20%), mensualidad deseada, plazo |
| 4 — Resultado | `Step4ResultadoExpress.jsx` | Resultado del análisis del LLM |
| 5 — Datos personales | `Step5DatosPersonales.jsx` | Mini-wizard 3 sub-pasos: Contacto → Identificación → Domicilio |

> **Paso 5** solo aparece cuando `clasificacionRecomendada` es **Banco** o **Financiera**.

### Step 5 — Mini-wizard de datos personales

| Sub-paso | Campos | Guardado |
|----------|--------|---------|
| 1 — Contacto | Nombres, apellidos, teléfono celular | Inmediato al avanzar (`POST /api/guardar-contacto`) |
| 2 — Identificación | Fecha nacimiento, RFC, CURP, género, estado civil, email | Al avanzar al sub-paso 3 |
| 3 — Domicilio | Calle, colonia, municipio, estado, CP, tipo domicilio, tiempo | Al guardar completo (`PUT /api/guardar-perfil/:sesionId`) |

## Clientes históricos

Disponible en `/clientes`. Accesible desde Step 1 y desde el sub-paso 1 del Step 5 mediante el enlace "¿Ya tienes datos de este cliente? Buscar cliente existente →".

- **Búsqueda por teléfono**: `GET /api/clientes?telefono=XXXXXXXXXX`
- **10 más recientes**: `GET /api/clientes/recientes`
- Al seleccionar un cliente, pre-llena los campos del sub-paso 1 automáticamente

## Estrategia de persistencia

### Guardado progresivo (Pasos 1–3)

| Evento | Endpoint | Resultado |
|--------|----------|-----------|
| Paso 1 → avanzar | `POST /api/iniciar-sesion` | Crea `SesionWizard` borrador, devuelve `sesionId` |
| Paso 2 → avanzar | `PATCH /api/sesion/:sesionId` | Merge de datos en `datosWizardJson`, `pasoActual: 2` |
| Paso 3 → analizar | `PATCH /api/sesion/:sesionId` | Merge de datos en `datosWizardJson`, `pasoActual: 3` |

### Finalización (Paso 4 — respuesta del LLM)

```
clasificacionRecomendada = Banco | Financiera  →  guardarCompleto = true
                                                   Actualiza: sesiones_wizard (pasoActual: 4)
                                                   Crea: perfiles_completos + (luego) datos_personales_paso5

clasificacionRecomendada = Subprime            →  guardarCompleto = false
                                                   Actualiza: sesiones_wizard (pasoActual: 4)
                                                   Crea: interacciones_anonimas (sin PII ni cifras exactas)
```

`guardarCompleto` se recalcula siempre en el servidor — nunca desde el cliente.

## Clasificación de canal

El sistema clasifica al cliente en uno de tres canales (sin nombrar instituciones específicas):

| Canal | Riesgo | Perfil típico |
|-------|--------|---------------|
| **Banco** | Bajo | Buen historial, comprobación sólida, carga cómoda, enganche ≥20% |
| **Financiera** | Medio | Historial regular, comprobación parcial, independientes con tensión |
| **Subprime** | Alto | Sin historial, informal, carga apretada, sin comprobación |

## Carga financiera proyectada

```
Carga proyectada = (deudas + renta/hipoteca + mensualidad estimada) / ingreso mensual
```

| Nivel | Rango |
|-------|-------|
| Cómoda | ≤ 35% |
| Justa | 36%–40% |
| Apretada | > 40% |

## Formato de respuesta del LLM

```
Resultado express
Viabilidad inicial: Alta | Media | Baja
Clasificación recomendada: Banco | Financiera | Subprime
Capacidad de pago estimada: Alta | Media | Baja
Nivel de carga financiera proyectada: Cómoda | Justa | Apretada
Por qué: [3–5 líneas]
Recomendaciones accionables:
- [acción 1]
- [acción 2]
Qué debe decir el vendedor al cliente: ["frase"]
Advertencia comercial: [frase o "Ninguna en este momento"]
```

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/WizardLayout.jsx   # Header, footer, barra de progreso
│   └── ui/                       # Button, Card, Select, InputNumber, Alert, ...
├── context/WizardContext.jsx      # Estado global: 16 variables + datosPersonales + navegación
├── hooks/
│   └── usePerfilador.js           # Llamada al proxy LLM, timeout, persistencia post-LLM
├── pages/
│   └── ClientesHistoricos.jsx     # Búsqueda y listado de clientes históricos
├── steps/
│   ├── Step1Cliente.jsx
│   ├── Step2PerfilFinanciero.jsx
│   ├── Step3AutoOperacion.jsx
│   ├── Step4ResultadoExpress.jsx
│   └── Step5DatosPersonales.jsx   # Mini-wizard 3 sub-pasos (Contacto / Identificación / Domicilio)
└── utils/
    ├── promptBuilder.js           # Construye systemPrompt + userMessage
    └── responseParser.js          # Parsea respuesta del LLM a objeto JS

server/
├── index.cjs                      # Express proxy + todos los endpoints API
├── lambda.cjs                     # Handler para AWS Lambda
├── test-api.cjs                   # Suite de integración: verifica persistencia de todos los pasos
└── db/
    └── client.cjs                 # Singleton PrismaClient (global.__prisma, safe for Lambda)

prisma/
├── schema.prisma                  # Schema Prisma PostgreSQL (producción, 4 modelos)
├── schema.dev.prisma              # Schema Prisma SQLite (desarrollo local)
└── dev.db                         # Base de datos SQLite local (git-ignored)

docs/
├── 01-funcional.md                # Especificación funcional completa
├── 02-tecnico.md                  # Arquitectura y tipos de variables
├── 03-prompts-claude.md           # Prompt template original
├── upgrade_1/
│   ├── upgrades_1.md              # Requerimientos upgrade 1 (aplicado 2026-03-24)
│   └── Politicas_entidades.pdf    # Políticas de referencia de entidades financieras
└── upgrade_2/
    └── db_design.md               # Diseño de datos upgrade 2 (aplicado 2026-03-25)
```

## Base de datos — Modelos Prisma

| Modelo | Tabla | Cuándo se crea |
|--------|-------|----------------|
| `SesionWizard` | `sesiones_wizard` | Al avanzar del Paso 1 (borrador); se finaliza en Paso 4 |
| `PerfilCompleto` | `perfiles_completos` | Solo Banco/Financiera, al recibir resultado del LLM |
| `DatosPersonalesPaso5` | `datos_personales_paso5` | Al completar sub-paso 1 del Step 5 (UPSERT) |
| `InteraccionAnonima` | `interacciones_anonimas` | Solo Subprime, al recibir resultado del LLM |

`PerfilCompleto` incluye el campo `resultadoLlmJson (Text, nullable)` que almacena el objeto completo de la respuesta del LLM como JSON, además de los campos individuales (`porQue`, `recomendacionesAccionables`, `fraseVendedor`, etc.).

### Schemas

- `prisma/schema.prisma` — PostgreSQL (producción)
- `prisma/schema.dev.prisma` — SQLite (desarrollo local)

```bash
# Regenerar client + sincronizar DB local tras cambios de schema
npm run db:setup

# O por separado:
npm run db:generate   # regenerar PrismaClient (SQLite)
npm run db:push       # push schema → SQLite

# Ver datos en Prisma Studio (local)
npm run db:studio

# Producción (Aurora)
npm run db:generate:prod   # regenerar PrismaClient (PostgreSQL)
npm run db:push:prod       # push schema → Aurora (dev/staging)
npm run db:migrate:prod    # aplicar migraciones en Aurora (producción)
npm run db:studio:prod     # Prisma Studio contra Aurora
```

## Reglas de negocio importantes

- El bloque **"Qué decirle al cliente"** tiene color dinámico: verde (Alta), amarillo (Media), rojo (Baja).
- El **enganche mínimo** validado en Step 3 es el 20% del precio del auto.
- El **historial crediticio** es dato referencial — no es el factor decisivo único.
- Nunca se mencionan bancos, financieras ni SOFOM específicas en el output.
- Los datos del **Step 5 están sujetos a la LFPDPPP** — incluir aviso de privacidad antes del formulario.

## Migraciones de base de datos

Las migraciones SQL para producción (Aurora) viven en `prisma/migrations/`. Aplicarlas con:

```bash
npm run db:migrate:prod
```

| Migración | Descripción |
|-----------|-------------|
| `001_fix_nullable_result_columns` | Elimina restricción NOT NULL en `clasificacion_recomendada`, `viabilidad_inicial` y `carga_financiera` — estas columnas son null hasta que el LLM responde en Step 4 |
| `002_add_resultado_llm_json` | Agrega columna `resultado_llm_json TEXT` nullable en `perfiles_completos` para almacenar el objeto completo de la respuesta del LLM como JSON |

## Despliegue

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para la guía completa de AWS Amplify + Lambda + Aurora.
