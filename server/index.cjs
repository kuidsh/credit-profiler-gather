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
const prisma  = require('./db/client.cjs');

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
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
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
// POST /api/guardar-contacto
// Crea o actualiza (UPSERT por perfilId) el registro en datos_personales_paso5
// con los datos del sub-paso 1 (Contacto). Marca paso5ContactoGuardado = true
// en sesiones_wizard.
//
// Body: { sesionId, perfilId, nombres, apellidoPaterno, apellidoMaterno?, telefonoCelular }
// Response: { ok: true, datosPersonalesId: string }
// ---------------------------------------------------------------------------
app.post('/api/guardar-contacto', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] POST /api/guardar-contacto`);

  const {
    sesionId,
    perfilId,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    telefonoCelular,
  } = req.body ?? {};

  if (!sesionId || !perfilId || !nombres || !apellidoPaterno || !telefonoCelular) {
    return res.status(400).json({
      ok: false,
      error: 'Se requieren sesionId, perfilId, nombres, apellidoPaterno y telefonoCelular.',
    });
  }

  try {
    // Verificar duplicado de teléfono en un perfil diferente
    const telefonoDuplicado = await prisma.datosPersonalesPaso5.findFirst({
      where: {
        telefonoCelular,
        perfilId: { not: perfilId },
      },
      select: { id: true },
    });
    if (telefonoDuplicado) {
      console.log(`[${timestamp}] Telefono duplicado: ${telefonoCelular} ya existe para otro perfil`);
      return res.status(409).json({
        ok: false,
        error: 'duplicate_phone',
        message: 'Ya existe un cliente registrado con este número de teléfono.',
      });
    }

    const datosPersonales = await prisma.datosPersonalesPaso5.upsert({
      where: { perfilId },
      create: {
        perfilId,
        nombres,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno ?? null,
        telefonoCelular,
        subPasoCompletado: 1,
        completado: false,
      },
      update: {
        nombres,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno ?? null,
        telefonoCelular,
        subPasoCompletado: 1,
      },
      select: { id: true },
    });

    await prisma.sesionWizard.update({
      where: { id: sesionId },
      data: { paso5ContactoGuardado: true },
    });

    return res.json({ ok: true, datosPersonalesId: datosPersonales.id });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/guardar-contacto:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/guardar-perfil/:sesionId
// Actualiza datos_personales_paso5 con los campos de sub-pasos 2 y 3.
// Marca paso5Completado = true en sesiones_wizard y completado = true en
// datos_personales_paso5.
//
// Params: sesionId (URL param)
// Body:   { perfilId, ...camposSub2, ...camposSub3 }
// Response: { ok: true }
// ---------------------------------------------------------------------------
app.put('/api/guardar-perfil/:sesionId', async (req, res) => {
  const timestamp = new Date().toISOString();
  const { sesionId } = req.params;
  console.log(`[${timestamp}] PUT /api/guardar-perfil/${sesionId}`);

  const {
    perfilId,
    // Sub-paso 2 — Identificación
    fechaNacimiento,
    rfc,
    curp,
    genero,
    estadoCivil,
    correoElectronico,
    telefonoCasaTrabajo,
    // Sub-paso 3 — Domicilio
    calle,
    numeroExterior,
    numeroInterior,
    colonia,
    municipioDelegacion,
    estadoRepublica,
    codigoPostal,
    tipoDomicilioPaso5,
    tiempoEnDomicilio,
  } = req.body ?? {};

  if (!sesionId || !perfilId) {
    return res.status(400).json({
      ok: false,
      error: 'Se requieren sesionId (URL) y perfilId (body).',
    });
  }

  try {
    // Verificar duplicado de correo electrónico en un perfil diferente
    if (correoElectronico) {
      const correoDuplicado = await prisma.datosPersonalesPaso5.findFirst({
        where: {
          correoElectronico,
          perfilId: { not: perfilId },
        },
        select: { id: true },
      });
      if (correoDuplicado) {
        console.log(`[${timestamp}] Correo duplicado: ${correoElectronico} ya existe para otro perfil`);
        return res.status(409).json({
          ok: false,
          error: 'duplicate_email',
          message: 'Ya existe un cliente registrado con este correo electrónico.',
        });
      }
    }

    await prisma.datosPersonalesPaso5.update({
      where: { perfilId },
      data: {
        // Sub-paso 2
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        rfc:                  rfc                  ?? null,
        curp:                 curp                 ?? null,
        genero:               genero               ?? null,
        estadoCivil:          estadoCivil          ?? null,
        correoElectronico:    correoElectronico    ?? null,
        telefonoCasaTrabajo:  telefonoCasaTrabajo  ?? null,
        // Sub-paso 3
        calle:               calle               ?? null,
        numeroExterior:      numeroExterior      ?? null,
        numeroInterior:      numeroInterior      ?? null,
        colonia:             colonia             ?? null,
        municipioDelegacion: municipioDelegacion ?? null,
        estadoRepublica:     estadoRepublica     ?? null,
        codigoPostal:        codigoPostal        ?? null,
        tipoDomicilioPaso5:  tipoDomicilioPaso5  ?? null,
        tiempoEnDomicilio:   tiempoEnDomicilio   ?? null,
        subPasoCompletado: 3,
        completado: true,
      },
    });

    await prisma.sesionWizard.update({
      where: { id: sesionId },
      data: { paso5Completado: true },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/guardar-perfil/${sesionId}:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clientes/recientes
// Devuelve los 10 registros más recientes de datos_personales_paso5
// (solo registros con nombres y telefonoCelular no nulos), con join a
// perfiles_completos para incluir clasificacionRecomendada.
// Response: { ok: true, clientes: [...] }
// ---------------------------------------------------------------------------
app.get('/api/clientes/recientes', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GET /api/clientes/recientes`);

  try {
    const rows = await prisma.datosPersonalesPaso5.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 10,
      select: {
        id: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        telefonoCelular: true,
        creadoEn: true,
        perfil: { select: { clasificacionRecomendada: true } },
      },
    });

    const clientes = rows.map((r) => ({
      id: r.id,
      nombres: r.nombres,
      apellidoPaterno: r.apellidoPaterno,
      apellidoMaterno: r.apellidoMaterno,
      telefonoCelular: r.telefonoCelular,
      clasificacionRecomendada: r.perfil?.clasificacionRecomendada ?? null,
      creadoEn: r.creadoEn,
    }));

    return res.json({ ok: true, clientes });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/clientes/recientes:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clientes/:id
