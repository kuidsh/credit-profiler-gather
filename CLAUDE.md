# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Perfilador Express de Orientación Comercial para Crédito Automotriz** — a web tool for car dealership salespeople in Mexico to quickly assess a customer's financing viability. It is a commercial advisor, NOT a credit approver. All output must be in Spanish with commercial (non-banking) language.

The project is **fully implemented** (upgrade 1 + upgrade 2 + progressive persistence + bug-fix patch applied). Reference material is in [docs/](docs/).

## Key Constraints

- **No real bank/institution names** in output: use only "Banco / Financiera / Subprime"
- **No credit approval language**: never say "se aprueba", "es viable con X banco", or make promises
- **LLM timeout**: 18–25 seconds max; fallback message is implemented in `usePerfilador.js`
- **historialCrediticio** is reference-only — never the sole decision factor
- **Step 5 data is PII** — subject to LFPDPPP (Mexican data protection law); never log or expose unnecessarily

## Architecture

```
Step1 → POST /api/iniciar-sesion ──────────────────────────────────────────┐
Step2 → PATCH /api/sesion/:sesionId ────────────────────────────────────── SesionWizard (borrador)
Step3 → PATCH /api/sesion/:sesionId ────────────────────────────────────── (pasoActual 1→2→3)
Step3 → triggerAnalysis → Prompt Builder → Proxy /api/analyze → LLM API        │
                                                           ↓                    │
                                              Response Parser → ResultadoExpress UI
                                                           ↓
                                        POST /api/guardar-sesion (con sesionId)
                                                           ↓
                              SesionWizard finalizada + PerfilCompleto | InteraccionAnonima
                                                           ↓ (solo Banco | Financiera)
                                                  Step5 mini-wizard (3 sub-steps)
                                                           ↓
                                           POST /api/guardar-contacto (sub-step 1)
                                           PUT  /api/guardar-perfil/:sesionId (sub-step 3)
```

- React + Vite frontend (Tailwind CSS)
- Express proxy server (`server/index.cjs`) handles API key, LLM forwarding, and all data persistence endpoints
- AWS Lambda entry point: `server/lambda.cjs` (deployed via Amplify + serverless-http)
- API URL: dev uses `/api/...` (Vite proxy → localhost:3001), prod uses `VITE_API_URL` env var
- Prisma ORM: PostgreSQL in prod (Aurora Serverless v2), SQLite for local dev (`schema.dev.prisma`)
- Prisma singleton: `server/db/client.cjs` (global pattern, safe for Lambda warm reuse)

## Wizard Steps

1. **Client data** (`Step1Cliente.jsx`): occupation, tenure, income, income verification, domicile type
2. **Financial profile** (`Step2PerfilFinanciero.jsx`): credit history (reference only), monthly debts, rent/mortgage, number of dependents
3. **Vehicle & operation** (`Step3AutoOperacion.jsx`): price, year model, vehicle type, down payment (≥20% required), desired payment, term, flexibility
4. **Results** (`Step4ResultadoExpress.jsx`): structured output from LLM. Shows CTA to Step 5 only when `clasificacionRecomendada` is "Banco" or "Financiera"
5. **Personal data** (`Step5DatosPersonales.jsx`): mini-wizard with 3 internal sub-steps — Contacto → Identificación → Domicilio

## Step 5 — Mini-wizard sub-steps

| Sub-step | Fields | Persistence |
|----------|--------|-------------|
| 1 — Contacto | nombres, apellidoPaterno, apellidoMaterno?, telefonoCelular | Saved immediately to context (`_parcial: true`) + `POST /api/guardar-contacto` |
| 2 — Identificación | fechaNacimiento, rfc?, curp?, genero, estadoCivil, correoElectronico, telefonoCasaTrabajo? | Saved on advance to sub-step 3 |
| 3 — Domicilio | calle, numeroExterior, numeroInterior?, colonia, municipioDelegacion, estadoRepublica, codigoPostal, tipoDomicilioPaso5, tiempoEnDomicilio | Saved on final submit (`_parcial: false`) + `PUT /api/guardar-perfil/:sesionId` |

The sub-step 1 contact data is always saved first so that if the user abandons the form, the contact is not lost.

## Persistence Strategy

### Progressive saving (Steps 1–3)
- **Step 1 advance** → `POST /api/iniciar-sesion` creates a draft `SesionWizard` (`pasoActual: 1`, `fuentePersistencia: 'borrador'`). Returns `sesionId` stored in `WizardContext`.
- **Step 2 advance** → `PATCH /api/sesion/:sesionId` merges step 2 fields into `datosWizardJson`, sets `pasoActual: 2`.
- **Step 3 analyze** → `PATCH /api/sesion/:sesionId` merges step 3 fields, sets `pasoActual: 3` (fire-and-forget, does not block LLM call).

