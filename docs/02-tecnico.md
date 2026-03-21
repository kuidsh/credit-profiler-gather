# 2. Especificación Técnica – Perfilador Express

## Arquitectura

Frontend → [opcional Backend] → Claude API (Anthropic)

## Flujo principal

1. Wizard 4 pasos (no guardar datos sensibles)
2. Al finalizar → se construye prompt estandarizado
3. Llamada a Claude → respuesta en formato estricto
4. Parseo simple (split por líneas o regex) → render en ResultadoExpress

## Restricciones importantes

- NUNCA guardar datos personales identificables
- No logs con ingresos, nombres, teléfonos, etc.
- Timeout en llamada LLM: 18–25 segundos máximo
- Fallback: mensaje genérico si falla Claude

## Variables esperadas (normalizadas)

ocupacion:                "asalariado" | "independiente" | "negocio propio" | "informal" | "pensionado" | ""
antiguedad:               number | string (años/meses)
ingresoMensual:           number
compruebaIngresos:        "si" | "parcial" | "no"
historialCrediticio:      "bueno" | "regular" | "malo" | "sin historial"
deudasMensuales:          number
enganche:                 number
mensualidadBuscada:       number
plazoDeseado:             number (meses)
aceptaAjustar:            "si" | "no"
precioAuto:               number
anioModelo:               number
tipoUnidad:               "sedán" | "SUV" | "pickup" | "premium" | "híbrido/eléctrico" | "otro"