// Devuelve el registro completo de DatosPersonalesPaso5 por su id (UUID),
// incluyendo todos los campos necesarios para pre-llenar el mini-wizard de
// Step 5. También incluye clasificacionRecomendada desde PerfilCompleto.
//
// Params: id — DatosPersonalesPaso5.id (UUID)
// Response 200: { ok: true, cliente: { ...all fields } }
// Response 404: { ok: false, error: 'Cliente no encontrado.' }
// Response 500: { ok: false, error: 'server_error' }
// ---------------------------------------------------------------------------
app.get('/api/clientes/:id', async (req, res) => {
  const timestamp = new Date().toISOString();
  const { id } = req.params;
  console.log(`[${timestamp}] GET /api/clientes/${id}`);

  try {
    const r = await prisma.datosPersonalesPaso5.findUnique({
      where: { id },
      include: {
        perfil: { select: { clasificacionRecomendada: true } },
      },
    });

    if (!r) {
      return res.status(404).json({ ok: false, error: 'Cliente no encontrado.' });
    }

    const cliente = {
      id:                    r.id,
      perfilId:              r.perfilId,
      subPasoCompletado:     r.subPasoCompletado,
      completado:            r.completado,
      // Sub-paso 1 — Contacto
      nombres:               r.nombres,
      apellidoPaterno:       r.apellidoPaterno,
      apellidoMaterno:       r.apellidoMaterno,
      telefonoCelular:       r.telefonoCelular,
      // Sub-paso 2 — Identificación
      fechaNacimiento:       r.fechaNacimiento ? r.fechaNacimiento.toISOString() : null,
      rfc:                   r.rfc,
      curp:                  r.curp,
      genero:                r.genero,
      estadoCivil:           r.estadoCivil,
      correoElectronico:     r.correoElectronico,
      telefonoCasaTrabajo:   r.telefonoCasaTrabajo,
      // Sub-paso 3 — Domicilio
      calle:                 r.calle,
      numeroExterior:        r.numeroExterior,
      numeroInterior:        r.numeroInterior,
      colonia:               r.colonia,
      municipioDelegacion:   r.municipioDelegacion,
      estadoRepublica:       r.estadoRepublica,
      codigoPostal:          r.codigoPostal,
      tipoDomicilioPaso5:    r.tipoDomicilioPaso5,
      tiempoEnDomicilio:     r.tiempoEnDomicilio,
      // Meta
      creadoEn:              r.creadoEn,
      actualizadoEn:         r.actualizadoEn,
      // From relation
      clasificacionRecomendada: r.perfil?.clasificacionRecomendada ?? null,
    };

    return res.json({ ok: true, cliente });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/clientes/${id}:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clientes?telefono=XXXXXXXXXX
// Busca registros en datos_personales_paso5 por telefonoCelular exacto.
// Devuelve array de 0 o más coincidencias, ordenadas por creadoEn DESC.
// Response: { ok: true, clientes: [...] }
// ---------------------------------------------------------------------------
app.get('/api/clientes', async (req, res) => {
  const timestamp = new Date().toISOString();
  const telefono = req.query.telefono;
  console.log(`[${timestamp}] GET /api/clientes?telefono=${telefono ?? '(vacío)'}`);

  if (!telefono) {
    return res.status(400).json({ ok: false, error: 'Se requiere el parámetro telefono.' });
  }

  try {
    const rows = await prisma.datosPersonalesPaso5.findMany({
      where: { telefonoCelular: telefono },
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        telefonoCelular: true,
        creadoEn: true,
        perfil: { select: { clasificacionRecomendada: true } },
      },
    });

    const clientes = rows.map((r) => ({
      id: r.id,
      nombres: r.nombres,
      apellidoPaterno: r.apellidoPaterno,
      apellidoMaterno: r.apellidoMaterno,
      telefonoCelular: r.telefonoCelular,
      clasificacionRecomendada: r.perfil?.clasificacionRecomendada ?? null,
      creadoEn: r.creadoEn,
    }));

    return res.json({ ok: true, clientes });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/clientes:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iniciar-sesion
// Crea una SesionWizard en estado "borrador" con los datos del Step 1.
// Permite persistencia progresiva antes de llegar al Step 4 (LLM).
//
// Body: { ocupacion, antiguedad, ingresoMensual, compruebaIngresos, tipoDomicilio }
// Response: { ok: true, sesionId: string }
// ---------------------------------------------------------------------------
app.post('/api/iniciar-sesion', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] POST /api/iniciar-sesion`);

  const {
    ocupacion,
    antiguedad,
    ingresoMensual,
    compruebaIngresos,
    tipoDomicilio,
  } = req.body ?? {};

  if (!ocupacion || antiguedad === undefined || !ingresoMensual || !compruebaIngresos || !tipoDomicilio) {
    return res.status(400).json({
      ok: false,
      error: 'Se requieren ocupacion, antiguedad, ingresoMensual, compruebaIngresos y tipoDomicilio.',
    });
  }

  try {
    const datosWizardJson = JSON.stringify({
      ocupacion,
      antiguedad,
      ingresoMensual,
      compruebaIngresos,
      tipoDomicilio,
    });

    const sesion = await prisma.sesionWizard.create({
      data: {
        sesionToken:       generarSesionToken(),
        pasoActual:        1,
        fuentePersistencia: 'borrador',
        datosWizardJson,
      },
      select: { id: true },
    });

    console.log(`[${timestamp}] Sesion borrador ${sesion.id} creada (paso 1)`);
    return res.status(201).json({ ok: true, sesionId: sesion.id });
  } catch (err) {
    console.error(`[${timestamp}] Error en /api/iniciar-sesion:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/sesion/:sesionId
// Actualiza la sesión borrador con los datos del paso indicado (2 o 3).
// Hace merge del JSON existente con los nuevos datos para acumular
// progresivamente los campos del wizard.
//
// Params: sesionId (URL param)
// Body:   { paso: number, data: { ...campos del paso } }
// Response: { ok: true }
// ---------------------------------------------------------------------------
app.patch('/api/sesion/:sesionId', async (req, res) => {
  const timestamp = new Date().toISOString();
  const { sesionId } = req.params;
  console.log(`[${timestamp}] PATCH /api/sesion/${sesionId}`);

  const { paso, data } = req.body ?? {};

  if (!sesionId || !paso || !data || typeof data !== 'object') {
    return res.status(400).json({
      ok: false,
      error: 'Se requieren sesionId (URL), paso (body) y data (body, objeto).',
    });
  }

  try {
    const sesionActual = await prisma.sesionWizard.findUnique({
      where: { id: sesionId },
      select: { id: true, datosWizardJson: true },
    });

    if (!sesionActual) {
      return res.status(404).json({ ok: false, error: 'Sesion no encontrada.' });
    }

    let jsonExistente = {};
    try {
      jsonExistente = sesionActual.datosWizardJson
        ? JSON.parse(sesionActual.datosWizardJson)
        : {};
    } catch (_) {
      jsonExistente = {};
    }

    const datosWizardJson = JSON.stringify({ ...jsonExistente, ...data });

    await prisma.sesionWizard.update({
      where: { id: sesionId },
      data: {
        datosWizardJson,
        pasoActual: Number(paso),
      },
    });

    console.log(`[${timestamp}] Sesion ${sesionId} actualizada (paso ${paso})`);
    return res.json({ ok: true });
  } catch (err) {
    console.error(`[${timestamp}] Error en PATCH /api/sesion/${sesionId}:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// Funciones puras de anonimización para interacciones_anonimas
// ---------------------------------------------------------------------------

function calcularRangoIngresos(n) {
  const v = Number(n);
  if (v < 15000)  return '<15k';
  if (v < 25000)  return '15k-25k';
  if (v < 40000)  return '25k-40k';
  if (v < 60000)  return '40k-60k';
  return '60k+';
}

function calcularRangoEnganche(enganche, precioAuto) {
  const pct = (Number(enganche) / Number(precioAuto)) * 100;
  if (pct < 10)  return '<10%';
  if (pct < 20)  return '10-20%';
  if (pct < 30)  return '20-30%';
  return '30%+';
}

function calcularRangosAntiguedad(anios) {
  const v = Number(anios);
  if (v <= 1)  return '0-1 años';
  if (v <= 3)  return '1-3 años';
  if (v <= 5)  return '3-5 años';
  return '5+ años';
}

// Calcula % de carga financiera proyectada:
// (deudasMensuales + rentaHipoteca + mensualidadBuscada) / ingresoMensual * 100
function calcularPorcentajeCarga(deudasMensuales, rentaHipoteca, mensualidadBuscada, ingresoMensual) {
  const ingreso = Number(ingresoMensual);
  if (!ingreso) return 0;
  return ((Number(deudasMensuales) + Number(rentaHipoteca) + Number(mensualidadBuscada)) / ingreso) * 100;
}

// Genera un token de sesión aleatorio de 32 bytes (64 hex chars)
function generarSesionToken() {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// POST /api/guardar-sesion
// Persiste el resultado del wizard al completar el Step 4.
// La decisión de qué guardar se basa SIEMPRE en clasificacionRecomendada,
// nunca en el campo guardarCompleto enviado por el frontend.
//
// Body: { sesionId?: string, wizardData: {...16 campos}, resultado: {...resultado LLM} }
//   sesionId: si se envía, se actualiza la sesión borrador existente en lugar de crear una nueva
// Response: { ok: true, sesionId: string, perfilId: string | null }
// ---------------------------------------------------------------------------
app.post('/api/guardar-sesion', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] POST /api/guardar-sesion`);

  const { sesionId: sesionIdExistente, wizardData, resultado } = req.body ?? {};

  if (!wizardData || !resultado) {
    return res.status(400).json({
      ok: false,
      error: 'Se requieren wizardData y resultado.',
    });
  }

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
  } = wizardData;

  const {
    viabilidadInicial,
    clasificacionRecomendada,
    capacidadPago,
    cargaFinanciera: nivelCargaFinanciera,
    porQue,
    recomendacionesAccionables: recomendaciones,
    advertenciaComercial,
    fraseVendedor: fraseVendedorParsed,
  } = resultado;

  // Extraer fraseVendedor de cualquiera de las dos keys que el frontend pueda enviar
  const fraseVendedor = fraseVendedorParsed ?? resultado.fraseVendedor ?? resultado['quéDecirAlCliente'] ?? resultado.queDecirAlCliente ?? '';

  if (!viabilidadInicial || !clasificacionRecomendada || !nivelCargaFinanciera) {
    return res.status(400).json({
      ok: false,
      error: 'resultado debe incluir viabilidadInicial, clasificacionRecomendada y nivelCargaFinanciera.',
    });
  }

  // Regla de persistencia — fuente de verdad: clasificacionRecomendada (nunca el campo del body)
  const guardarCompleto = clasificacionRecomendada === 'Banco' || clasificacionRecomendada === 'Financiera';
  const fuentePersistencia = guardarCompleto ? 'completa' : 'anonima';

  try {
    if (guardarCompleto) {
      // ── Rama completa (Banco / Financiera) ────────────────────────────────
      // Transacción: SesionWizard + PerfilCompleto en una sola operación atómica
      const porcentajeCarga = calcularPorcentajeCarga(
        deudasMensuales,
        rentaHipoteca,
        mensualidadBuscada,
        ingresoMensual
      );

      const recomendacionesText = Array.isArray(recomendaciones)
        ? recomendaciones.join('\n')
        : String(recomendaciones ?? '');

      const [sesion, perfil] = await prisma.$transaction(async (tx) => {
        let nuevaSesion;
        if (sesionIdExistente) {
          nuevaSesion = await tx.sesionWizard.update({
            where: { id: sesionIdExistente },
            data: {
              guardarCompleto:         true,
              clasificacionRecomendada,
              viabilidadInicial,
              cargaFinanciera:         nivelCargaFinanciera,
              fuentePersistencia,
              pasoActual:              4,
              datosWizardJson:         null,
            },
            select: { id: true },
          });
        } else {
          nuevaSesion = await tx.sesionWizard.create({
            data: {
              sesionToken:             generarSesionToken(),
              guardarCompleto:         true,
              clasificacionRecomendada,
              viabilidadInicial,
              cargaFinanciera:         nivelCargaFinanciera,
              fuentePersistencia,
              pasoActual:              4,
            },
            select: { id: true },
          });
        }

        const nuevoPerfil = await tx.perfilCompleto.create({
          data: {
            sesionId: nuevaSesion.id,
            // Paso 1
            ocupacion:            String(ocupacion         ?? ''),
            antiguedad:           Number(antiguedad        ?? 0),
            ingresoMensual:       Number(ingresoMensual    ?? 0),
            compruebaIngresos:    String(compruebaIngresos ?? ''),
            tipoDomicilio:        String(tipoDomicilio     ?? ''),
            // Paso 2
            historialCrediticio:  String(historialCrediticio ?? ''),
            deudasMensuales:      Number(deudasMensuales     ?? 0),
            rentaHipoteca:        Number(rentaHipoteca       ?? 0),
            numDependientes:      Number(numDependientes     ?? 0),
            // Paso 3
            precioAuto:           Number(precioAuto          ?? 0),
            anioModelo:           Number(anioModelo          ?? 0),
            tipoUnidad:           String(tipoUnidad          ?? ''),
            enganche:             Number(enganche            ?? 0),
            mensualidadBuscada:   Number(mensualidadBuscada  ?? 0),
            plazoDeseado:         Number(plazoDeseado        ?? 0),
            aceptaAjustar:        Boolean(aceptaAjustar),
            // Resultado LLM
            viabilidadInicial,
            clasificacionRecomendada,
            capacidadPago:             String(capacidadPago        ?? ''),
            cargaFinanciera:           nivelCargaFinanciera,
            porQue:                    String(porQue               ?? ''),
            recomendacionesAccionables: recomendacionesText,
            fraseVendedor:             String(fraseVendedor        ?? ''),
            advertenciaComercial:      String(advertenciaComercial ?? ''),
            porcentajeCargaCalculado:  porcentajeCarga,
            resultadoLlmJson:          JSON.stringify(resultado),
          },
          select: { id: true },
        });

        return [nuevaSesion, nuevoPerfil];
      });

      console.log(`[${timestamp}] Sesion ${sesion.id} + Perfil ${perfil.id} creados (completo)`);
      return res.status(201).json({ ok: true, sesionId: sesion.id, perfilId: perfil.id });

    } else {
      // ── Rama anonima (Subprime) ────────────────────────────────────────────
      // Transacción: SesionWizard + InteraccionAnonima — sin PII, sin cifras exactas
      const [sesion, interaccion] = await prisma.$transaction(async (tx) => {
        let nuevaSesion;
        if (sesionIdExistente) {
          nuevaSesion = await tx.sesionWizard.update({
            where: { id: sesionIdExistente },
            data: {
              guardarCompleto:         false,
              clasificacionRecomendada,
              viabilidadInicial,
              cargaFinanciera:         nivelCargaFinanciera,
              fuentePersistencia,
              pasoActual:              4,
              datosWizardJson:         null,
            },
            select: { id: true },
          });
        } else {
          nuevaSesion = await tx.sesionWizard.create({
            data: {
              sesionToken:             generarSesionToken(),
              guardarCompleto:         false,
              clasificacionRecomendada,
              viabilidadInicial,
              cargaFinanciera:         nivelCargaFinanciera,
              fuentePersistencia,
              pasoActual:              4,
            },
            select: { id: true },
          });
        }

        const nuevaInteraccion = await tx.interaccionAnonima.create({
          data: {
            sesionId:           nuevaSesion.id,
            // Campos categóricos — sin PII, sin cifras financieras exactas
            ocupacion:          String(ocupacion           ?? ''),
            rangosAntiguedad:   calcularRangosAntiguedad(antiguedad),
            compruebaIngresos:  String(compruebaIngresos   ?? ''),
            tipoDomicilio:      String(tipoDomicilio       ?? ''),
            historialCrediticio: String(historialCrediticio ?? ''),
            numDependientes:    Number(numDependientes     ?? 0),
            anioModelo:         Number(anioModelo          ?? 0),
            tipoUnidad:         String(tipoUnidad          ?? ''),
            plazoDeseado:       Number(plazoDeseado        ?? 0),
            aceptaAjustar:      Boolean(aceptaAjustar),
            // Rangos calculados (nunca valores exactos)
            rangoIngresos:      calcularRangoIngresos(ingresoMensual),
            rangoEnganche:      calcularRangoEnganche(enganche, precioAuto),
            // Resultado LLM
            viabilidadInicial,
            clasificacionRecomendada,
            capacidadPago:      String(capacidadPago   ?? ''),
            cargaFinanciera:    nivelCargaFinanciera,
          },
          select: { id: true },
        });

        return [nuevaSesion, nuevaInteraccion];
      });

      console.log(`[${timestamp}] Sesion ${sesion.id} + Interaccion ${interaccion.id} creados (anonima)`);
      return res.status(201).json({ ok: true, sesionId: sesion.id, perfilId: null });
    }

  } catch (err) {
    console.error(`[${timestamp}] Error en /api/guardar-sesion:`, err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ---------------------------------------------------------------------------
// Iniciar servidor (solo cuando se ejecuta directamente, no cuando Lambda lo importa)
// ---------------------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Perfilador] Servidor proxy escuchando en http://localhost:${PORT}`);
    console.log(`[Perfilador] Proxy de Vite: /api → http://localhost:${PORT}`);
  });
}

module.exports = app;
