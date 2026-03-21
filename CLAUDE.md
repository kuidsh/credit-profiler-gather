# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Perfilador Express de Orientación Comercial para Crédito Automotriz** — a web tool for car dealership salespeople in Mexico to quickly assess a customer's financing viability. It is a commercial advisor, NOT a credit approver. All output must be in Spanish with commercial (non-banking) language.

The project is currently in **specification phase**. No implementation code exists yet. All reference material is in [docs/](docs/).

## Key Constraints

- **Data persistence is required**: all inputs and results must be saved; storage mechanism (database, localStorage, backend) is TBD
- **No real bank/institution names** in output: never mention specific banks, financieras, or SOFOM
- **No credit approval language**: never say "se aprueba", "es viable con X banco", or make promises
- **LLM timeout**: 18–25 seconds max; always implement a fallback message if Claude fails

## Architecture

```
Wizard (4 steps) → Prompt Builder → Claude API → Response Parser → ResultadoExpress UI
```

- Frontend-only is acceptable (Claude API can be called directly from the browser)
- Optional backend if CORS or API key security requires it
- Data persistence required — mechanism TBD (database, localStorage, or backend)

## Wizard Steps

1. **Client occupation**: type, tenure, income, income verification method
2. **Financial profile**: credit history perception, monthly debts, available down payment
3. **Vehicle & operation**: price, year model, vehicle type, desired monthly payment, desired term, flexibility to adjust
4. **Results display**: structured output from Claude

## Normalized Input Variables

See [docs/02-tecnico.md](docs/02-tecnico.md) for exact types. Key variables:

```
ocupacion, antiguedad, ingresoMensual, compruebaIngresos, historialCrediticio,
deudasMensuales, enganche, mensualidadBuscada, plazoDeseado,
aceptaAjustar, precioAuto, anioModelo, tipoUnidad
```

## Claude API Integration

The exact prompt template is in [docs/03-prompts-claude.md](docs/03-prompts-claude.md). Key points:

- System role: commercial profiler for automotive credit in Mexico
- All 13 variables are injected into the prompt template
- Claude must return **only** the structured output — no preamble, no extra text
- Parse response by splitting on lines or regex matching field names
- Fallback prompt if response is malformed: `"Responde con formato inválido. Por favor intenta de nuevo con los datos exactos."`

**Financial load reference thresholds** (debt/income ratio):
- Cómoda: ≤ 35%
- Justa: 36%–40%
- Apretada: > 40%

## Expected Output Format

```
Resultado express
Viabilidad inicial: Alta | Media | Baja
Tipo de perfil: Tradicional | Tradicional con ajustes | Flexible | Alternativo | Delicado
Capacidad de pago estimada: Alta | Media | Baja
Nivel de carga financiera estimada: Cómoda | Justa | Apretada
Ruta sugerida: [one of 5 options]
Por qué: [2–4 lines, commercial language]
Ajuste sugerido antes de ingresar: [short phrase or "ninguno por el momento"]
Qué debe decir el vendedor al cliente: ["quotable phrase"]
Advertencia comercial: [only if Media/Baja viability or Apretada load, else "Ninguna en este momento"]
```

## Documentation

- [docs/01-funcional.md](docs/01-funcional.md) — Full business and functional specification
- [docs/02-tecnico.md](docs/02-tecnico.md) — Technical architecture and normalized variable types
- [docs/03-prompts-claude.md](docs/03-prompts-claude.md) — Claude prompt template and fallback
