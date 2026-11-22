// Zhihu Hackathon S3 entry scaffold: cross-lingual legal viewpoint comparison.
// Single deployable unit: this Node service serves the static frontend and
// the /api proxy routes, so the browser never calls Zhihu directly.
// Zero dependencies (Node >= 18, built-in http/fs/path only).
//
// Modes:
//   live - ZHIHU_ACCESS_SECRET is set; calls go to the real Zhihu APIs.
//   mock - no Secret; every route returns structurally real mock data.
// The Secret is read only from the environment. It is never logged or
// written anywhere by this service.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const api = require('./lib/api');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const mode = () => api.mode();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

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

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// API routing lives in lib/api.js (shared with the Workers entry).
// This is only the Node http adapter: parse the request, delegate, send JSON.
async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    let body = {};
    if (req.method === 'POST') body = await readBody(req);
    const out = await api.handleApiRequest({
      method: req.method,
      pathname: url.pathname,
      searchParams: url.searchParams,
      body,
    });
    sendJson(res, out.status, out.json);
  } catch (e) {
    console.error('[api error]', url.pathname, e.message);
    sendJson(res, 502, { error: 'upstream Zhihu API error', detail: e.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`zhihu-s3 viewpoint compare listening on http://${HOST}:${PORT} (mode=${mode()})`);
  if (mode() === 'mock') {
    console.log('mock mode: set ZHIHU_ACCESS_SECRET to call the real Zhihu APIs.');
  }
});
