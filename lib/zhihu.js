// Zhihu official API client.
// Only the API shapes verified on 2026-11-21 are used.
// Auth: the Access Secret is read ONLY from process.env.ZHIHU_ACCESS_SECRET.
// It is never logged, never written to disk, and never sent to the browser.
'use strict';

const API_BASE = 'https://developer.zhihu.com';
const ZHIDA_URL = 'https://developer.zhihu.com/v1/chat/completions';

// Quota group names returned by /api/v1/quota, mapped from our calls.
const QUOTA_GROUP = {
  search: 'zhihu_search',
  answers: 'question_answers',
  zhida: 'zhida_openai',
};

function hasSecret() {
  return Boolean(process.env.ZHIHU_ACCESS_SECRET);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.ZHIHU_ACCESS_SECRET}`,
    'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
    'Content-Type': 'application/json',
  };
}

function pick(obj, names) {
  for (const n of names) {
    if (obj && obj[n] !== undefined && obj[n] !== null) return obj[n];
  }
  return undefined;
}

// ---- tiny in-memory cache (per process, TTL in ms) ----
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > 500) {
    cache.delete(cache.keys().next().value);
  }
}

// ---- quota ----
let quotaCache = { at: 0, data: null };
const QUOTA_CACHE_TTL_MS = 5 * 60 * 1000;

async function getQuota() {
  const now = Date.now();
  if (quotaCache.data && now - quotaCache.at < QUOTA_CACHE_TTL_MS) return quotaCache.data;
  const res = await fetch(`${API_BASE}/api/v1/quota`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`quota HTTP ${res.status}`);
  const data = await res.json();
  quotaCache = { at: now, data };
  return data;
}

// Remaining quota for a group, or null when it cannot be determined.
// A null result must NOT block a call; only an explicit 0 triggers degradation.
async function quotaRemaining(group) {
  try {
    const data = await getQuota();
    const raw = data?.Data ?? data?.data ?? data;
    const arr = Array.isArray(raw) ? raw : (raw?.Items || raw?.items || Object.values(raw || {}));
    const list = Array.isArray(arr) ? arr : [];
    const hit = list.find((it) => it && (it.APIID === group || it.ApiId === group || it.Name === group || it.ApiID === group));
    if (!hit) return null;
    const remaining = pick(hit, ['RemainingQuota', 'Remaining', 'remaining']);
    return typeof remaining === 'number' ? remaining : null;
  } catch (e) {
    return null;
  }
}

// ---- response normalization ----
// The exact response envelope was not spelled out in the verified docs,
// so extraction is tolerant: Data.Items, Data array, or top-level array.
function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const d = data.Data ?? data.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    if (Array.isArray(d.Items)) return d.Items;
    if (Array.isArray(d.items)) return d.items;
  }
  if (Array.isArray(data.Items)) return data.Items;
  return [];
}

function normalizeSearchItem(raw) {
  return {
    title: pick(raw, ['Title', 'title']) || '',
    contentType: pick(raw, ['ContentType', 'contentType']) || '',
    contentId: pick(raw, ['ContentID', 'ContentId', 'contentId']) || '',
    contentText: pick(raw, ['ContentText', 'contentText', 'Summary', 'summary']) || '',
    url: pick(raw, ['Url', 'url']) || '',
    commentCount: pick(raw, ['CommentCount', 'commentCount']) ?? 0,
    voteUpCount: pick(raw, ['VoteUpCount', 'voteUpCount']) ?? 0,
    authorName: pick(raw, ['AuthorName', 'authorName']) || '',
    authorAvatar: pick(raw, ['AuthorAvatar', 'authorAvatar']) || '',
    authorBadge: pick(raw, ['AuthorBadge', 'authorBadge']) || '',
    editTime: pick(raw, ['EditTime', 'editTime']) || null,
    authorityLevel: pick(raw, ['AuthorityLevel', 'authorityLevel']) ?? null,
    rankingScore: pick(raw, ['RankingScore', 'rankingScore']) ?? null,
  };
}

function normalizeAnswerItem(raw) {
  return {
    contentType: pick(raw, ['ContentType', 'contentType']) || '',
    contentToken: pick(raw, ['ContentToken', 'contentToken']) || '',
    url: pick(raw, ['Url', 'url']) || '',
    summary: pick(raw, ['Summary', 'summary', 'ContentText', 'contentText']) || '',
  };
}

// zhihu_search: Query (required), Count (default 10, max 10).
// Verified: HasMore is always false, no pagination, max 10 per call.
async function zhihuSearch(query, count = 10) {
  const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 10);
  const key = `search:${query}:${n}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, cached: true };
  const url = new URL(`${API_BASE}/api/v1/content/zhihu_search`);
  url.searchParams.set('Query', query);
  url.searchParams.set('Count', String(n));
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`zhihu_search HTTP ${res.status}`);
  const data = await res.json();
  const out = {
    items: extractItems(data).map(normalizeSearchItem),
    hasMore: false,
  };
  cacheSet(key, out, 60 * 60 * 1000);
  return out;
}

