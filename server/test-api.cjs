/**
 * server/test-api.cjs
 *
 * Script de integración para el Perfilador Express.
 * Inicia el servidor Express en un puerto libre, ejecuta los flujos
 * completos de los Wizard 1 y 2, verifica el estado de la BD con Prisma
 * después de cada paso, y reporta PASS/FAIL por cada assertion.
 *
 * Uso: node server/test-api.cjs
 * Salida: exits 0 si todo pasa, 1 si alguna assertion falla.
 */

'use strict';

const path   = require('path');
const http   = require('http');
const assert = require('assert');

// Cargar .env.local antes de requerir Prisma o el servidor
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
});

const app    = require('./index.cjs');
const prisma = require('./db/client.cjs');

// ---------------------------------------------------------------------------
// Utilidades de test
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function pass(label) {
  passed++;
  console.log(`  [PASS] ${label}`);
}

function fail(label, detail) {
  failed++;
  const msg = `  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`;
  console.log(msg);
  failures.push(msg);
}

function check(label, condition, detail) {
  if (condition) {
    pass(label);
  } else {
    fail(label, detail);
  }
}

// ---------------------------------------------------------------------------
// HTTP helper — promisified request against the in-process server
// ---------------------------------------------------------------------------

let BASE_URL;

async function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url      = new URL(urlPath, BASE_URL);
    const bodyStr  = body !== undefined ? JSON.stringify(body) : undefined;

    const options = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Per-run unique values (avoid duplicate-phone/email collisions across runs)
// ---------------------------------------------------------------------------

const RUN_SUFFIX  = Date.now().toString().slice(-6); // last 6 digits of epoch ms
const PHONE_W2    = `33${RUN_SUFFIX}`; // 8-digit phone for Wizard 2 sub-paso 1
const EMAIL_W2    = `cliente_${RUN_SUFFIX}@test.com`; // unique email for Wizard 2 sub-paso 3
const PHONE_DUP   = `33${RUN_SUFFIX}`; // same phone — used by duplicate-phone test
const EMAIL_DUP   = `cliente_${RUN_SUFFIX}@test.com`; // same email — used by duplicate-email test

// ---------------------------------------------------------------------------
// Wizard data constants
// ---------------------------------------------------------------------------

const WIZARD_DATA = {
  ocupacion:          'asalariado',
  antiguedad:         3,
  ingresoMensual:     25000,
  compruebaIngresos:  'si',
  tipoDomicilio:      'rentado',
  historialCrediticio: 'bueno',
  deudasMensuales:    3000,
  rentaHipoteca:      4000,
  numDependientes:    1,
  precioAuto:         350000,
  anioModelo:         2024,
  tipoUnidad:         'SUV',
  enganche:           70000,
  mensualidadBuscada: 6000,
  plazoDeseado:       60,
  aceptaAjustar:      true,
};

const RESULTADO_BANCO = {
  viabilidadInicial:          'Alta',
  clasificacionRecomendada:   'Banco',
  capacidadPago:              'Alta',
  cargaFinanciera:            'Cómoda',
  porQue:                     'El cliente tiene ingresos estables y buen historial.',
  recomendacionesAccionables: '- Presentar opciones de 48 meses\n- Verificar historial',
  fraseVendedor:              'Con su perfil, tiene opciones en banco',
  advertenciaComercial:       'Ninguna en este momento',
};

const RESULTADO_SUBPRIME = {
  ...RESULTADO_BANCO,
  viabilidadInicial:        'Baja',
  clasificacionRecomendada: 'Subprime',
  capacidadPago:            'Baja',
  cargaFinanciera:          'Apretada',
};

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

