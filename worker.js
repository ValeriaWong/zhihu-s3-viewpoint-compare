// Cloudflare Workers entry for the Zhihu S3 viewpoint comparison demo.
// Reuses the same API routing as the Node server (lib/api.js) and the same
// mock/live Zhihu client (lib/zhihu.js, lib/mock.js).
// The static frontend (public/) is served via Workers Static Assets.
// Mock mode (no ZHIHU_ACCESS_SECRET) needs no secret at all.
// lib/ is CommonJS: import it as the default export (module.exports).
// A named ESM import from CJS comes back undefined in Workers (every
// request then 500s with error 1101), and createRequire() is opaque to
// the bundler (deploy fails with "Module not found: ./lib/api.js").
import apiModule from './lib/api.js';

const { handleApiRequest } = apiModule;

export default {
  async fetch(request, env, ctx) {
    // In Workers, secrets arrive on `env`; the shared client reads
    // process.env, so bridge the one variable through when it is set.
    // Guarded: a plain Workers runtime has no `process` global
    // (nodejs_compat in wrangler.toml provides it).
    if (env && env.ZHIHU_ACCESS_SECRET && typeof process !== 'undefined' && process.env) {
      process.env.ZHIHU_ACCESS_SECRET = env.ZHIHU_ACCESS_SECRET;
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      let body = {};
      if (request.method === 'POST') {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }
      const out = await handleApiRequest({
        method: request.method,
        pathname: url.pathname,
        searchParams: url.searchParams,
        body,
      });
      return new Response(JSON.stringify(out.json), {
        status: out.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
