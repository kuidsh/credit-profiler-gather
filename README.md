# Perfilador Express de Orientación Comercial para Crédito Automotriz

#despliegue en prod:
https://main.d2t2etx0403nnk.amplifyapp.com/paso-1

Herramienta interna para asesores de piso en agencias y lotes de autos en México. Permite perfilar rápidamente a un cliente para orientar la gestión comercial de un crédito automotriz. **No aprueba créditos — es una guía comercial.**

## Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 3
- **Routing**: React Router v7
- **Backend/Proxy**: Express (`server/index.cjs`)
- **Deploy**: AWS Amplify + Lambda (`server/lambda.cjs`) via `serverless-http`

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env   # Agrega tu API key al .env

# Iniciar frontend + proxy en paralelo
npm run dev:full

# O por separado:
npm run dev      # Vite en :5173
npm run server   # Proxy Express en :3001
```

La variable `VITE_API_URL` no se necesita en desarrollo — Vite redirige `/api` a `localhost:3001` automáticamente.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `LLM_API_KEY` | API key del proveedor LLM (usada solo en el servidor) |
| `VITE_API_URL` | URL base del API Gateway en producción (ej. `https://xxx.execute-api.us-east-1.amazonaws.com/prod`) |

## Flujo de la aplicación

```
Wizard (4 pasos) → promptBuilder → Proxy /api/analyze → LLM → responseParser → ResultadoExpress
```

### Pasos del wizard

| Paso | Archivo | Campos capturados |
|------|---------|-------------------|
| 1 — Datos del cliente | `Step1Cliente.jsx` | Ocupación, antigüedad, ingreso, comprobación, tipo de domicilio |
| 2 — Perfil financiero | `Step2PerfilFinanciero.jsx` | Historial (referencial), deudas, renta/hipoteca, dependientes |
| 3 — Auto y operación | `Step3AutoOperacion.jsx` | Precio, año, tipo, enganche (≥20%), mensualidad deseada, plazo |
| 4 — Resultado | `Step4ResultadoExpress.jsx` | Resultado del análisis de Claude |

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
├── context/WizardContext.jsx      # Estado global de las 16 variables + navegación
├── hooks/usePerfilador.js         # Llamada al proxy, timeout, manejo de errores
├── steps/
│   ├── Step1Cliente.jsx
│   ├── Step2PerfilFinanciero.jsx
│   ├── Step3AutoOperacion.jsx
│   └── Step4ResultadoExpress.jsx
└── utils/
    ├── promptBuilder.js           # Construye systemPrompt + userMessage
    └── responseParser.js          # Parsea respuesta del LLM a objeto JS

server/
├── index.cjs                      # Express proxy (dev y producción no-Lambda)
└── lambda.cjs                     # Handler para AWS Lambda

public/
├── LogoGANAcorp.jpeg
└── logo_seminuevos_rojo.png

docs/
├── 01-funcional.md                # Especificación funcional completa
├── 02-tecnico.md                  # Arquitectura y tipos de variables
├── 03-prompts-claude.md           # Prompt template original
└── upgrade_1/
    ├── upgrades_1.md              # Requerimientos upgrade 1 (aplicado 2026-03-24)
    └── Politicas_entidades.pdf    # Políticas de referencia de entidades financieras
```

## Reglas de negocio importantes

- El bloque **"Qué decirle al cliente"** tiene color dinámico: verde (Alta), amarillo (Media), rojo (Baja).
- El **enganche mínimo** validado en Step 3 es el 20% del precio del auto.
- El **historial crediticio** es dato referencial — el cliente puede no conocer su situación real. No es el factor decisivo único.
- Nunca se mencionan bancos, financieras ni SOFOM específicas en el output.