### Finalization (Step 4 — LLM result)
```
clasificacionRecomendada = "Banco" | "Financiera"  →  guardarCompleto = true
                                                        Updates: sesiones_wizard (pasoActual: 4)
                                                        Creates: perfiles_completos + (later) datos_personales_paso5

clasificacionRecomendada = "Subprime"              →  guardarCompleto = false
                                                        Updates: sesiones_wizard (pasoActual: 4)
                                                        Creates: interacciones_anonimas (no PII, no exact financial figures)
```

**`guardarCompleto` is always recalculated server-side** from `clasificacionRecomendada` — never trust the client value.

**Never use viabilidad + carga to determine `guardarCompleto`** — the rule is solely based on `clasificacionRecomendada`.

## Normalized Input Variables

```
ocupacion, antiguedad, ingresoMensual, compruebaIngresos, tipoDomicilio,
historialCrediticio, deudasMensuales, rentaHipoteca, numDependientes,
precioAuto, anioModelo, tipoUnidad, enganche,
mensualidadBuscada, plazoDeseado, aceptaAjustar
```

All variables live in `WizardContext.jsx` under `WIZARD_DATA_KEYS`.

**Step 5 personal data** lives in `WizardContext.jsx` under the separate key `datosPersonales` (not in `WIZARD_DATA_KEYS` — never injected into the LLM prompt). Use `SET_DATOS_PERSONALES` action to update it.

**Persistence IDs** live in `WizardContext.jsx` as `sesionId` and `perfilId` (both start as `null`). Updated via `SET_SESION_IDS` action / `setSesionIds(sesionId, perfilId)` helper.

## Claude API Integration

See `src/utils/promptBuilder.js` for the full prompt. Key points:

- System role: commercial profiler for automotive credit in Mexico
- All 16 variables are injected into the prompt
- Classification channel: **Banco** (low risk) / **Financiera** (medium risk) / **Subprime** (high risk)
- LLM must return **only** the structured output — no preamble, no extra text
- Response parsed by `src/utils/responseParser.js`
- Fallback on malformed response: `"Responde con formato inválido. Por favor intenta de nuevo con los datos exactos."`

**Financial load thresholds** (projected: deudas + renta + mensualidad estimada) / ingreso:
- Cómoda: ≤ 35%
- Justa: 36%–40%
- Apretada: > 40%

## Expected Output Format

```
Resultado express
Viabilidad inicial: Alta | Media | Baja
Clasificación recomendada: Banco | Financiera | Subprime
Capacidad de pago estimada: Alta | Media | Baja
Nivel de carga financiera proyectada: Cómoda | Justa | Apretada
Por qué: [3–5 lines, commercial language]
Recomendaciones accionables:
- [acción 1]
- [acción 2]
Qué debe decir el vendedor al cliente: ["quotable phrase"]
Advertencia comercial: [only if Media/Baja or Apretada, else "Ninguna en este momento"]
```

## Key Files

