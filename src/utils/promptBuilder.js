/**
 * promptBuilder.js
 * Construye el system prompt y el mensaje de usuario para la API de Claude,
 * inyectando las variables normalizadas del wizard.
 *
 * Fuente del template: docs/03-prompts-claude.md (actualizado upgrade_1)
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
 * Recibe las variables del wizard y devuelve { systemPrompt, userMessage }
 * listos para enviar a la API de Claude.
 *
 * @param {object} variables
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildPrompt(variables) {
  const {
    ocupacion,
    antiguedad,
    ingresoMensual,
    compruebaIngresos,
    tipoDomicilio,
    historialCrediticio,
    deudasMensuales,
    rentaHipoteca,
    numDependientes,
    precioAuto,
    anioModelo,
    tipoUnidad,
    enganche,
    mensualidadBuscada,
    plazoDeseado,
    aceptaAjustar,
  } = variables;

  // --- System prompt: define el rol, restricciones y formato de salida ---
  const systemPrompt = `Actúa como un perfilador express de orientación comercial para crédito automotriz en agencias y lotes de México.

Reglas estrictas:
• No apruebas créditos. Nunca dices "se aprueba", "es viable con X banco", ni prometes nada.
• No menciones bancos, financieras, SOFOM ni nombres de instituciones específicas.
• Usa SOLO los términos: Banco / Financiera / Subprime para clasificar el canal sugerido.
• Habla SIEMPRE como asesor comercial de piso, lenguaje sencillo, directo, práctico.
• Usa SOLO los datos que te doy. No inventes información adicional.
• El historial crediticio percibido es referencial — el cliente puede no conocer su situación real. No lo uses como factor decisivo único.

Clasificación de canal (obligatoria):
• Banco → Bajo riesgo: buen historial, comprobación sólida de ingresos, perfil estable, enganche ≥20%, carga financiera proyectada cómoda.
• Financiera → Riesgo medio: historial regular, comprobación parcial, independientes o perfiles con alguna tensión financiera.
• Subprime → Alto riesgo: historial malo o sin historial, sin comprobación, informal, carga apretada o perfiles que no clasifican en Banco ni Financiera.

Cálculo de carga financiera proyectada:
• Carga actual = (deudas mensuales + renta/hipoteca) / ingreso mensual
• Carga proyectada = (deudas mensuales + renta/hipoteca + mensualidad estimada) / ingreso mensual
• Cómoda: ≤ 35% | Justa: 36%–40% | Apretada: > 40%

Criterios de viabilidad:
• Alta: carga proyectada ≤35%, enganche ≥20%, perfil estable, comprobación de ingresos.
• Media: carga 36%–40%, o perfil con alguna debilidad subsanable (enganche justo, comprobación parcial).
• Baja: carga >40%, o sin comprobación + historial malo, o enganche insuficiente sin flexibilidad.

Devuelve SIEMPRE y SOLO este formato (sin agregar texto antes ni después):

Resultado express
Viabilidad inicial: [Alta / Media / Baja]
Clasificación recomendada: [Banco / Financiera / Subprime]
Capacidad de pago estimada: [Alta / Media / Baja]
Nivel de carga financiera proyectada: [Cómoda / Justa / Apretada]
Por qué: [3–5 líneas máximo – lenguaje comercial, explica los factores clave]
Recomendaciones accionables:
- [acción concreta 1]
- [acción concreta 2]
- [acción concreta 3, si aplica]
Qué debe decir el vendedor al cliente: ["frase natural entre comillas que el vendedor puede copiar-pegar"]
Advertencia comercial: [frase corta SOLO si el caso es Media/Baja o Apretada – si no, poner "Ninguna en este momento"]`;

  // --- Mensaje de usuario: los datos concretos del caso ---
  const precioNum = Number(precioAuto) || 0;
  const engancheNum = Number(enganche) || 0;
  const pctEnganche = precioNum > 0 ? ((engancheNum / precioNum) * 100).toFixed(1) : 'N/D';

  const userMessage = `Analiza este caso con el perfilador express:

Ocupación: ${ocupacion}
Antigüedad laboral o en actividad: ${antiguedad} años
Ingreso mensual aproximado: ${formatMXN(ingresoMensual)}
Comprueba ingresos: ${labelComprobacion(compruebaIngresos)}
Tipo de domicilio: ${tipoDomicilio}
Historial crediticio percibido (referencial): ${historialCrediticio}
Deudas mensuales aproximadas: ${formatMXN(deudasMensuales)}
Renta o hipoteca mensual: ${formatMXN(rentaHipoteca)}
Número de dependientes económicos: ${numDependientes}
Precio aproximado del auto: ${formatMXN(precioAuto)}
Año modelo: ${anioModelo}
Tipo de unidad: ${tipoUnidad}
Enganche disponible: ${formatMXN(enganche)} (${pctEnganche}% del precio)
Mensualidad que busca: ${formatMXN(mensualidadBuscada)}
Plazo deseado: ${plazoDeseado} meses
¿Acepta ajustar unidad o monto?: ${labelAcepta(aceptaAjustar)}`;

  return { systemPrompt, userMessage };
}
