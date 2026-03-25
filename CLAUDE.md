# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Perfilador Express de Orientación Comercial para Crédito Automotriz** — a web tool for car dealership salespeople in Mexico to quickly assess a customer's financing viability. It is a commercial advisor, NOT a credit approver. All output must be in Spanish with commercial (non-banking) language.

The project is **fully implemented** (upgrade 1 applied). Reference material is in [docs/](docs/).

## Key Constraints

- **No real bank/institution names** in output: use only "Banco / Financiera / Subprime"
- **No credit approval language**: never say "se aprueba", "es viable con X banco", or make promises
- **LLM timeout**: 18–25 seconds max; fallback message is implemented in `usePerfilador.js`
- **historialCrediticio** is reference-only — never the sole decision factor

## Architecture

```
Wizard (4 steps) → Prompt Builder → Proxy Server → LLM API → Response Parser → ResultadoExpress UI
```

- React + Vite frontend (Tailwind CSS)
- Express proxy server (`server/index.cjs`) handles API key and forwards to LLM
- AWS Lambda entry point: `server/lambda.cjs` (deployed via Amplify + serverless-http)
- API URL: dev uses `/api/analyze` (Vite proxy → localhost:3001), prod uses `VITE_API_URL` env var

## Wizard Steps

1. **Client data** (`Step1Cliente.jsx`): occupation, tenure, income, income verification, domicile type
2. **Financial profile** (`Step2PerfilFinanciero.jsx`): credit history (reference only), monthly debts, rent/mortgage, number of dependents
3. **Vehicle & operation** (`Step3AutoOperacion.jsx`): price, year model, vehicle type, down payment (≥20% required), desired payment, term, flexibility
4. **Results** (`Step4ResultadoExpress.jsx`): structured output from LLM

## Normalized Input Variables

```
ocupacion, antiguedad, ingresoMensual, compruebaIngresos, tipoDomicilio,
historialCrediticio, deudasMensuales, rentaHipoteca, numDependientes,
precioAuto, anioModelo, tipoUnidad, enganche,
mensualidadBuscada, plazoDeseado, aceptaAjustar
```

All variables live in `WizardContext.jsx` under `WIZARD_DATA_KEYS`.

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
| `src/context/WizardContext.jsx` | Global state — all 16 input variables + navigation + result |
| `src/utils/promptBuilder.js` | Builds systemPrompt + userMessage for LLM |
| `src/utils/responseParser.js` | Parses LLM plain-text response into structured object |
| `src/hooks/usePerfilador.js` | Orchestrates API call, timeout, error handling |
| `src/steps/Step1Cliente.jsx` | Occupation, income, domicile |
| `src/steps/Step2PerfilFinanciero.jsx` | Credit history, debts, rent, dependents |
| `src/steps/Step3AutoOperacion.jsx` | Vehicle data, down payment (with % validation), term |
| `src/steps/Step4ResultadoExpress.jsx` | Result display with color-coded badges |
| `server/index.cjs` | Express proxy (dev + prod non-Lambda) |
| `server/lambda.cjs` | AWS Lambda handler |

## Documentation

- [docs/01-funcional.md](docs/01-funcional.md) — Full business and functional specification
- [docs/02-tecnico.md](docs/02-tecnico.md) — Technical architecture and normalized variable types
- [docs/03-prompts-claude.md](docs/03-prompts-claude.md) — Claude prompt template and fallback
- [docs/upgrade_1/upgrades_1.md](docs/upgrade_1/upgrades_1.md) — Upgrade 1 requirements (applied 2026-03-24)
