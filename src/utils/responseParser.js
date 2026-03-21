/**
 * responseParser.js
 * Parsea la respuesta en texto plano de Claude y la convierte en un objeto JS
 * con los 9 campos estructurados del Resultado Express.
 *
 * Claude debe devolver exactamente este formato (ver docs/03-prompts-claude.md):
 *
 *   Resultado express
 *   Viabilidad inicial: [valor]
 *   Tipo de perfil: [valor]
 *   Capacidad de pago estimada: [valor]
 *   Nivel de carga financiera estimada: [valor]
 *   Ruta sugerida: [valor]
 *   Por qué: [texto multilínea]
 *   Ajuste sugerido antes de ingresar: [texto]
 *   Qué debe decir el vendedor al cliente: ["frase"]
 *   Advertencia comercial: [texto o "Ninguna en este momento"]
 */

/**
 * @typedef {Object} ResultadoExpress
 * @property {string} viabilidadInicial         - "Alta" | "Media" | "Baja"
 * @property {string} tipoPerfil                - "Tradicional" | "Tradicional con ajustes" | "Flexible" | "Alternativo" | "Delicado"
 * @property {string} capacidadPago             - "Alta" | "Media" | "Baja"
 * @property {string} cargaFinanciera           - "Cómoda" | "Justa" | "Apretada"
 * @property {string} rutaSugerida
 * @property {string} porQue
 * @property {string} ajusteSugerido
 * @property {string} fraseVendedor
 * @property {string} advertenciaComercial
 */

/**
 * Lista de campos que se extraen línea por línea.
 * El orden importa: los campos multilínea (porQue) se acumulan
 * hasta que aparece el siguiente campo conocido.
 *
 * Cada entrada: { key, label, multiline }
 * - key: nombre del campo en el objeto resultado
 * - label: prefijo exacto que Claude usa en su respuesta (sin ":")
 * - multiline: si puede ocupar más de una línea de texto
 */
const FIELD_DEFINITIONS = [
  { key: 'viabilidadInicial',   label: 'Viabilidad inicial',                multiline: false },
  { key: 'tipoPerfil',          label: 'Tipo de perfil',                    multiline: false },
  { key: 'capacidadPago',       label: 'Capacidad de pago estimada',        multiline: false },
  { key: 'cargaFinanciera',     label: 'Nivel de carga financiera estimada',multiline: false },
  { key: 'rutaSugerida',        label: 'Ruta sugerida',                     multiline: false },
  { key: 'porQue',              label: 'Por qué',                           multiline: true  },
  { key: 'ajusteSugerido',      label: 'Ajuste sugerido antes de ingresar', multiline: true  },
  { key: 'fraseVendedor',       label: 'Qué debe decir el vendedor al cliente', multiline: true },
  { key: 'advertenciaComercial',label: 'Advertencia comercial',             multiline: true  },
];

/**
 * Construye un mapa label → fieldDef para búsqueda rápida.
 * Normaliza los labels a minúsculas y sin acentos para comparación robusta.
 */
function normalizeLabel(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // elimina diacríticos
}

const NORMALIZED_LABELS = FIELD_DEFINITIONS.map((fd) => ({
  ...fd,
  normalizedLabel: normalizeLabel(fd.label),
}));

/**
 * Intenta hacer match de una línea con algún campo conocido.
 * Devuelve { fieldDef, value } si hay match, o null si no.
 *
 * Acepta variaciones en mayúsculas y accentuación.
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
 * Claude suele envolver la frase en comillas dobles o tipográficas.
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
    .filter((l) => l.length > 0); // descarta líneas vacías para la iteración

  // Estado del parseo
  const result = {};
  let currentFieldKey = null; // campo que está recibiendo líneas acumuladas
  let accumulator = [];       // líneas acumuladas para campo multilínea

  /**
   * Guarda el acumulador en el campo actual antes de cambiar de campo.
   */
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
      // Guardar campo previo si estaba acumulando
      flushAccumulator();

      const { fieldDef, value } = match;
      currentFieldKey = fieldDef.key;

      if (fieldDef.multiline) {
        // Inicia acumulación; el valor de esta misma línea va al acumulador
        accumulator = value ? [value] : [];
      } else {
        // Campo de una sola línea: asignar directamente
        result[fieldDef.key] = value;
        currentFieldKey = null;
      }
    } else {
      // Línea sin prefijo conocido: se acumula al campo multilínea actual
      if (currentFieldKey) {
        accumulator.push(line);
      }
      // Si no hay campo activo, ignoramos la línea (texto extra de Claude)
    }
  }

  // Guardar el último campo acumulado
  flushAccumulator();

  // Limpiar comillas de la frase del vendedor si está presente
  if (result.fraseVendedor) {
    result.fraseVendedor = cleanQuotes(result.fraseVendedor);
  }

  // Validar que al menos los campos obligatorios esenciales estén presentes
  const REQUIRED_KEYS = [
    'viabilidadInicial',
    'tipoPerfil',
    'capacidadPago',
    'cargaFinanciera',
    'rutaSugerida',
    'porQue',
    'fraseVendedor',
  ];

  const missingKeys = REQUIRED_KEYS.filter((k) => !result[k] || result[k].trim() === '');
  if (missingKeys.length > 0) {
    // Respuesta incompleta → devolver null para activar fallback
    return null;
  }

  return {
    viabilidadInicial:    result.viabilidadInicial    || '',
    tipoPerfil:           result.tipoPerfil           || '',
    capacidadPago:        result.capacidadPago        || '',
    cargaFinanciera:      result.cargaFinanciera      || '',
    rutaSugerida:         result.rutaSugerida         || '',
    porQue:               result.porQue               || '',
    ajusteSugerido:       result.ajusteSugerido       || '',
    fraseVendedor:        result.fraseVendedor        || '',
    advertenciaComercial: result.advertenciaComercial || 'Ninguna en este momento',
  };
}