| File | Purpose |
|------|---------|
| `src/context/WizardContext.jsx` | Global state — 16 wizard vars + `datosPersonales` + `sesionId` + `perfilId` + navigation + result |
| `src/utils/promptBuilder.js` | Builds systemPrompt + userMessage for LLM |
| `src/utils/responseParser.js` | Parses LLM plain-text response into structured object |
| `src/hooks/usePerfilador.js` | Orchestrates LLM API call, timeout, error handling |
| `src/steps/Step1Cliente.jsx` | Occupation, income, domicile — has link to `/clientes` |
| `src/steps/Step2PerfilFinanciero.jsx` | Credit history, debts, rent, dependents |
| `src/steps/Step3AutoOperacion.jsx` | Vehicle data, down payment (with % validation), term |
| `src/steps/Step4ResultadoExpress.jsx` | Result display; shows Step 5 CTA only for Banco/Financiera |
| `src/steps/Step5DatosPersonales.jsx` | Mini-wizard: 3 sub-steps, progressive save, pre-fill from `/clientes` |
| `src/pages/ClientesHistoricos.jsx` | Search by phone + 10 most recent clients, pre-fills Step 5 sub-step 1 |
| `server/index.cjs` | Express proxy + all API endpoints |
| `server/lambda.cjs` | AWS Lambda handler |
| `server/test-api.cjs` | Integration test suite — 59 assertions covering all wizard steps and DB state |
| `prisma/schema.prisma` | Prisma schema — 4 models: SesionWizard, PerfilCompleto, DatosPersonalesPaso5, InteraccionAnonima |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze` | Proxies wizard data to LLM, returns parsed result |
| `POST` | `/api/iniciar-sesion` | Creates draft `SesionWizard` at Step 1; returns `sesionId` |
| `PATCH` | `/api/sesion/:sesionId` | Merges step data into `datosWizardJson`; updates `pasoActual` (Steps 2 & 3) |
| `POST` | `/api/guardar-sesion` | Finalizes session after LLM result; creates `PerfilCompleto` or `InteraccionAnonima` |
| `POST` | `/api/guardar-contacto` | UPSERT sub-step 1 contact data; sets `paso5ContactoGuardado = true` |
| `PUT` | `/api/guardar-perfil/:sesionId` | Updates with sub-steps 2+3 data; sets `paso5Completado = true` |
| `GET` | `/api/clientes/recientes` | Returns 10 most recent clients from `datos_personales_paso5` |
| `GET` | `/api/clientes?telefono=X` | Searches clients by exact phone number |

All persistence endpoints use the Prisma singleton at `server/db/client.cjs`.

## Database Models (Prisma)

| Model | Table | When created |
|-------|-------|-------------|
| `SesionWizard` | `sesiones_wizard` | At Step 1 advance (draft); finalized at Step 4 with LLM result |
| `PerfilCompleto` | `perfiles_completos` | Only when `guardarCompleto = true` (Banco/Financiera), at Step 4 |
| `DatosPersonalesPaso5` | `datos_personales_paso5` | When user completes sub-step 1 of Step 5 (UPSERT) |
| `InteraccionAnonima` | `interacciones_anonimas` | Only when `guardarCompleto = false` (Subprime), at Step 4 |

### SesionWizard — notable fields added in progressive persistence upgrade
- `pasoActual Int @default(1)` — tracks current wizard step (1–4)
- `datosWizardJson String?` — temp JSON blob with merged step data; cleared after finalization
- `fuentePersistencia` — `'borrador'` while in-progress, `'completa'` or `'anonima'` after Step 4
- `clasificacionRecomendada`, `viabilidadInicial`, `cargaFinanciera` — now **nullable** (null until Step 4)

### PerfilCompleto — LLM result fields
Individual parsed fields (`viabilidadInicial`, `capacidadPago`, `cargaFinanciera`, `porQue`, `recomendacionesAccionables`, `fraseVendedor`, `advertenciaComercial`) are stored in dedicated columns.

Additionally, `resultadoLlmJson String?` stores the **complete resultado object as JSON** (serialized with `JSON.stringify`). This is a safety net: if field-level mapping ever drifts, the full LLM answer is always recoverable from the JSON blob.

### Key field name mapping — `responseParser.js` → server
The parser returns these keys; the server must destructure them correctly:

| `responseParser.js` key | Server variable | DB column |
|------------------------|-----------------|-----------|
| `cargaFinanciera` | `nivelCargaFinanciera` (aliased via destructuring) | `cargaFinanciera` |
| `recomendacionesAccionables` | `recomendaciones` (aliased via destructuring) | `recomendacionesAccionables` |
| `fraseVendedor` | `fraseVendedorParsed` (aliased via destructuring) | `fraseVendedor` |

**Never rename these aliases** without updating both `responseParser.js` and the destructuring in `/api/guardar-sesion`.

### Dev vs prod schemas
- `prisma/schema.prisma` — PostgreSQL (production, Aurora Serverless v2)
- `prisma/schema.dev.prisma` — SQLite (local dev, no `@db.*` annotations)

Run `npm run db:setup` (= generate + push) to sync local SQLite after schema changes.

### Migrations
- SQL migrations live in `prisma/migrations/`.
- Apply to Aurora with `npm run db:migrate:prod` (= `prisma migrate deploy`).
- The `postinstall` script in `package.json` runs `prisma generate` automatically on every `npm install` — ensures Amplify builds and Lambda deploys always have an up-to-date client.

| Migration | What it fixes |
|-----------|--------------|
| `001_fix_nullable_result_columns` | Drops NOT NULL on `clasificacion_recomendada`, `viabilidad_inicial`, `carga_financiera` (null until Step 4) |
| `002_add_resultado_llm_json` | Adds nullable `resultado_llm_json TEXT` to `perfiles_completos` for full LLM response JSON blob |

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — AWS Amplify + Lambda + Aurora deployment guide (current production stack)
- [docs/01-funcional.md](docs/01-funcional.md) — Full business and functional specification
- [docs/02-tecnico.md](docs/02-tecnico.md) — Technical architecture and normalized variable types
- [docs/03-prompts-claude.md](docs/03-prompts-claude.md) — Claude/DeepSeek prompt template and fallback
- [docs/upgrade_1/upgrades_1.md](docs/upgrade_1/upgrades_1.md) — Upgrade 1 requirements (applied 2026-03-24)
- [docs/upgrade_2/db_design.md](docs/upgrade_2/db_design.md) — Upgrade 2 data design spec (applied 2026-03-25)
