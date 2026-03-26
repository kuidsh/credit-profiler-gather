/**
 * server/db/client.cjs
 *
 * Singleton de PrismaClient para Express y AWS Lambda.
 *
 * En Lambda cada invocación reutiliza el mismo proceso mientras el contenedor
 * esté "caliente", por lo que almacenamos la instancia en `global` para no
 * crear una conexión nueva en cada ejecución del handler. Sin este patrón,
 * las reconexiones frecuentes agotan el pool de Aurora Serverless v2.
 *
 * En desarrollo local (NODE_ENV !== 'production') también se guarda en global
 * para evitar múltiples instancias durante hot-reload de nodemon.
 *
 * Uso:
 *   const prisma = require('./db/client.cjs');
 */

'use strict';

const { PrismaClient } = require('@prisma/client');

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production'
      ? ['error']
      : ['error', 'warn'],
  });
}

let prisma;

if (global.__prisma) {
  prisma = global.__prisma;
} else {
  prisma = createClient();
  global.__prisma = prisma;
}

module.exports = prisma;
