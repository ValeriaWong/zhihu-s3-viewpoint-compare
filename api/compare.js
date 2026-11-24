// POST /api/compare — Vercel Serverless Function (thin adapter, see lib/vercel.js).
'use strict';

const { createHandler } = require('../lib/vercel');

module.exports = createHandler('/api/compare');