async function runTests() {
  // ── Wizard 1 — Flujo Banco ────────────────────────────────────────────────
  console.log('\n=== Wizard 1 — Clasificación Banco ===\n');

  // Step 1: POST /api/iniciar-sesion
  console.log('--- Step 1: POST /api/iniciar-sesion ---');
  const r1 = await request('POST', '/api/iniciar-sesion', {
    ocupacion:         WIZARD_DATA.ocupacion,
    antiguedad:        WIZARD_DATA.antiguedad,
    ingresoMensual:    WIZARD_DATA.ingresoMensual,
    compruebaIngresos: WIZARD_DATA.compruebaIngresos,
    tipoDomicilio:     WIZARD_DATA.tipoDomicilio,
  });
  check('POST /api/iniciar-sesion → status 201',     r1.status === 201,     `got ${r1.status}`);
  check('Response has ok: true',                     r1.body?.ok === true,  JSON.stringify(r1.body));
  check('Response has sesionId (string)',             typeof r1.body?.sesionId === 'string', JSON.stringify(r1.body));

  const sesionIdBanco = r1.body?.sesionId;

  if (!sesionIdBanco) {
    fail('Cannot continue: sesionId is missing from step 1 response');
    return;
  }

  const dbSesion1 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
  check('DB sesion.pasoActual = 1',             dbSesion1?.pasoActual        === 1,        `got ${dbSesion1?.pasoActual}`);
  check('DB sesion.fuentePersistencia = borrador', dbSesion1?.fuentePersistencia === 'borrador', `got ${dbSesion1?.fuentePersistencia}`);

  // Step 2: PATCH /api/sesion/:sesionId (paso 2)
  console.log('\n--- Step 2: PATCH /api/sesion/:sesionId (paso 2) ---');
  const r2 = await request('PATCH', `/api/sesion/${sesionIdBanco}`, {
    paso: 2,
    data: {
      historialCrediticio: WIZARD_DATA.historialCrediticio,
      deudasMensuales:     WIZARD_DATA.deudasMensuales,
      rentaHipoteca:       WIZARD_DATA.rentaHipoteca,
      numDependientes:     WIZARD_DATA.numDependientes,
    },
  });
  check('PATCH paso 2 → status 200', r2.status === 200, `got ${r2.status}`);
  check('Response has ok: true',     r2.body?.ok === true, JSON.stringify(r2.body));

  const dbSesion2 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
  check('DB sesion.pasoActual = 2', dbSesion2?.pasoActual === 2, `got ${dbSesion2?.pasoActual}`);

  // Step 3: PATCH /api/sesion/:sesionId (paso 3)
  console.log('\n--- Step 3: PATCH /api/sesion/:sesionId (paso 3) ---');
  const r3 = await request('PATCH', `/api/sesion/${sesionIdBanco}`, {
    paso: 3,
    data: {
      precioAuto:         WIZARD_DATA.precioAuto,
      anioModelo:         WIZARD_DATA.anioModelo,
      tipoUnidad:         WIZARD_DATA.tipoUnidad,
      enganche:           WIZARD_DATA.enganche,
      mensualidadBuscada: WIZARD_DATA.mensualidadBuscada,
      plazoDeseado:       WIZARD_DATA.plazoDeseado,
      aceptaAjustar:      WIZARD_DATA.aceptaAjustar,
    },
  });
  check('PATCH paso 3 → status 200', r3.status === 200, `got ${r3.status}`);
  check('Response has ok: true',     r3.body?.ok === true, JSON.stringify(r3.body));

  const dbSesion3 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
  check('DB sesion.pasoActual = 3', dbSesion3?.pasoActual === 3, `got ${dbSesion3?.pasoActual}`);

  // Verify datosWizardJson contains all wizard fields
  let wizardJson3 = {};
  try { wizardJson3 = JSON.parse(dbSesion3?.datosWizardJson ?? '{}'); } catch (_) {}
  check('DB datosWizardJson has ocupacion',    'ocupacion'    in wizardJson3, JSON.stringify(Object.keys(wizardJson3)));
  check('DB datosWizardJson has precioAuto',   'precioAuto'   in wizardJson3, JSON.stringify(Object.keys(wizardJson3)));
  check('DB datosWizardJson has deudasMensuales', 'deudasMensuales' in wizardJson3, JSON.stringify(Object.keys(wizardJson3)));

  // Step 4: POST /api/guardar-sesion (Banco)
  console.log('\n--- Step 4: POST /api/guardar-sesion (Banco) ---');
  const r4 = await request('POST', '/api/guardar-sesion', {
    sesionId:   sesionIdBanco,
    wizardData: WIZARD_DATA,
    resultado:  RESULTADO_BANCO,
  });
  check('POST /api/guardar-sesion → status 201', r4.status === 201,             `got ${r4.status}`);
  check('Response has ok: true',                 r4.body?.ok === true,           JSON.stringify(r4.body));
  check('Response has sesionId',                 typeof r4.body?.sesionId === 'string', JSON.stringify(r4.body));
  check('Response has perfilId (not null)',       typeof r4.body?.perfilId === 'string', JSON.stringify(r4.body));

  const perfilIdBanco = r4.body?.perfilId;

  // DB verify: sesiones_wizard
  const dbSesion4 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
  check('DB sesion.pasoActual = 4',                    dbSesion4?.pasoActual              === 4,         `got ${dbSesion4?.pasoActual}`);
  check('DB sesion.fuentePersistencia = completa',     dbSesion4?.fuentePersistencia      === 'completa', `got ${dbSesion4?.fuentePersistencia}`);
  check('DB sesion.guardarCompleto = true',            dbSesion4?.guardarCompleto         === true,       `got ${dbSesion4?.guardarCompleto}`);
  check('DB sesion.datosWizardJson = null',            dbSesion4?.datosWizardJson         === null,       `got ${dbSesion4?.datosWizardJson}`);
  check('DB sesion.clasificacionRecomendada = Banco',  dbSesion4?.clasificacionRecomendada === 'Banco',   `got ${dbSesion4?.clasificacionRecomendada}`);

  // DB verify: perfiles_completos
  const dbPerfil4 = perfilIdBanco
    ? await prisma.perfilCompleto.findUnique({ where: { id: perfilIdBanco } })
    : null;
  check('DB perfilCompleto exists',                     dbPerfil4 !== null,                           'no row found');
  check('DB perfilCompleto.viabilidadInicial = Alta',   dbPerfil4?.viabilidadInicial    === 'Alta',    `got ${dbPerfil4?.viabilidadInicial}`);
  check('DB perfilCompleto.capacidadPago = Alta',       dbPerfil4?.capacidadPago        === 'Alta',    `got ${dbPerfil4?.capacidadPago}`);
  check('DB perfilCompleto.porQue not empty',           (dbPerfil4?.porQue ?? '').length > 0,          'empty');
  check('DB perfilCompleto.recomendacionesAccionables not empty', (dbPerfil4?.recomendacionesAccionables ?? '').length > 0, 'empty');
  check('DB perfilCompleto.fraseVendedor not empty',    (dbPerfil4?.fraseVendedor ?? '').length > 0,   'empty');

  // resultadoLlmJson — key assertion for Task 1/2
  let parsedLlmJson = null;
  try { parsedLlmJson = JSON.parse(dbPerfil4?.resultadoLlmJson ?? 'null'); } catch (_) {}
  check('DB perfilCompleto.resultadoLlmJson is valid JSON',           parsedLlmJson !== null,                  `raw: ${dbPerfil4?.resultadoLlmJson}`);
  check('DB perfilCompleto.resultadoLlmJson.clasificacionRecomendada = Banco',
    parsedLlmJson?.clasificacionRecomendada === 'Banco',
    `got ${parsedLlmJson?.clasificacionRecomendada}`);

  // DB verify: interacciones_anonimas — must NOT exist for this sesionId
  const dbAnon4 = await prisma.interaccionAnonima.findUnique({ where: { sesionId: sesionIdBanco } });
  check('DB interaccionAnonima NOT created for Banco sesion', dbAnon4 === null, `found: ${JSON.stringify(dbAnon4)}`);

  // Step 4b: Subprime flow (fresh sesion)
  console.log('\n=== Wizard 1b — Clasificación Subprime ===\n');
  console.log('--- Step 4b.1: POST /api/iniciar-sesion (nueva sesión Subprime) ---');
  const rSub1 = await request('POST', '/api/iniciar-sesion', {
    ocupacion:         WIZARD_DATA.ocupacion,
    antiguedad:        WIZARD_DATA.antiguedad,
    ingresoMensual:    WIZARD_DATA.ingresoMensual,
    compruebaIngresos: WIZARD_DATA.compruebaIngresos,
    tipoDomicilio:     WIZARD_DATA.tipoDomicilio,
  });
  const sesionIdSubprime = rSub1.body?.sesionId;
  check('Subprime: nueva sesionId obtenida', typeof sesionIdSubprime === 'string', JSON.stringify(rSub1.body));

  console.log('\n--- Step 4b.2: POST /api/guardar-sesion (Subprime) ---');
  const rSub4 = await request('POST', '/api/guardar-sesion', {
    sesionId:   sesionIdSubprime,
    wizardData: WIZARD_DATA,
    resultado:  RESULTADO_SUBPRIME,
  });
  check('POST /api/guardar-sesion Subprime → status 201', rSub4.status === 201,       `got ${rSub4.status}`);
  check('Response has ok: true',                          rSub4.body?.ok === true,     JSON.stringify(rSub4.body));
  check('Response perfilId = null (Subprime)',            rSub4.body?.perfilId === null, `got ${rSub4.body?.perfilId}`);

  const dbSubSesion = sesionIdSubprime
    ? await prisma.sesionWizard.findUnique({ where: { id: sesionIdSubprime } })
    : null;
  check('DB subprime sesion.guardarCompleto = false',      dbSubSesion?.guardarCompleto      === false,   `got ${dbSubSesion?.guardarCompleto}`);
  check('DB subprime sesion.fuentePersistencia = anonima', dbSubSesion?.fuentePersistencia   === 'anonima', `got ${dbSubSesion?.fuentePersistencia}`);

  const dbAnon = sesionIdSubprime
    ? await prisma.interaccionAnonima.findUnique({ where: { sesionId: sesionIdSubprime } })
    : null;
  check('DB interaccionAnonima created for Subprime',     dbAnon !== null,                   'no row found');

  const dbPerfilSubprime = sesionIdSubprime
    ? await prisma.perfilCompleto.findFirst({ where: { sesionId: sesionIdSubprime } })
    : null;
  check('DB perfilCompleto NOT created for Subprime',     dbPerfilSubprime === null,         `found: ${JSON.stringify(dbPerfilSubprime)}`);

  // ── Wizard 2 — Step 5 (usando sesionId + perfilId del flujo Banco) ─────────
  console.log('\n=== Wizard 2 — Step 5 (Banco sesion) ===\n');

  // Hoisted so that the GET /api/clientes/:id tests below can use it
  let datosPersonalesId = null;

  if (!sesionIdBanco || !perfilIdBanco) {
    fail('Cannot run Wizard 2: missing sesionIdBanco or perfilIdBanco');
  } else {
    // Sub-paso 1: POST /api/guardar-contacto
    console.log('--- Sub-paso 1: POST /api/guardar-contacto ---');
    const rC1 = await request('POST', '/api/guardar-contacto', {
      sesionId:        sesionIdBanco,
      perfilId:        perfilIdBanco,
      nombres:         'Maria Elena',
      apellidoPaterno: 'Garcia',
      apellidoMaterno: 'Lopez',
      telefonoCelular: PHONE_W2,
    });
    check('POST /api/guardar-contacto → status 200',    rC1.status === 200,                         `got ${rC1.status}`);
    check('Response has ok: true',                      rC1.body?.ok === true,                       JSON.stringify(rC1.body));
    check('Response has datosPersonalesId (string)',    typeof rC1.body?.datosPersonalesId === 'string', JSON.stringify(rC1.body));

    datosPersonalesId = rC1.body?.datosPersonalesId;

    const dbDatos1 = datosPersonalesId
      ? await prisma.datosPersonalesPaso5.findUnique({ where: { id: datosPersonalesId } })
      : null;
    check('DB datosPersonales exists after sub-paso 1',  dbDatos1 !== null,                   'no row found');
    check('DB datosPersonales.subPasoCompletado = 1',    dbDatos1?.subPasoCompletado === 1,   `got ${dbDatos1?.subPasoCompletado}`);
    check('DB datosPersonales.completado = false',       dbDatos1?.completado === false,       `got ${dbDatos1?.completado}`);
    check('DB datosPersonales.nombres = Maria Elena',    dbDatos1?.nombres === 'Maria Elena',  `got ${dbDatos1?.nombres}`);
    check('DB datosPersonales.telefonoCelular set',      dbDatos1?.telefonoCelular === PHONE_W2, `got ${dbDatos1?.telefonoCelular}`);

    const dbSesionC1 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
    check('DB sesion.paso5ContactoGuardado = true', dbSesionC1?.paso5ContactoGuardado === true, `got ${dbSesionC1?.paso5ContactoGuardado}`);

    // Sub-paso 3 (final): PUT /api/guardar-perfil/:sesionId
    console.log('\n--- Sub-paso 3: PUT /api/guardar-perfil/:sesionId ---');
    const rC3 = await request('PUT', `/api/guardar-perfil/${sesionIdBanco}`, {
      perfilId:           perfilIdBanco,
      fechaNacimiento:    '1985-03-12',
      rfc:                'GALO850312AB1',
      curp:               null,
      genero:             'femenino',
      estadoCivil:        'casado',
      correoElectronico:  EMAIL_W2,
      telefonoCasaTrabajo: null,
      calle:              'Av. Hidalgo',
      numeroExterior:     '145',
      numeroInterior:     null,
      colonia:            'Centro',
      municipioDelegacion: 'Guadalajara',
      estadoRepublica:    'jalisco',
      codigoPostal:       '44100',
      tipoDomicilioPaso5: 'rentado',
      tiempoEnDomicilio:  '3_5',
    });
    check('PUT /api/guardar-perfil → status 200', rC3.status === 200,     `got ${rC3.status}`);
    check('Response has ok: true',                rC3.body?.ok === true,  JSON.stringify(rC3.body));

    const dbDatos3 = await prisma.datosPersonalesPaso5.findUnique({ where: { perfilId: perfilIdBanco } });
    check('DB datosPersonales.subPasoCompletado = 3', dbDatos3?.subPasoCompletado === 3,           `got ${dbDatos3?.subPasoCompletado}`);
    check('DB datosPersonales.completado = true',     dbDatos3?.completado === true,               `got ${dbDatos3?.completado}`);
    check('DB datosPersonales.calle set',             dbDatos3?.calle === 'Av. Hidalgo',           `got ${dbDatos3?.calle}`);
    check('DB datosPersonales.colonia set',           dbDatos3?.colonia === 'Centro',              `got ${dbDatos3?.colonia}`);
    check('DB datosPersonales.codigoPostal set',      dbDatos3?.codigoPostal === '44100',          `got ${dbDatos3?.codigoPostal}`);
    check('DB datosPersonales.genero set',            dbDatos3?.genero === 'femenino',             `got ${dbDatos3?.genero}`);
    check('DB datosPersonales.correoElectronico set', dbDatos3?.correoElectronico === EMAIL_W2, `got ${dbDatos3?.correoElectronico}`);

    const dbSesionC3 = await prisma.sesionWizard.findUnique({ where: { id: sesionIdBanco } });
    check('DB sesion.paso5Completado = true', dbSesionC3?.paso5Completado === true, `got ${dbSesionC3?.paso5Completado}`);
  }

  // ── GET /api/clientes/:id ──────────────────────────────────────────────────
  console.log('\n=== GET /api/clientes/:id ===\n');

  // Test: valid id (from guardar-contacto + guardar-perfil above)
  console.log('--- GET /api/clientes/:id (valid id) ---');
  if (!datosPersonalesId) {
    fail('Cannot test GET /api/clientes/:id: datosPersonalesId is missing');
  } else {
    const rGet1 = await request('GET', `/api/clientes/${datosPersonalesId}`);
    check('GET /api/clientes/:id → status 200',          rGet1.status === 200,              `got ${rGet1.status}`);
    check('Response has ok: true',                       rGet1.body?.ok === true,            JSON.stringify(rGet1.body));
    check('cliente.nombres === "Maria Elena"',           rGet1.body?.cliente?.nombres === 'Maria Elena',        `got ${rGet1.body?.cliente?.nombres}`);
    check('cliente.apellidoPaterno === "Garcia"',        rGet1.body?.cliente?.apellidoPaterno === 'Garcia',     `got ${rGet1.body?.cliente?.apellidoPaterno}`);
    check(`cliente.telefonoCelular === "${PHONE_W2}"`,   rGet1.body?.cliente?.telefonoCelular === PHONE_W2, `got ${rGet1.body?.cliente?.telefonoCelular}`);
    // Sub-paso 3 fields populated (guardar-perfil was called above)
    check('cliente.calle set',                           rGet1.body?.cliente?.calle === 'Av. Hidalgo',         `got ${rGet1.body?.cliente?.calle}`);
    check('cliente.colonia set',                         rGet1.body?.cliente?.colonia === 'Centro',            `got ${rGet1.body?.cliente?.colonia}`);
    check('cliente.municipioDelegacion set',             rGet1.body?.cliente?.municipioDelegacion === 'Guadalajara', `got ${rGet1.body?.cliente?.municipioDelegacion}`);
    check('cliente.estadoRepublica set',                 rGet1.body?.cliente?.estadoRepublica === 'jalisco',   `got ${rGet1.body?.cliente?.estadoRepublica}`);
    check('cliente.codigoPostal set',                    rGet1.body?.cliente?.codigoPostal === '44100',        `got ${rGet1.body?.cliente?.codigoPostal}`);
  }

  // Test: invalid id → 404
  console.log('\n--- GET /api/clientes/:id (invalid id) ---');
  const rGet404 = await request('GET', '/api/clientes/00000000-0000-0000-0000-000000000000');
  check('GET /api/clientes/:id (invalid) → status 404', rGet404.status === 404,            `got ${rGet404.status}`);
  check('Response has ok: false',                        rGet404.body?.ok === false,        JSON.stringify(rGet404.body));

  // ── GET /api/clientes?telefono=... ────────────────────────────────────────
  console.log('\n=== GET /api/clientes?telefono ===\n');

  // Test: phone with match (using the per-run phone from Wizard 2)
  console.log(`--- GET /api/clientes?telefono=${PHONE_W2} (match) ---`);
  const rTel1 = await request('GET', `/api/clientes?telefono=${PHONE_W2}`);
  check(`GET /api/clientes?telefono=${PHONE_W2} → status 200`, rTel1.status === 200,          `got ${rTel1.status}`);
  check('Response has ok: true',                               rTel1.body?.ok === true,        JSON.stringify(rTel1.body));
  check('clientes array has at least 1 result',                Array.isArray(rTel1.body?.clientes) && rTel1.body.clientes.length >= 1, `got ${rTel1.body?.clientes?.length}`);
  check('clientes[0].id is a string (UUID)',                   typeof rTel1.body?.clientes?.[0]?.id === 'string',        `got ${typeof rTel1.body?.clientes?.[0]?.id}`);
  check('clientes[0].nombres === "Maria Elena"',               rTel1.body?.clientes?.[0]?.nombres === 'Maria Elena',     `got ${rTel1.body?.clientes?.[0]?.nombres}`);

  // Test: phone with no match → empty array, NOT 404
  console.log('\n--- GET /api/clientes?telefono=0000000000 (no match) ---');
  const rTel0 = await request('GET', '/api/clientes?telefono=0000000000');
  check('GET /api/clientes?telefono=0000000000 → status 200', rTel0.status === 200,          `got ${rTel0.status}`);
  check('Response has ok: true',                              rTel0.body?.ok === true,        JSON.stringify(rTel0.body));
  check('clientes array is empty (not 404)',                  Array.isArray(rTel0.body?.clientes) && rTel0.body.clientes.length === 0, `got ${JSON.stringify(rTel0.body?.clientes)}`);

  // ── Duplicate checks — Setup: create a second Banco sesion/perfil ─────────
  console.log('\n=== Duplicate Check Tests — Setup: second Banco sesion ===\n');

  let sesionId2 = null;
  let perfilId2 = null;

  console.log('--- Setup 1: POST /api/iniciar-sesion (sesion2) ---');
  const rDup1 = await request('POST', '/api/iniciar-sesion', {
    ocupacion:         WIZARD_DATA.ocupacion,
    antiguedad:        WIZARD_DATA.antiguedad,
    ingresoMensual:    WIZARD_DATA.ingresoMensual,
    compruebaIngresos: WIZARD_DATA.compruebaIngresos,
    tipoDomicilio:     WIZARD_DATA.tipoDomicilio,
  });
  check('Setup: POST /api/iniciar-sesion sesion2 → status 201', rDup1.status === 201, `got ${rDup1.status}`);
  sesionId2 = rDup1.body?.sesionId;
  check('Setup: sesionId2 is a string', typeof sesionId2 === 'string', JSON.stringify(rDup1.body));

  if (sesionId2) {
    console.log('\n--- Setup 2: POST /api/guardar-sesion (sesion2, Banco) ---');
    const rDup2 = await request('POST', '/api/guardar-sesion', {
      sesionId:   sesionId2,
      wizardData: WIZARD_DATA,
      resultado:  RESULTADO_BANCO,
    });
    check('Setup: POST /api/guardar-sesion sesion2 → status 201', rDup2.status === 201, `got ${rDup2.status}`);
    perfilId2 = rDup2.body?.perfilId;
    check('Setup: perfilId2 is a string', typeof perfilId2 === 'string', JSON.stringify(rDup2.body));
  }

  if (sesionId2 && perfilId2) {
    // ── Test: duplicate phone → 409 ──────────────────────────────────────────
    console.log('\n=== Duplicate Check Tests ===\n');
    console.log('--- Test: duplicate phone → guardar-contacto returns 409 ---');
    const rDupPhone = await request('POST', '/api/guardar-contacto', {
      sesionId:        sesionId2,
      perfilId:        perfilId2,
      nombres:         'Juan',
      apellidoPaterno: 'Perez',
      telefonoCelular: PHONE_DUP, // same phone used in Wizard 2 (PHONE_W2)
    });
    check('Duplicate phone → status 409',             rDupPhone.status === 409,               `got ${rDupPhone.status}`);
    check('Duplicate phone → ok: false',               rDupPhone.body?.ok === false,           JSON.stringify(rDupPhone.body));
    check('Duplicate phone → error: duplicate_phone',  rDupPhone.body?.error === 'duplicate_phone', `got ${rDupPhone.body?.error}`);

    // ── Test: different phone → 200 ──────────────────────────────────────────
    console.log('\n--- Test: different phone → guardar-contacto succeeds ---');
    const PHONE_UNIQ = `34${RUN_SUFFIX}`; // distinct from PHONE_W2 / PHONE_DUP
    const rUniqPhone = await request('POST', '/api/guardar-contacto', {
      sesionId:        sesionId2,
      perfilId:        perfilId2,
      nombres:         'Juan',
      apellidoPaterno: 'Perez',
      telefonoCelular: PHONE_UNIQ,
    });
    check('Different phone → status 200',  rUniqPhone.status === 200,        `got ${rUniqPhone.status}`);
    check('Different phone → ok: true',    rUniqPhone.body?.ok === true,     JSON.stringify(rUniqPhone.body));

    // ── Test: duplicate email → 409 ──────────────────────────────────────────
    console.log('\n--- Test: duplicate email → guardar-perfil returns 409 ---');
    const rDupEmail = await request('PUT', `/api/guardar-perfil/${sesionId2}`, {
      perfilId:           perfilId2,
      fechaNacimiento:    '1990-06-15',
      rfc:                null,
      curp:               null,
      genero:             'masculino',
      estadoCivil:        'soltero',
      correoElectronico:  EMAIL_DUP, // same email used in Wizard 2 (EMAIL_W2)
      telefonoCasaTrabajo: null,
      calle:              'Calle Falsa',
      numeroExterior:     '123',
      numeroInterior:     null,
      colonia:            'Centro',
      municipioDelegacion: 'Monterrey',
      estadoRepublica:    'nuevo_leon',
      codigoPostal:       '64000',
      tipoDomicilioPaso5: 'propio',
      tiempoEnDomicilio:  '1_3',
    });
    check('Duplicate email → status 409',             rDupEmail.status === 409,                `got ${rDupEmail.status}`);
    check('Duplicate email → ok: false',               rDupEmail.body?.ok === false,            JSON.stringify(rDupEmail.body));
    check('Duplicate email → error: duplicate_email',  rDupEmail.body?.error === 'duplicate_email', `got ${rDupEmail.body?.error}`);

    // ── Test: different email → 200 ──────────────────────────────────────────
    console.log('\n--- Test: different email → guardar-perfil succeeds ---');
    const EMAIL_UNIQ = `otro_${RUN_SUFFIX}@test.com`; // distinct from EMAIL_W2 / EMAIL_DUP
    const rUniqEmail = await request('PUT', `/api/guardar-perfil/${sesionId2}`, {
      perfilId:           perfilId2,
      fechaNacimiento:    '1990-06-15',
      rfc:                null,
      curp:               null,
      genero:             'masculino',
      estadoCivil:        'soltero',
      correoElectronico:  EMAIL_UNIQ,
      telefonoCasaTrabajo: null,
      calle:              'Calle Falsa',
      numeroExterior:     '123',
      numeroInterior:     null,
      colonia:            'Centro',
      municipioDelegacion: 'Monterrey',
      estadoRepublica:    'nuevo_leon',
      codigoPostal:       '64000',
      tipoDomicilioPaso5: 'propio',
      tiempoEnDomicilio:  '1_3',
    });
    check('Different email → status 200',  rUniqEmail.status === 200,       `got ${rUniqEmail.status}`);
    check('Different email → ok: true',    rUniqEmail.body?.ok === true,    JSON.stringify(rUniqEmail.body));
  } else {
    fail('Duplicate check tests skipped: setup did not produce sesionId2 and perfilId2');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=========================================');
  console.log(`Results: ${passed} PASS, ${failed} FAIL`);
  if (failures.length > 0) {
    console.log('\nFailed assertions:');
    failures.forEach((f) => console.log(f));
  }
}

// ---------------------------------------------------------------------------
// Bootstrap: start server on a random port, run tests, then shut down
// ---------------------------------------------------------------------------

const server = http.createServer(app);

server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  BASE_URL = `http://127.0.0.1:${port}`;
  console.log(`[test] Server listening on ${BASE_URL}`);

  try {
    await runTests();
  } catch (err) {
    console.error('[test] Unexpected error:', err);
    failed++;
    failures.push(`Unexpected error: ${err.message}`);
  }

  await prisma.$disconnect();
  server.close(() => {
    console.log('\n[test] Server closed.');
    process.exit(failed > 0 ? 1 : 0);
  });
});
