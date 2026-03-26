# Deployment Guide — Perfilador Express

Production stack: **AWS Amplify** (frontend CDN) + **AWS Lambda + API Gateway** (Express backend via `serverless-http`) + **Aurora Serverless v2** (PostgreSQL) + **DeepSeek API** (LLM).

```
GitHub push → Amplify build → CloudFront CDN  (frontend)
                                  ↓
                        user browser /api/*
                                  ↓
                     API Gateway → Lambda (Express server/index.cjs)
                                  ↓
                           DeepSeek API + Aurora PostgreSQL
```

---

## Environment variables

### Lambda (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key (`sk-...`) |
| `DATABASE_URL` | Yes | Aurora PostgreSQL connection string |
| `FRONTEND_ORIGIN` | Yes | Amplify frontend URL for CORS (e.g. `https://main.xxxx.amplifyapp.com`) |

### Amplify (frontend build)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Base URL of the Lambda API Gateway — no trailing slash (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`) |

---

## Part 1 — AWS Amplify (frontend)

Amplify auto-deploys the React + Vite frontend from GitHub on every push to `main`.

### Setup

1. Go to **AWS Amplify → New app → Host web app** → connect your GitHub repo.
2. Amplify auto-detects Vite via `amplify.yml` in the project root (already committed):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install        # also runs prisma generate via postinstall
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
3. In **Environment variables**, add:
   ```
   VITE_API_URL = https://<api-id>.execute-api.<region>.amazonaws.com
   ```
4. Click **Save and deploy**.

Amplify rebuilds on every push to `main` automatically. The `postinstall` hook runs `prisma generate` during the build — no manual step needed.

---

## Part 2 — AWS Lambda (backend)

The Express server (`server/index.cjs`) is wrapped for Lambda by `server/lambda.cjs` using `serverless-http`.

### Lambda configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Handler | `server/lambda.handler` |
| Timeout | **30 seconds** (DeepSeek can take up to 25 s) |
| Architecture | x86_64 |

### Environment variables (Lambda)

Set these in **Lambda → Configuration → Environment variables**:

```
DEEPSEEK_API_KEY   = sk-...
DATABASE_URL       = postgresql://user:pass@cluster.rds.amazonaws.com:5432/perfilador
FRONTEND_ORIGIN    = https://main.xxxx.amplifyapp.com
```

Store secrets in **AWS Systems Manager Parameter Store** and reference them via the Lambda execution role for better security:

```bash
aws ssm put-parameter \
  --name "/perfilador/DEEPSEEK_API_KEY" \
  --value "sk-..." \
  --type SecureString
```

### API Gateway routes

