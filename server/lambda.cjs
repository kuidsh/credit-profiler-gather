'use strict';
const serverless = require('serverless-http');
const app = require('./index.cjs');
module.exports.handler = serverless(app);