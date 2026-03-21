---
name: project_status
description: Current implementation state of the Perfilador Express wizard — which files exist, who owns them, and critical contracts between agents
type: project
---

As of 2026-03-20, ALL source files have been generated. The app is ready for `npm install && npm run dev`.

## Files created by the wizard-frontend-builder agent (foundation layer)

- package.json — Vite 6 + React 19 + react-router-dom 7 + Tailwind CSS 3
- vite.config.js — dev proxy to /api on port 3001, port 5173
- tailwind.config.js + postcss.config.js
- index.html — lang="es", Inter font, root div
- src/index.css — @tailwind directives + number input spin button reset
- src/main.jsx — StrictMode + createRoot
- src/App.jsx — BrowserRouter + WizardProvider + WizardLayout + Routes (/, /paso-1, /paso-2, /paso-3, /paso-4). Step3 and Step4 are lazy-loaded. StepSync component bridges URL changes with goToStep() from context.
- src/context/WizardContext.jsx — dual API: exposes both style-A (state, setFields, nextStep, prevStep) and style-B (wizardData, updateWizardData, goToStep, resetWizard, isLoading, setIsLoading, error, setError, resultado, setResultado) for cross-agent compatibility
- src/components/ui/Button.jsx — primary/secondary/danger variants, loading spinner, 44px min-height
- src/components/ui/Select.jsx — styled select with chevron, label, required marker, error state
- src/components/ui/InputNumber.jsx — number input with optional $ prefix and unit suffix
- src/components/ui/ProgressBar.jsx — 4-step progress indicator with checkmarks and step labels
- src/components/ui/Card.jsx — white rounded card with shadow
- src/components/ui/Alert.jsx — error/warning/info/success variants with icons
- src/components/ui/LoadingSpinner.jsx — animated spinner with accessible aria-live
- src/components/layout/WizardLayout.jsx — sticky header with dual logos (GANAcorp left, SemiNuevos right, title centered), progress bar section, footer disclaimer
- src/steps/Step1Cliente.jsx — ocupacion, antiguedad, ingresoMensual, compruebaIngresos. Frontend validation. Saves to context + navigates to /paso-2.
- src/steps/Step2PerfilFinanciero.jsx — historialCrediticio, deudasMensuales, enganche. Includes live debt-ratio preview Alert. Saves to context + navigates to /paso-3.
- public/LogoGANAcorp.jpeg — copied from docs/ so Vite serves it at /LogoGANAcorp.jpeg
- public/semi_nuevos.jpg — copied from docs/ so Vite serves it at /semi_nuevos.jpg

## Files created by the other agent (Step3/Step4/API layer)

- src/steps/Step3AutoOperacion.jsx — precioAuto, anioModelo, tipoUnidad, mensualidadBuscada, plazoDeseado, aceptaAjustar
- src/steps/Step4ResultadoExpress.jsx — loading/error/resultado states, resumida/completa toggle
- src/hooks/usePerfilador.js — orchestrates Claude API call (direct browser fetch)
- src/utils/promptBuilder.js — buildPrompt(wizardData) => { systemPrompt, userMessage }
- src/utils/responseParser.js — parseResponse(rawText) => ResultadoExpress | null

## Critical WizardContext contract (both agents must honor)

useWizard() returns:
  - wizardData: object with all 13 normalized variables (read by usePerfilador, Step3)
  - updateWizardData(partial): merges fields (used by Step3)
  - goToStep(n: 1|2|3|4): triggers both context update AND URL navigation via StepSync
  - resetWizard(): resets to step 1 (used by Step4)
  - isLoading: boolean (used by Step4)
  - setIsLoading(bool): setter (used by usePerfilador)
  - error: string | null (used by Step4)
  - setError(string | null): setter (used by usePerfilador)
  - resultado: ResultadoExpress | null (used by Step4)
  - setResultado(obj): setter (used by usePerfilador)

## API integration — DeepSeek via local proxy (updated 2026-03-20)

The app now routes AI calls through a local Express proxy server instead of calling Anthropic directly from the browser.

- Frontend calls: POST /api/analyze with { systemPrompt, userMessage }
- Vite proxies /api → http://localhost:3001
- Server: server/index.cjs (CommonJS — .cjs suffix required because package.json has "type":"module")
- Server forwards to DeepSeek: POST https://api.deepseek.com/chat/completions, model deepseek-chat
- API key: DEEPSEEK_API_KEY in .env.local at project root (loaded by dotenv in server)
- No API key in frontend code — zero exposure in browser
- Server timeout: 25 s on DeepSeek fetch; frontend timeout: 27 s (gives server time to respond with its own error)
- Server returns { text: string } on success, { error: string } with HTTP error status on failure
- Scripts added: "server": "node server/index.cjs", "dev:full": "concurrently npm run dev + npm run server"
- New dependencies: express ^4.18.2, dotenv ^16.4.5 (prod); concurrently ^8.2.2 (dev)
- Run after pulling: npm install, then add real key to .env.local

## Brand color

The brand palette was changed from blue (#3b82f6) to crimson red (#e0252d) as of 2026-03-20.
- brand-600: #e0252d (primary, buttons, progress fill, active states)
- brand-700: #b91c22 (hover)
- brand-800: #991b1b (active/dark)
- brand-50: #fef2f2 (subtle backgrounds)
- brand-200: #fecaca (borders)
- All `blue-*` Tailwind classes replaced with `brand-*` across all component files in scope.
- Alert.jsx still has blue info variant — intentionally untouched (not in scope).

## AWS deployment layer (added 2026-03-20)

The app is configured for AWS Amplify + API Gateway + Lambda deployment:

- lambda/index.mjs — ES Module Lambda handler (Node 18.x/20.x), reads DEEPSEEK_API_KEY from Lambda env vars, Lambda Proxy Integration format, 25 s timeout on DeepSeek fetch, full CORS headers on every response including errors and OPTIONS preflight
- lambda/README.md — Spanish step-by-step deployment instructions (zip, Lambda create, env var, API Gateway route, CORS, deploy, curl test)
- amplify.yml — Amplify build spec: preBuild npm install, build npm run build, artifacts from dist/
- src/hooks/usePerfilador.js — API_URL now uses dual-mode pattern: (import.meta.env.VITE_API_URL || '') + '/api/analyze'. Locally, VITE_API_URL is undefined so Vite proxy handles /api. In production, set VITE_API_URL to the API Gateway base URL in Amplify environment variables.

Deployment checklist:
1. zip lambda/index.mjs → upload to Lambda console
2. Set DEEPSEEK_API_KEY in Lambda env vars
3. Set Lambda timeout to 30 s
4. Configure API Gateway: POST + OPTIONS /api/analyze → Lambda (Proxy Integration)
5. Set VITE_API_URL in Amplify env vars (base URL without /api/analyze suffix)
6. Redeploy Amplify app

## Known open item

Step3 uses `import { usePerfilador } from '../hooks/usePerfilador'` (without .js extension). Vite resolves this correctly. No action needed.

**Why:** Step4 is mounted first via goToStep(4), which triggers URL navigation to /paso-4, then triggerAnalysis() runs async — so Step4 renders the spinner immediately.