All routes under `/api/*` must proxy to the Lambda function:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze` | LLM proxy |
| `POST` | `/api/iniciar-sesion` | Create draft session |
| `PATCH` | `/api/sesion/{sesionId}` | Merge step data |
| `POST` | `/api/guardar-sesion` | Finalize session after LLM |
| `POST` | `/api/guardar-contacto` | Save Step 5 sub-step 1 |
| `PUT` | `/api/guardar-perfil/{sesionId}` | Save Step 5 sub-steps 2+3 |
| `GET` | `/api/clientes/recientes` | 10 most recent clients |
| `GET` | `/api/clientes` | Search by phone |
| `OPTIONS` | `/api/*` | CORS preflight |

Configure an **HTTP API** (recommended) with a single catch-all route:
- `ANY /{proxy+}` → Lambda integration

### CORS

The Express server handles CORS headers for all responses. Ensure `FRONTEND_ORIGIN` is set correctly in Lambda env. For the API Gateway itself:

- **Allow origin**: your Amplify domain
- **Allow methods**: `GET, POST, PUT, PATCH, OPTIONS`
- **Allow headers**: `Content-Type`

---

## Part 3 — Aurora Serverless v2 (database)

### Connection

Use the Aurora cluster writer endpoint as `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:pass@cluster-writer.us-east-1.rds.amazonaws.com:5432/perfilador
```

Ensure the Lambda security group has inbound access to the Aurora security group on port 5432.

### Schema

The production Prisma schema is at `prisma/schema.prisma` (PostgreSQL). It defines 4 models:

| Model | Table | Created when |
|-------|-------|-------------|
| `SesionWizard` | `sesiones_wizard` | Step 1 advance (draft); finalized at Step 4 |
| `PerfilCompleto` | `perfiles_completos` | Step 4 — Banco or Financiera only |
| `DatosPersonalesPaso5` | `datos_personales_paso5` | Step 5 sub-step 1 (UPSERT) |
| `InteraccionAnonima` | `interacciones_anonimas` | Step 4 — Subprime only (no PII) |

### Initial setup (first deploy)

```bash
# Push schema to Aurora (creates all tables)
npm run db:push:prod
```

### Migrations

Production migrations live in `prisma/migrations/`. Apply them with:

```bash
npm run db:migrate:prod
# runs: prisma migrate deploy
```

| Migration | Description |
|-----------|-------------|
| `001_fix_nullable_result_columns` | Drops NOT NULL on `clasificacion_recomendada`, `viabilidad_inicial`, `carga_financiera` — these are null until the LLM responds at Step 4 |

> **Important:** if you used `prisma db push` to create the schema initially and these columns were created as NOT NULL, run the migration above before using Prisma Studio or the app will throw a type conversion error on existing rows.

### Dev vs prod schemas

| Schema file | Provider | Use case |
|------------|---------|---------|
| `prisma/schema.prisma` | PostgreSQL | Production (Aurora) |
| `prisma/schema.dev.prisma` | SQLite | Local development |

```bash
# Local dev — sync after schema changes
npm run db:setup          # generate + push to SQLite

# Production — generate client
npm run db:generate:prod  # generates from schema.prisma

# Production — apply migrations
npm run db:migrate:prod
```

---

## Part 4 — Deploying code changes

### Standard deploy (frontend + backend)

1. Push to `main` → Amplify auto-builds and deploys the frontend.
2. Upload the new Lambda ZIP or redeploy via your CI/CD pipeline.

### Prisma schema changes

1. Edit `prisma/schema.prisma`.
2. Write a migration SQL in `prisma/migrations/<number>_<name>/migration.sql`.
3. Test locally with `prisma/schema.dev.prisma`.
4. Apply to Aurora: `npm run db:migrate:prod`.
5. Redeploy Lambda (so it uses the updated Prisma client bundled at build time).

### Lambda packaging

The Lambda deployment package must include:
- `server/index.cjs`
- `server/lambda.cjs`
- `server/db/client.cjs`
- `node_modules/` (all runtime dependencies)
- The generated Prisma client (`.prisma/client/` or `node_modules/.prisma/`)

The `postinstall` script runs `prisma generate` automatically during `npm install`, so the generated client is always present after a fresh install.

---

## Part 5 — Local development (not deployed)

```bash
# Install (also runs prisma generate)
npm install

# Set up local env
cp .env.local.example .env.local
# Edit: DEEPSEEK_API_KEY=sk-...
#       DATABASE_URL=file:./prisma/dev.db

# Sync local SQLite DB
npm run db:setup

# Start frontend + backend
npm run dev:full
```

The Vite dev server at `:5173` proxies `/api/*` to Express at `:3001`. No `VITE_API_URL` needed locally.

```bash
# Browse local data
npm run db:studio
```

---

## Verification

After deployment, test the LLM proxy:

```bash
curl -X POST https://<api-gateway-url>/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "Eres un perfilador comercial. Responde solo con: Resultado express",
    "userMessage": "Prueba de conectividad"
  }'
# Expected: { "text": "Resultado express" }
```

Test the session creation endpoint:

```bash
curl -X POST https://<api-gateway-url>/api/iniciar-sesion \
  -H "Content-Type: application/json" \
  -d '{
    "ocupacion": "Empleado",
    "antiguedad": 2,
    "ingresoMensual": 25000,
    "compruebaIngresos": "Si",
    "tipoDomicilio": "Rentado"
  }'
# Expected: { "ok": true, "sesionId": "uuid-..." }
```

---

## Troubleshooting

### `Error converting field "clasificacionRecomendada" of expected non-nullable type`

The Aurora column has a NOT NULL constraint but the schema declares it nullable. Fix:

```bash
npm run db:migrate:prod
```

Or apply the SQL manually via RDS Query Editor:

```sql
ALTER TABLE sesiones_wizard ALTER COLUMN clasificacion_recomendada DROP NOT NULL;
ALTER TABLE sesiones_wizard ALTER COLUMN viabilidad_inicial DROP NOT NULL;
ALTER TABLE sesiones_wizard ALTER COLUMN carga_financiera DROP NOT NULL;
```

### Prisma client out of date

After any schema change or Lambda redeploy where `npm install` was not run:

```bash
npm run db:generate:prod
```

The `postinstall` script handles this automatically in Amplify builds and fresh Lambda installs.

### Lambda timeout

If the LLM call times out, the Lambda timeout must be ≥ 30 seconds. The frontend has an 18–25 s client-side timeout — the Lambda must be configured for at least 30 s to account for cold starts.

### CORS errors in browser

1. Verify `FRONTEND_ORIGIN` in Lambda env matches your exact Amplify URL.
2. Verify the API Gateway CORS config allows the Amplify domain.
3. Confirm the Lambda is returning `Access-Control-Allow-Origin` in responses (check CloudWatch logs).
