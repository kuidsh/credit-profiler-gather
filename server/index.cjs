/**
 * server/index.cjs
 * Servidor proxy Express que reenvía solicitudes al API de DeepSeek.
 *
 * Uso: node server/index.cjs
 * Puerto: 3001 (Vite en :5173 hace proxy de /api → localhost:3001)
 *
 * Usa CommonJS (require) porque package.json tiene "type":"module",
 * lo que haría que los archivos .js normales se traten como ESM.
 * El sufijo .cjs fuerza a Node a interpretarlo como CommonJS.
 */

'use strict';

const express = require('express');
const path    = require('path');

// Cargar variables de entorno desde .env.local en la raíz del proyecto
// (un nivel arriba de /server/)
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
});

const app  = express();
const PORT = 3001;

// Tiempo máximo de espera para la llamada a DeepSeek (ms)
const DEEPSEEK_TIMEOUT_MS = 25_000;

// URL del endpoint de DeepSeek (compatible con interfaz OpenAI)
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Parsear cuerpo JSON de las solicitudes entrantes
app.use(express.json());

// CORS: permitir solicitudes desde el servidor de desarrollo de Vite
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder al preflight OPTIONS directamente
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ---------------------------------------------------------------------------
// Utilidad: fetch con timeout usando AbortController (Node 18+ tiene fetch nativo)
// ---------------------------------------------------------------------------
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
// POST /api/analyze
// Recibe: { systemPrompt: string, userMessage: string }
// Devuelve: { text: string } | { error: string }
// ---------------------------------------------------------------------------
app.post('/api/analyze', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] POST /api/analyze`);

  // Validar que la API key esté configurada
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    console.error(`[${timestamp}] DEEPSEEK_API_KEY no configurada o usando valor de ejemplo`);
    return res.status(500).json({
      error: 'El servidor no tiene configurada la clave de API. Contacta al administrador.',
    });
  }

  // Validar cuerpo de la solicitud
  const { systemPrompt, userMessage } = req.body ?? {};
  if (!systemPrompt || !userMessage) {
    return res.status(400).json({
      error: 'Solicitud inválida: se requieren systemPrompt y userMessage.',
    });
  }

  try {
    // Construir cuerpo para DeepSeek (interfaz compatible con OpenAI)
    const deepseekBody = {
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    };

    console.log(`[${timestamp}] Enviando solicitud a DeepSeek...`);

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

      if (status === 429) {
        return res.status(429).json({ error: 'rate_limit' });
      } else if (status >= 500) {
        return res.status(502).json({ error: 'server_error' });
      } else {
        return res.status(502).json({ error: `api_error_${status}` });
      }
    }

    // Extraer texto de la respuesta
    const data = await deepseekResponse.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    if (!text) {
      console.error(`[${timestamp}] DeepSeek devolvió respuesta vacía`);
      return res.status(502).json({ error: 'empty_response' });
    }

    console.log(`[${timestamp}] Respuesta recibida de DeepSeek (${text.length} caracteres)`);

    // Devolver texto al frontend
    return res.json({ text });

  } catch (err) {
    if (err.message === 'timeout') {
      console.error(`[${timestamp}] Timeout esperando respuesta de DeepSeek`);
      return res.status(504).json({ error: 'timeout' });
    }

    console.error(`[${timestamp}] Error inesperado:`, err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// Iniciar servidor
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[Perfilador] Servidor proxy escuchando en http://localhost:${PORT}`);
  console.log(`[Perfilador] Proxy de Vite: /api → http://localhost:${PORT}`);
});