// question_answers: QuestionUrl (full question URL), Offset, Limit (1-50, default 20).
async function questionAnswers(questionUrl, offset = 0, limit = 20) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const key = `answers:${questionUrl}:${off}:${lim}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, cached: true };
  const url = new URL(`${API_BASE}/api/v1/content/question_answers`);
  url.searchParams.set('QuestionUrl', questionUrl);
  url.searchParams.set('Offset', String(off));
  url.searchParams.set('Limit', String(lim));
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`question_answers HTTP ${res.status}`);
  const data = await res.json();
  const d = data?.Data ?? data?.data ?? {};
  const paging = d?.Paging ?? d?.paging ?? {};
  const out = {
    items: extractItems(data).map(normalizeAnswerItem),
    paging: {
      isEnd: pick(paging, ['IsEnd', 'isEnd']) ?? true,
      nextOffset: pick(paging, ['NextOffset', 'nextOffset']) ?? null,
      totals: pick(paging, ['Totals', 'totals']) ?? null,
    },
  };
  cacheSet(key, out, 60 * 60 * 1000);
  return out;
}

// ---- zhida (OpenAI-compatible chat completions) ----
const ZHIDA_MODELS = {
  fast: 'zhida-fast-1p5',
  thinking: 'zhida-thinking-1p5',
  agent: 'zhida-agent',
};

function extractJsonObject(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

// Ask zhida to compare viewpoints and return structured JSON.
// Sources come back as 1-based indices into the answers array; the server
// resolves them to URLs before responding to the browser.
async function zhidaCompare({ question, answers, language, model = 'thinking' }) {
  const modelId = ZHIDA_MODELS[model] || ZHIDA_MODELS.thinking;
  const langName = { zh: 'Chinese', en: 'English', ru: 'Russian' }[language] || 'Chinese';
  const numbered = answers
    .map((a, i) => `[${i + 1}] ${a.summary || ''}\nSource: ${a.url || ''}`)
    .join('\n\n');
  const prompt = [
    `You are a legal viewpoint comparison assistant. The user asked (in ${langName}): ${question}`,
    'Below are several answer summaries from Zhihu on this question. Compare the viewpoints.',
    `Reply in ${langName}.`,
    'Return ONLY a JSON object with this shape, no other text:',
    '{"summary": "one-paragraph overview", "consensus": [{"text": "...", "sources": [1, 2]}], "divergence": [{"text": "...", "sources": [1, 3]}]}',
    'Each consensus/divergence item must cite the answer numbers it is based on in "sources".',
    '',
    numbered,
  ].join('\n');
  const res = await fetch(ZHIDA_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`zhida HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const reasoning = data?.choices?.[0]?.message?.reasoning_content || '';
  const parsed = extractJsonObject(content);
  if (parsed && typeof parsed === 'object') {
    return {
      summary: parsed.summary || '',
      consensus: Array.isArray(parsed.consensus) ? parsed.consensus : [],
      divergence: Array.isArray(parsed.divergence) ? parsed.divergence : [],
      raw: content,
      reasoning,
      model: modelId,
    };
  }
  return { summary: content, consensus: [], divergence: [], raw: content, reasoning, model: modelId };
}

module.exports = {
  hasSecret,
  getQuota,
  quotaRemaining,
  zhihuSearch,
  questionAnswers,
  zhidaCompare,
  QUOTA_GROUP,
  ZHIDA_MODELS,
};
