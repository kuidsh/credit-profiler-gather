# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Perfilador Express de Orientación Comercial para Crédito Automotriz** — a web tool for car dealership salespeople in Mexico to quickly assess a customer's financing viability. It is a commercial advisor, NOT a credit approver. All output must be in Spanish with commercial (non-banking) language.

The project is **fully implemented** (upgrade 1 + upgrade 2 applied). Reference material is in [docs/](docs/).

## Key Constraints

- **No real bank/institution names** in output: use only "Banco / Financiera / Subprime"
- **No credit approval language**: never say "se aprueba", "es viable con X banco", or make promises
- **LLM timeout**: 18–25 seconds max; fallback message is implemented in `usePerfilador.js`
- **historialCrediticio** is reference-only — never the sole decision factor
- **Step 5 data is PII** — subject to LFPDPPP (Mexican data protection law); never log or expose unnecessarily

## Architecture

```
Wizard (5 steps) → Prompt Builder → Proxy Server → LLM API → Response Parser → ResultadoExpress UI
                                                                                        ↓ (Banco | Financiera)
                                                                                Step5 mini-wizard (3 sub-steps)
                                                                                        ↓
                                                                         POST /api/guardar-contacto (sub-step 1)
                                                                         PUT  /api/guardar-perfil/:id (sub-step 3)
```

- React + Vite frontend (Tailwind CSS)
- Express proxy server (`server/index.cjs`) handles API key, LLM forwarding, and data persistence endpoints
- AWS Lambda entry point: `server/lambda.cjs` (deployed via Amplify + serverless-http)
- API URL: dev uses `/api/analyze` (Vite proxy → localhost:3001), prod uses `VITE_API_URL` env var
- Prisma ORM: PostgreSQL in prod (Aurora Serverless v2), SQLite optional for local dev

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

```
clasificacionRecomendada = "Banco" | "Financiera"  →  guardarCompleto = true
                                                        Persists: sesiones_wizard + perfiles_completos + datos_personales_paso5

clasificacionRecomendada = "Subprime"              →  guardarCompleto = false
                                                        Persists: sesiones_wizard + interacciones_anonimas (no PII, no exact financial figures)
```

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
| `src/context/WizardContext.jsx` | Global state — 16 wizard vars + `datosPersonales` + navigation + result |
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
| `prisma/schema.prisma` | Prisma schema — 4 models: SesionWizard, PerfilCompleto, DatosPersonalesPaso5, InteraccionAnonima |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze` | Proxies wizard data to LLM, returns parsed result |
| `POST` | `/api/guardar-contacto` | Saves sub-step 1 contact data (UPSERT); sets `paso5ContactoGuardado = true` |
| `PUT` | `/api/guardar-perfil/:sesionId` | Updates with sub-steps 2+3 data; sets `paso5Completado = true` |
| `GET` | `/api/clientes/recientes` | Returns 10 most recent clients from `datos_personales_paso5` |
| `GET` | `/api/clientes?telefono=X` | Searches clients by exact phone number |

> **Note:** `/api/guardar-contacto` and `/api/guardar-perfil` require `server/db/client.cjs` (Prisma singleton) — marked as TODO, not yet implemented.

## Database Models (Prisma)

| Model | Table | When created |
|-------|-------|-------------|
| `SesionWizard` | `sesiones_wizard` | Every completed Step 4 execution |
| `PerfilCompleto` | `perfiles_completos` | Only when `guardarCompleto = true` (Banco/Financiera) |
| `DatosPersonalesPaso5` | `datos_personales_paso5` | When user completes sub-step 1 of Step 5 (UPSERT) |
| `InteraccionAnonima` | `interacciones_anonimas` | Only when `guardarCompleto = false` (Subprime) |

## Documentation

- [docs/01-funcional.md](docs/01-funcional.md) — Full business and functional specification
- [docs/02-tecnico.md](docs/02-tecnico.md) — Technical architecture and normalized variable types
- [docs/03-prompts-claude.md](docs/03-prompts-claude.md) — Claude prompt template and fallback
- [docs/upgrade_1/upgrades_1.md](docs/upgrade_1/upgrades_1.md) — Upgrade 1 requirements (applied 2026-03-24)
- [docs/upgrade_2/db_design.md](docs/upgrade_2/db_design.md) — Upgrade 2 data design spec (applied 2026-03-25)
