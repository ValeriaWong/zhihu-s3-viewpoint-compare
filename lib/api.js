// Runtime-agnostic API routing for the Zhihu S3 viewpoint comparison service.
// Shared by server.js (Node http) and worker.js (Cloudflare Workers fetch).
// Pure logic only: no Node APIs, no Workers APIs.
// Input:  { method, pathname, searchParams, body }
// Output: { status, json } — the caller serializes and sends it.
// The Access Secret is read only inside lib/zhihu.js (from process.env);
// in Workers, worker.js bridges env.ZHIHU_ACCESS_SECRET into process.env.
'use strict';

const zhihu = require('./zhihu');
const mock = require('./mock');

const mode = () => (zhihu.hasSecret() ? 'live' : 'mock');

// Live call with quota guard: if the relevant quota is explicitly 0,
// degrade to mock data instead of failing. A quota value that cannot be
// determined never blocks the call.
async function liveOrDegraded(group, liveFn, mockFn) {
  if (mode() === 'mock') return { ...mockFn(), mock: true };
  const remaining = await zhihu.quotaRemaining(group);
  if (remaining === 0) {
    return {
      ...mockFn(),
      mock: true,
      degraded: true,
      reason: `quota exhausted for group ${group}; serving mock data`,
    };
  }
  const out = await liveFn();
  return { ...out, mock: false };
}

function resolveSources(comparison, answers) {
  const map = (list) => (list || []).map((item) => ({
    text: item.text || '',
    sources: (item.sources || [])
      .map((s) => (typeof s === 'number' ? answers[s - 1]?.url : s))
      .filter(Boolean),
  }));
  return {
    summary: comparison.summary || '',
    consensus: map(comparison.consensus),
    divergence: map(comparison.divergence),
  };
}

async function handleApiRequest({ method, pathname, searchParams, body }) {
  const params = searchParams;
  const get = (name) => (params.get(name) || '').trim();

  try {
    if (method === 'GET' && pathname === '/api/status') {
      return {
        status: 200,
        json: {
          mode: mode(),
          secretConfigured: zhihu.hasSecret(),
          sampleQuestion: { url: mock.SAMPLE_QUESTION_URL, title: mock.SAMPLE_QUESTION_TITLE },
        },
      };
    }

    if (method === 'GET' && pathname === '/api/quota') {
      if (mode() === 'mock') {
        return { status: 200, json: { mock: true, ...mock.mockQuota() } };
      }
      const data = await zhihu.getQuota();
      return { status: 200, json: { mock: false, raw: data } };
    }

    if (method === 'GET' && pathname === '/api/search') {
      const query = get('query');
      if (!query) {
        return { status: 400, json: { error: 'query is required' } };
      }
      const count = params.get('count') || '10';
      const out = await liveOrDegraded(
        'search',
        () => zhihu.zhihuSearch(query, count),
        () => mock.mockSearch(query),
      );
      return { status: 200, json: out };
    }

    if (method === 'GET' && pathname === '/api/answers') {
      const questionUrl = get('questionUrl');
      if (!questionUrl) {
        return { status: 400, json: { error: 'questionUrl is required' } };
      }
      const offset = params.get('offset') || '0';
      const limit = params.get('limit') || '20';
      const out = await liveOrDegraded(
        'answers',
        () => zhihu.questionAnswers(questionUrl, offset, limit),
        () => mock.mockAnswers(questionUrl),
      );
      return { status: 200, json: out };
    }

    if (method === 'POST' && pathname === '/api/compare') {
      const b = body || {};
      const question = (b.question || '').trim();
      const answers = Array.isArray(b.answers) ? b.answers.slice(0, 10) : [];
      const language = ['zh', 'en', 'ru'].includes(b.language) ? b.language : 'zh';
      const model = ['fast', 'thinking', 'agent'].includes(b.model) ? b.model : 'thinking';
      if (!question || answers.length === 0) {
        return { status: 400, json: { error: 'question and at least one answer are required' } };
      }
      if (mode() === 'mock') {
        const cmp = mock.mockCompare(answers, language);
        return { status: 200, json: { mock: true, language, model: 'mock', ...cmp } };
      }
      const remaining = await zhihu.quotaRemaining('zhida');
      if (remaining === 0) {
        const cmp = mock.mockCompare(answers, language);
        return {
          status: 200,
          json: {
            mock: true,
            degraded: true,
            reason: 'quota exhausted for group zhida_openai; serving mock data',
            language,
            model: 'mock',
            ...cmp,
          },
        };
      }
      const cmp = await zhihu.zhidaCompare({ question, answers, language, model });
      return {
        status: 200,
        json: {
          mock: false,
          language,
          model: cmp.model,
          ...resolveSources(cmp, answers),
        },
      };
    }

    return { status: 404, json: { error: 'unknown api route' } };
  } catch (e) {
    return { status: 502, json: { error: 'upstream Zhihu API error', detail: e.message } };
  }
}

module.exports = { handleApiRequest, mode };
