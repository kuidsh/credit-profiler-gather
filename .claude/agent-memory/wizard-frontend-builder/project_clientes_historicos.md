---
name: Clientes historicos feature
description: /clientes route added — search + recent list with pre-fill of Step5 sub-paso 1 from selected customer
type: project
---

La ruta `/clientes` fue agregada como página independiente (`src/pages/ClientesHistoricos.jsx`) accesible desde un enlace discreto en el sub-paso 1 de Step5DatosPersonales.

**Why:** Los vendedores necesitan reutilizar datos de clientes que ya visitaron la agencia sin tener que volver a capturar nombre/telefono manualmente.

**How to apply:** La página no forma parte del mini-wizard numérico (pasos 1-5). No debe mostrarse en la ProgressBar principal. Al seleccionar un cliente se llama `setDatosPersonales({ ..., _parcial: true })` y se navega a `/paso-5` via `useNavigate`. El enlace en Step5 está debajo del campo de teléfono celular, estilo `text-sm text-brand-600 underline`, discreto.

Endpoints consumidos:
- `GET /api/clientes/recientes` — lista de los 10 más recientes
- `GET /api/clientes?telefono=XXXXXXXXXX` — búsqueda por teléfono

Estructura de cada cliente esperada del backend:
```json
{ "nombres": "...", "apellidoPaterno": "...", "apellidoMaterno": "...", "telefonoCelular": "...", "clasificacionRecomendada": "Banco|Financiera|Subprime", "fechaRegistro": "ISO string" }
```
