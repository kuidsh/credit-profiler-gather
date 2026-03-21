/**
 * lambda/index.mjs
 * Handler de AWS Lambda para el Perfilador Express de Crédito Automotriz.
 *
 * Entorno esperado:
 *   - Runtime: Node.js 18.x o 20.x
 *   - Variable de entorno: DEEPSEEK_API_KEY
 *   - Integración: Lambda Proxy Integration desde API Gateway
 *
 * Contrato de entrada (body JSON):
 *   { systemPrompt: string, userMessage: string }
 *
 * Contrato de salida (200 OK):
 *   { text: string }
 *
 * Errores:
 *   { error: string }  con statusCode apropiado
 */

// URL del endpoint de DeepSeek (interfaz compatible con OpenAI)
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Timeout máximo para la llamada a DeepSeek (ms)
const DEEPSEEK_TIMEOUT_MS = 25_000;

// ---------------------------------------------------------------------------
// Cabeceras CORS — se incluyen en TODAS las respuestas (incluso errores)
// para que el navegador no bloquee la respuesta antes de que el frontend
// pueda leer el mensaje de error.
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

/**
 * Construye una respuesta con el formato de Lambda Proxy Integration.
 *
 * @param {number} statusCode  - Código HTTP de la respuesta
 * @param {object} body        - Objeto que se serializa como JSON
 * @returns {object}           - Objeto de respuesta de Lambda
 */
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Realiza un fetch con timeout usando AbortController.
 * Node 18+ incluye fetch nativo — no se necesitan dependencias externas.
 *
 * @param {string} url         - URL de destino
 * @param {object} options     - Opciones de fetch (method, headers, body)
 * @param {number} timeoutMs   - Tiempo máximo de espera en milisegundos
 * @returns {Promise<Response>}
 * @throws {Error} con message 'timeout' si se agota el tiempo
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Handler principal de Lambda
// ---------------------------------------------------------------------------

/**
 * handler
 * Punto de entrada de AWS Lambda con Lambda Proxy Integration.
 *
 * @param {object} event   - Evento de API Gateway (Lambda Proxy Integration)
 * @returns {object}       - Respuesta en formato Lambda Proxy
 */
export const handler = async (event) => {
  const timestamp = new Date().toISOString();
  const method = event.httpMethod ?? event.requestContext?.http?.method ?? 'UNKNOWN';

  console.log(`[${timestamp}] ${method} /api/analyze - requestId: ${event.requestContext?.requestId ?? 'n/a'}`);

  // -------------------------------------------------------------------------
  // Manejo de preflight OPTIONS (CORS)
  // El navegador envía OPTIONS antes de cada POST cross-origin.
  // API Gateway puede manejarlo automáticamente, pero lo cubrimos aquí
  // por si la integración CORS del gateway no está habilitada.
  // -------------------------------------------------------------------------
  if (method === 'OPTIONS') {
    console.log(`[${timestamp}] Preflight OPTIONS — respondiendo con 200`);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // -------------------------------------------------------------------------
  // Validar método HTTP
  // -------------------------------------------------------------------------
  if (method !== 'POST') {
    return buildResponse(405, { error: 'Método no permitido. Solo se acepta POST.' });
  }

  // -------------------------------------------------------------------------
  // Leer y validar la API key desde variables de entorno de Lambda
  // -------------------------------------------------------------------------
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    console.error(`[${timestamp}] DEEPSEEK_API_KEY no está configurada en las variables de entorno de Lambda`);
    return buildResponse(500, {
      error: 'El servidor no tiene configurada la clave de API. Contacta al administrador.',
    });
  }

  // -------------------------------------------------------------------------
  // Parsear el body de la solicitud
  // En Lambda Proxy Integration el body llega como string (posiblemente base64)
  // -------------------------------------------------------------------------
  let systemPrompt, userMessage;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
      : (event.body ?? '');

    const parsed = JSON.parse(rawBody);
    systemPrompt = parsed.systemPrompt;
    userMessage  = parsed.userMessage;
  } catch {
    console.error(`[${timestamp}] Body inválido o no es JSON`);
    return buildResponse(400, {
      error: 'Solicitud inválida: el body debe ser JSON con systemPrompt y userMessage.',
    });
  }

  if (!systemPrompt || !userMessage) {
    console.error(`[${timestamp}] Faltan campos requeridos: systemPrompt=${!!systemPrompt}, userMessage=${!!userMessage}`);
    return buildResponse(400, {
      error: 'Solicitud inválida: se requieren systemPrompt y userMessage.',
    });
  }

  // -------------------------------------------------------------------------
  // Llamar a DeepSeek API
  // -------------------------------------------------------------------------
  try {
    const deepseekBody = {
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    };

    console.log(`[${timestamp}] Enviando solicitud a DeepSeek... (timeout: ${DEEPSEEK_TIMEOUT_MS}ms)`);

    const deepseekResponse = await fetchWithTimeout(
      DEEPSEEK_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(deepseekBody),
      },
      DEEPSEEK_TIMEOUT_MS
    );

    // Manejar errores HTTP de DeepSeek
    if (!deepseekResponse.ok) {
      const status = deepseekResponse.status;
      console.error(`[${timestamp}] DeepSeek respondió con HTTP ${status}`);

      if (status === 401 || status === 403) {
        return buildResponse(500, {
          error: 'Clave de API inválida o sin permisos. Contacta al administrador.',
        });
      } else if (status === 429) {
        return buildResponse(429, { error: 'rate_limit' });
      } else if (status >= 500) {
        return buildResponse(502, { error: 'server_error' });
      } else {
        return buildResponse(502, { error: `api_error_${status}` });
      }
    }

    // Extraer texto de la respuesta de DeepSeek
    const data = await deepseekResponse.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    if (!text) {
      console.error(`[${timestamp}] DeepSeek devolvió respuesta vacía`);
      return buildResponse(502, { error: 'empty_response' });
    }

    console.log(`[${timestamp}] Respuesta de DeepSeek recibida correctamente (${text.length} caracteres)`);

    // Devolver texto al frontend
    return buildResponse(200, { text });

  } catch (err) {
    if (err.message === 'timeout') {
      console.error(`[${timestamp}] Timeout esperando respuesta de DeepSeek (>${DEEPSEEK_TIMEOUT_MS}ms)`);
      return buildResponse(504, { error: 'timeout' });
    }

    console.error(`[${timestamp}] Error inesperado:`, err);
    return buildResponse(500, { error: 'server_error' });
  }
};
