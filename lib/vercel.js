// Vercel Serverless Function adapter over lib/api.js.
// One thin file per route under api/ (Vercel maps api/status.js -> /api/status).
// The pathname is fixed per file, so no rewrites and no URL guessing.
// Body parsing and response shaping mirror server.js exactly.
'use strict';

const { URL } = require('url');
const api = require('./api');

function readBody(req, limitBytes = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function createHandler(pathname) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      let body = {};
      if (req.method === 'POST') body = await readBody(req);
      const out = await api.handleApiRequest({
        method: req.method,
        pathname,
        searchParams: url.searchParams,
        body,
      });
      res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out.json));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'upstream Zhihu API error', detail: e.message }));
    }
  };
}

module.exports = { createHandler };
