/**
 * promptBuilder.js
 * Construye el system prompt y el mensaje de usuario para la API de Claude,
 * inyectando las 13 variables normalizadas del wizard.
 *
 * Fuente del template: docs/03-prompts-claude.md
 */

/**
 * @typedef {Object} WizardVariables
 * @property {string} ocupacion
 * @property {string|number} antiguedad
 * @property {number} ingresoMensual
 * @property {string} compruebaIngresos   - "si" | "parcial" | "no"
 * @property {string} historialCrediticio - "bueno" | "regular" | "malo" | "sin historial"
 * @property {number} deudasMensuales
 * @property {number} enganche
 * @property {number} mensualidadBuscada
 * @property {number} plazoDeseado
 * @property {string} aceptaAjustar       - "si" | "no"
 * @property {number} precioAuto
 * @property {number} anioModelo
 * @property {string} tipoUnidad
 */

/**
 * Formatea un número como pesos mexicanos sin decimales.
 * Ejemplo: 30000 → "$30,000"
 */
function formatMXN(value) {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `$${num.toLocaleString('es-MX')}`;
}

/**
 * Normaliza la etiqueta de comprobación de ingresos para el prompt.
 * "si" → "Sí"  |  "parcial" → "Parcial"  |  "no" → "No"
 */
function labelComprobacion(value) {
  const map = { si: 'Sí', parcial: 'Parcial', no: 'No' };
  return map[value] ?? value;
}

/**
 * Normaliza la etiqueta de aceptar ajuste para el prompt.
 */
function labelAcepta(value) {
  return value === 'si' ? 'Sí' : 'No';
}

/**
 * buildPrompt
 * Recibe las 13 variables del wizard y devuelve { systemPrompt, userMessage }
 * listos para enviar a la API de Claude.
 *
 * @param {WizardVariables} variables
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildPrompt(variables) {
  const {
    ocupacion,
    antiguedad,
    ingresoMensual,
    compruebaIngresos,
    historialCrediticio,
    deudasMensuales,
    enganche,
    mensualidadBuscada,
    plazoDeseado,
    aceptaAjustar,
    precioAuto,
    anioModelo,
    tipoUnidad,
  } = variables;

  // --- System prompt: define el rol y las restricciones duras ---
  const systemPrompt = `Actúa como un perfilador express de orientación comercial para crédito automotriz en agencias y lotes de México.

Reglas estrictas:
• No apruebas créditos. Nunca dices "se aprueba", "es viable con X banco", ni prometes nada.
• No menciones bancos, financieras, SOFOM, nombres de instituciones ni tasas reales.
• Habla SIEMPRE como asesor comercial de piso, lenguaje sencillo, directo, práctico.
• Usa SOLO los datos que te doy. No inventes información adicional.

Referencia carga financiera (guía comercial – no regla bancaria):
• Cómoda/saludable: ≤ 35%
• Justa/aceptable: 36%–40%
• Apretada/riesgosa: > 40%

Clasifica obligatoriamente:
• Viabilidad inicial: Alta / Media / Baja
• Tipo de perfil: Tradicional / Tradicional con ajustes / Flexible / Alternativo / Delicado
• Capacidad de pago estimada: Alta / Media / Baja
• Nivel de carga financiera estimada: Cómoda / Justa / Apretada
• Ruta sugerida: Explorar primero opción tradicional bancaria / tradicional con ajustes / flexible / alternativa / reestructurar antes de ingresar

Devuelve SIEMPRE y SOLO este formato (sin agregar texto antes ni después):

Resultado express
Viabilidad inicial: [valor]
Tipo de perfil: [valor]
Capacidad de pago estimada: [valor]
Nivel de carga financiera estimada: [valor]
Ruta sugerida: [valor]
Por qué: [2–4 líneas máximo – lenguaje comercial]
Ajuste sugerido antes de ingresar: [frase corta o "ninguno por el momento"]
Qué debe decir el vendedor al cliente: ["frase natural entre comillas que el vendedor puede copiar-pegar"]
Advertencia comercial: [frase corta SOLO si el caso es Media/Baja o Apretada – si no, poner "Ninguna en este momento"]`;

  // --- Mensaje de usuario: los datos concretos del caso ---
  const userMessage = `Analiza este caso con el perfilador express:

Ocupación: ${ocupacion}
Antigüedad laboral o en actividad: ${antiguedad}
Ingreso mensual aproximado: ${formatMXN(ingresoMensual)}
Comprueba ingresos: ${labelComprobacion(compruebaIngresos)}
Historial crediticio percibido: ${historialCrediticio}
Deudas mensuales aproximadas: ${formatMXN(deudasMensuales)}
Enganche disponible: ${formatMXN(enganche)}
Mensualidad que busca: ${formatMXN(mensualidadBuscada)}
Plazo deseado: ${plazoDeseado} meses
¿Acepta ajustar unidad o monto?: ${labelAcepta(aceptaAjustar)}
Precio aproximado del auto: ${formatMXN(precioAuto)}
Año modelo: ${anioModelo}
Tipo de unidad: ${tipoUnidad}`;

  return { systemPrompt, userMessage };
}
