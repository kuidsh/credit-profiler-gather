/**
 * usePerfilador.js
 * Hook personalizado que orquesta la llamada al servidor proxy local.
 *
 * Flujo:
 * 1. Lee las 13 variables del WizardContext
 * 2. Construye el prompt con promptBuilder
 * 3. Llama al proxy local en /api/analyze (Vite reenvía a localhost:3001)
 * 4. El servidor proxy reenvía la solicitud a DeepSeek y devuelve { text }
 * 5. Parsea la respuesta con responseParser
 * 6. Guarda el resultado (o el error) en WizardContext
 * 7. Expone { isLoading, error, triggerAnalysis }
 *
 * No se maneja API key en el frontend — eso es responsabilidad del servidor.
 * Timeout en el frontend: 27 s (2 s más que el timeout del servidor de 25 s).
 */

import { useCallback } from 'react';
import { useWizard }   from '../context/WizardContext';
import { buildPrompt } from '../utils/promptBuilder';
import { parseResponse } from '../utils/responseParser';

// Endpoint del servidor de análisis.
//
// Modo dual:
//   - Desarrollo local: VITE_API_URL no está definida, así que se usa '/api/analyze'.
//     Vite reenvía /api → localhost:3001 (servidor proxy Express en server/index.cjs).
//   - Producción (AWS Amplify + Lambda): configura la variable de entorno
//     VITE_API_URL=https://[api-gateway-id].execute-api.[region].amazonaws.com/[stage]
//     en las variables de entorno de la app de Amplify. El frontend concatena
//     '/api/analyze' al final para formar la URL completa del endpoint de Lambda.
const API_URL = (import.meta.env.VITE_API_URL || '') + '/api/analyze';

// Timeout en el frontend: ligeramente mayor que el timeout del servidor (25 s)
// para que el servidor pueda responder con su propio mensaje de error antes
// de que el AbortController del cliente cancele la conexión.
const TIMEOUT_MS = 27_000;

/**
 * Realiza fetch con timeout usando AbortController.
 * Si el fetch tarda más de timeoutMs, lanza un error de tipo 'timeout'.
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

/**
 * usePerfilador
 * Devuelve { triggerAnalysis } — una función que ejecuta el análisis completo.
 * El estado (isLoading, error, resultado) vive en WizardContext y se actualiza aquí.
 */
export function usePerfilador() {
  const { wizardData, setIsLoading, setError, setResultado } = useWizard();

  /**
   * triggerAnalysis
   * Construye prompt → llama Claude → parsea → guarda resultado.
   * Maneja errores de red, timeout y parseo de forma amigable.
   *
   * @param {object|null} dataOverride - Cuando se pasa, se usa en lugar de wizardData
   *   del contexto. Necesario en Step3 para evitar la race condition donde useReducer
   *   aún no ha comprometido el nuevo estado al momento en que se ejecuta esta función.
   */
  const triggerAnalysis = useCallback(async (dataOverride = null) => {
    // Usar dataOverride si se provee; de lo contrario leer del contexto
    const data = dataOverride || wizardData;

    // Limpiar estado previo
    setError(null);
    setResultado(null);
    setIsLoading(true);

    try {
      // 1. Construir prompt con las 13 variables del wizard
      const { systemPrompt, userMessage } = buildPrompt(data);

      // 2. Llamar al servidor proxy local con fetch + timeout
      //    El servidor maneja la API key y la comunicación con DeepSeek.
      //    No se envían claves ni headers sensibles desde el navegador.
      const response = await fetchWithTimeout(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ systemPrompt, userMessage }),
        },
        TIMEOUT_MS
      );

      // 3. Verificar respuesta HTTP del proxy
      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          throw new Error('rate_limit');
        } else if (status >= 500) {
          throw new Error('server_error');
        } else {
          throw new Error(`api_error_${status}`);
        }
      }

      // 4. Extraer texto de la respuesta del proxy: { text: string }
      const responseData = await response.json();
      if (responseData.error) {
        // El proxy devolvió un error explícito con HTTP 2xx (no debería ocurrir,
        // pero se maneja por si acaso)
        throw new Error('server_error');
      }
      const rawText = responseData.text ?? '';

      if (!rawText) {
        throw new Error('empty_response');
      }

      // 6. Parsear respuesta con responseParser
      const resultado = parseResponse(rawText);

      if (!resultado) {
        // Respuesta malformada: Claude no siguió el formato
        throw new Error('parse_error');
      }

      // 7. Guardar resultado en el contexto → Step4 reaccionará
      setResultado(resultado);

    } catch (err) {
      console.error('[usePerfilador] Error:', err);
      // Traducir el error técnico a un mensaje amigable en español
      let mensajeError;

      switch (err.message) {
        case 'timeout':
          mensajeError = 'El análisis tardó demasiado. Verifica tu conexión y vuelve a intentarlo.';
          break;
        case 'rate_limit':
          mensajeError = 'Demasiadas consultas en poco tiempo. Espera un momento y vuelve a intentarlo.';
          break;
        case 'server_error':
          mensajeError = 'El servicio de análisis no está disponible en este momento. Intenta de nuevo en unos segundos.';
          break;
        case 'parse_error':
          mensajeError = 'Responde con formato inválido. Por favor intenta de nuevo con los datos exactos.';
          break;
        case 'empty_response':
          mensajeError = 'No se recibió respuesta del analizador. Verifica los datos e intenta de nuevo.';
          break;
        default:
          mensajeError = 'Ocurrió un error al analizar el perfil. Verifica tu conexión e intenta de nuevo.';
      }

      setError(mensajeError);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, setIsLoading, setError, setResultado]);

  return { triggerAnalysis };
}
