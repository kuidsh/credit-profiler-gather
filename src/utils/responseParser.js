/**
 * responseParser.js
 * Parsea la respuesta en texto plano de Claude y la convierte en un objeto JS
 * con los campos estructurados del Resultado Express actualizado.
 *
 * Formato esperado (upgrade_1):
 *
 *   Resultado express
 *   Viabilidad inicial: [valor]
 *   Clasificación recomendada: [Banco / Financiera / Subprime]
 *   Capacidad de pago estimada: [valor]
 *   Nivel de carga financiera proyectada: [valor]
 *   Por qué: [texto multilínea]
 *   Recomendaciones accionables:
 *   - [bullet 1]
 *   - [bullet 2]
 *   Qué debe decir el vendedor al cliente: ["frase"]
 *   Advertencia comercial: [texto o "Ninguna en este momento"]
 */

/**
 * @typedef {Object} ResultadoExpress
 * @property {string} viabilidadInicial           - "Alta" | "Media" | "Baja"
 * @property {string} clasificacionRecomendada    - "Banco" | "Financiera" | "Subprime"
 * @property {string} capacidadPago               - "Alta" | "Media" | "Baja"
 * @property {string} cargaFinanciera             - "Cómoda" | "Justa" | "Apretada"
 * @property {string} porQue
 * @property {string} recomendacionesAccionables  - bullets separados por \n
 * @property {string} fraseVendedor
 * @property {string} advertenciaComercial
 */

/**
 * Lista de campos que se extraen línea por línea.
 * Cada entrada: { key, label, multiline }
 * - key: nombre del campo en el objeto resultado
 * - label: prefijo exacto que Claude usa (sin ":")
 * - multiline: si puede ocupar más de una línea de texto
 */
const FIELD_DEFINITIONS = [
  { key: 'viabilidadInicial',         label: 'Viabilidad inicial',                    multiline: false },
  { key: 'clasificacionRecomendada',  label: 'Clasificación recomendada',             multiline: false },
  { key: 'capacidadPago',             label: 'Capacidad de pago estimada',            multiline: false },
  { key: 'cargaFinanciera',           label: 'Nivel de carga financiera proyectada',  multiline: false },
  { key: 'porQue',                    label: 'Por qué',                               multiline: true  },
  { key: 'recomendacionesAccionables',label: 'Recomendaciones accionables',           multiline: true  },
  { key: 'fraseVendedor',             label: 'Qué debe decir el vendedor al cliente', multiline: true  },
  { key: 'advertenciaComercial',      label: 'Advertencia comercial',                multiline: true  },
];

/**
 * Normaliza un string a minúsculas sin acentos para comparación robusta.
 */
function normalizeLabel(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const NORMALIZED_LABELS = FIELD_DEFINITIONS.map((fd) => ({
  ...fd,
  normalizedLabel: normalizeLabel(fd.label),
}));

/**
 * Intenta hacer match de una línea con algún campo conocido.
 * Devuelve { fieldDef, value } si hay match, o null si no.
 */
function matchFieldLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;

  const rawLabel = line.slice(0, colonIdx).trim();
  const value    = line.slice(colonIdx + 1).trim();
  const normRaw  = normalizeLabel(rawLabel);

  for (const fd of NORMALIZED_LABELS) {
    if (normRaw === fd.normalizedLabel) {
      return { fieldDef: fd, value };
    }
  }
  return null;
}

/**
 * Limpia comillas de apertura/cierre de la frase del vendedor.
 */
function cleanQuotes(str) {
  return str
    .replace(/^["«"„]/, '')
    .replace(/["»""']$/, '')
    .trim();
}

/**
 * parseResponse
 * Parsea el texto plano devuelto por Claude en un objeto ResultadoExpress.
 *
 * @param {string} rawText - Texto completo de la respuesta de Claude
 * @returns {ResultadoExpress|null} - null si el parseo falla (respuesta malformada)
 */
export function parseResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result = {};
  let currentFieldKey = null;
  let accumulator = [];

  function flushAccumulator() {
    if (currentFieldKey && accumulator.length > 0) {
      result[currentFieldKey] = accumulator.join('\n').trim();
      accumulator = [];
    }
  }

  for (const line of lines) {
    // Ignorar la línea de encabezado "Resultado express"
    if (normalizeLabel(line) === 'resultado express') continue;

    const match = matchFieldLine(line);

    if (match) {
      flushAccumulator();

      const { fieldDef, value } = match;
      currentFieldKey = fieldDef.key;

      if (fieldDef.multiline) {
        accumulator = value ? [value] : [];
      } else {
        result[fieldDef.key] = value;
        currentFieldKey = null;
      }
    } else {
      // Línea sin prefijo conocido: se acumula al campo multilínea actual
      if (currentFieldKey) {
        accumulator.push(line);
      }
    }
  }

  flushAccumulator();

  // Limpiar comillas de la frase del vendedor si está presente
  if (result.fraseVendedor) {
    result.fraseVendedor = cleanQuotes(result.fraseVendedor);
  }

  // Validar campos obligatorios esenciales
  const REQUIRED_KEYS = [
    'viabilidadInicial',
    'clasificacionRecomendada',
    'capacidadPago',
    'cargaFinanciera',
    'porQue',
    'fraseVendedor',
  ];

  const missingKeys = REQUIRED_KEYS.filter((k) => !result[k] || result[k].trim() === '');
  if (missingKeys.length > 0) {
    return null;
  }

  return {
    viabilidadInicial:          result.viabilidadInicial          || '',
    clasificacionRecomendada:   result.clasificacionRecomendada   || '',
    capacidadPago:              result.capacidadPago              || '',
    cargaFinanciera:            result.cargaFinanciera            || '',
    porQue:                     result.porQue                     || '',
    recomendacionesAccionables: result.recomendacionesAccionables || '',
    fraseVendedor:              result.fraseVendedor              || '',
    advertenciaComercial:       result.advertenciaComercial       || 'Ninguna en este momento',
  };
}
