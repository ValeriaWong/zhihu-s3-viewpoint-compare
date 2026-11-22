// Frontend for the Zhihu S3 viewpoint comparison assistant.
// Flow: ask -> zhihu_search -> pick a question -> question_answers ->
// compare (zhida) -> consensus / divergence with source links.
'use strict';

const I18N = {
  zh: {
    title: '法律观点对比助手',
    tagline: '用知乎真实问答，对比法律观点，处处可溯源',
    language: '回答语言',
    model: '归纳模型',
    modelThinking: '深度思考（默认）',
    modelFast: '快速',
    modelAgent: '智能思考',
    searchPlaceholder: '输入法律问题，例如：未成年人签订的合同有效吗？',
    searchBtn: '搜索知乎问答',
    searchHint: '知乎内容以中文为主；提问可用中文、英文或俄文，对比结果按上方选择的语言呈现。',
    answersTitle: '同一问题下的多条回答摘要',
    selectAnswers: '勾选要参与对比的回答，点击生成观点对比。',
    compareBtn: '生成观点对比',
    compareTitle: '观点对比',
    consensus: '共识',
    divergence: '分歧',
    sources: '来源',
    votes: '赞同',
    comments: '评论',
    mockBadge: '模拟模式',
    liveBadge: '真实数据模式',
    mockNote: '模拟模式：未配置 Access Secret，展示模拟数据（结构与真实 API 一致）。',
    quota: '剩余额度',
    noResults: '没有找到相关结果，换个问法试试。',
    loading: '加载中…',
    error: '请求失败',
    pickFirst: '先搜索并点一个问题，拉取它的多条回答摘要。',
    needAnswers: '请至少勾选一条回答。',
    degraded: '额度已用完，当前展示模拟数据。',
    foot: '赛道：AI × 知识与探索 · 知乎黑客松 S3 湾区共创季 · 每个结论都带溯源链接回知乎原文',
  },
  en: {
    title: 'Legal Viewpoint Compare',
    tagline: 'Compare legal viewpoints using real Zhihu Q&A, every claim traceable',
    language: 'Answer language',
    model: 'Synthesis model',
    modelThinking: 'Thinking (default)',
    modelFast: 'Fast',
    modelAgent: 'Agent',
    searchPlaceholder: 'Ask a legal question, e.g. Are contracts signed by minors valid?',
    searchBtn: 'Search Zhihu Q&A',
    searchHint: 'Zhihu content is mainly Chinese; ask in Chinese, English or Russian. The comparison is shown in the language above.',
    answersTitle: 'Answer summaries under the same question',
    selectAnswers: 'Tick the answers to compare, then generate the comparison.',
    compareBtn: 'Generate viewpoint comparison',
    compareTitle: 'Viewpoint comparison',
    consensus: 'Consensus',
    divergence: 'Divergence',
    sources: 'Sources',
    votes: 'upvotes',
    comments: 'comments',
    mockBadge: 'Mock mode',
    liveBadge: 'Live data mode',
    mockNote: 'Mock mode: no Access Secret configured; showing mock data with the real API structure.',
    quota: 'Remaining quota',
    noResults: 'No results found; try a different phrasing.',
    loading: 'Loading…',
    error: 'Request failed',
    pickFirst: 'Search first, then open a question to load its answer summaries.',
    needAnswers: 'Please tick at least one answer.',
    degraded: 'Quota exhausted; showing mock data.',
    foot: 'Track: AI x Knowledge & Exploration · Zhihu Hackathon S3 Bay Area Co-creation · every conclusion links back to its Zhihu source',
  },
  ru: {
    title: 'Сравнение правовых позиций',
    tagline: 'Сравнение правовых позиций по реальным вопросам и ответам Zhihu, каждый вывод с источником',
    language: 'Язык ответа',
    model: 'Модель обобщения',
    modelThinking: 'Глубокое мышление (по умолчанию)',
    modelFast: 'Быстрая',
    modelAgent: 'Умная',
    searchPlaceholder: 'Задайте правовой вопрос, например: действителен ли договор, подписанный несовершеннолетним?',
    searchBtn: 'Искать на Zhihu',
    searchHint: 'Контент Zhihu в основном на китайском; спрашивайте на китайском, английском или русском. Сравнение показывается на выбранном выше языке.',
    answersTitle: 'Краткие ответы на один вопрос',
    selectAnswers: 'Отметьте ответы для сравнения и нажмите «Сравнить позиции».',
    compareBtn: 'Сравнить позиции',
    compareTitle: 'Сравнение позиций',
    consensus: 'Консенсус',
    divergence: 'Разногласия',
    sources: 'Источники',
    votes: 'голосов',
    comments: 'комментариев',
    mockBadge: 'Демо-режим',
    liveBadge: 'Реальные данные',
    mockNote: 'Демо-режим: Access Secret не настроен; показаны демонстрационные данные в структуре реального API.',
    quota: 'Остаток квоты',
    noResults: 'Ничего не найдено; попробуйте другую формулировку.',
    loading: 'Загрузка…',
    error: 'Ошибка запроса',
    pickFirst: 'Сначала выполните поиск и откройте вопрос, чтобы загрузить краткие ответы.',
    needAnswers: 'Отметьте хотя бы один ответ.',
    degraded: 'Квота исчерпана; показаны демонстрационные данные.',
    foot: 'Трек: ИИ × знания и исследования · Хакатон Zhihu S3, Большой залив · каждый вывод ссылается на источник на Zhihu',
  },
};

const state = {
  lang: 'zh',
  mode: 'mock',
  results: [],
  question: '',
  questionUrl: '',
  answers: [],
  selected: new Set(),
};

const $ = (id) => document.getElementById(id);
const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.zh[key] || key;

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : state.lang;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function avatarLetter(name) {
  return esc((name || '?').trim().slice(0, 1));
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.mode = data.mode || 'mock';
    const badge = $('modeBadge');
    badge.textContent = state.mode === 'live' ? t('liveBadge') : t('mockBadge');
    badge.className = 'badge ' + (state.mode === 'live' ? 'live' : 'mock');
    $('mockNote').hidden = state.mode !== 'mock';
    if (data.sampleQuestion) {
      $('query').value = data.sampleQuestion.title || '';
    }
  } catch (e) {
    $('modeBadge').textContent = t('mockBadge');
  }
  try {
    const res = await fetch('/api/quota');
    const data = await res.json();
    const items = data.items || (data.raw && (data.raw.Data || data.raw.data)) || [];
    const list = Array.isArray(items) ? items : [];
    const pick = (id) => list.find((it) => it.APIID === id || it.ApiId === id);
    const s = pick('zhihu_search');
    const a = pick('question_answers');
    const z = pick('zhida_openai');
    const parts = [];
    if (s) parts.push(`search ${s.RemainingQuota ?? s.Remaining ?? '?'}`);
    if (a) parts.push(`answers ${a.RemainingQuota ?? a.Remaining ?? '?'}`);
    if (z) parts.push(`zhida ${z.RemainingQuota ?? z.Remaining ?? '?'}`);
    $('quotaLine').textContent = parts.length ? `${t('quota')}: ${parts.join(' · ')}` : '';
  } catch (e) {
    $('quotaLine').textContent = '';
  }
}

async function doSearch() {
  const query = $('query').value.trim();
  if (!query) return;
  state.question = query;
  $('searchStatus').textContent = t('loading');
  $('results').innerHTML = '';
  $('answersCard').hidden = true;
  $('compareCard').hidden = true;
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&count=10`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || res.status);
    $('searchStatus').textContent = data.degraded ? t('degraded') : '';
    const items = data.items || [];
    state.results = items;
    if (items.length === 0) {
      $('results').innerHTML = `<p class="empty">${esc(t('noResults'))}</p>`;
      return;
    }
    $('results').innerHTML = items.map((it, i) => `
      <article class="result" data-idx="${i}">
        <div class="avatar">${avatarLetter(it.authorName)}</div>
        <div class="result-body">
          <h3><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
          <p class="summary-text">${esc(it.contentText)}</p>
          <p class="meta">${esc(it.authorName)} · ${it.voteUpCount ?? 0} ${esc(t('votes'))} · ${it.commentCount ?? 0} ${esc(t('comments'))}</p>
          <button class="open-btn" data-idx="${i}">${esc(t('answersTitle'))} →</button>
        </div>
      </article>`).join('');
    document.querySelectorAll('.open-btn').forEach((btn) => {
      btn.addEventListener('click', () => openQuestion(parseInt(btn.dataset.idx, 10)));
    });
  } catch (e) {
    $('searchStatus').textContent = `${t('error')}: ${esc(e.message)}`;
  }
}

async function openQuestion(idx) {
  const item = state.results[idx];
  if (!item || !item.url) return;
  state.questionUrl = item.url;
  state.question = item.title || state.question;
  $('compareStatus').textContent = t('loading');
  $('answers').innerHTML = '';
  $('answersCard').hidden = false;
  $('compareCard').hidden = true;
  try {
    const res = await fetch(`/api/answers?questionUrl=${encodeURIComponent(item.url)}&limit=20`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || res.status);
    $('compareStatus').textContent = data.degraded ? t('degraded') : '';
    const items = data.items || [];
    state.answers = items;
    state.selected = new Set(items.map((_, i) => i));
    if (items.length === 0) {
      $('answers').innerHTML = `<p class="empty">${esc(t('noResults'))}</p>`;
      return;
    }
    $('answers').innerHTML = items.map((a, i) => `
      <label class="answer">
        <input type="checkbox" data-idx="${i}" checked>
        <span class="answer-body">
          <span class="summary-text">${esc(a.summary)}</span>
          <span class="meta"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a></span>
        </span>
      </label>`).join('');
    document.querySelectorAll('#answers input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const i = parseInt(cb.dataset.idx, 10);
        if (cb.checked) state.selected.add(i);
        else state.selected.delete(i);
      });
    });
  } catch (e) {
    $('compareStatus').textContent = `${t('error')}: ${esc(e.message)}`;
  }
}

function renderPoints(listEl, items) {
  if (!items || items.length === 0) {
    listEl.innerHTML = '<li class="empty">—</li>';
    return;
  }
  listEl.innerHTML = items.map((it) => {
    const links = (it.sources || []).map((u, i) =>
      `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}]</a>`).join(' ');
    return `<li><p>${esc(it.text)}</p><p class="meta">${esc(t('sources'))}: ${links || '—'}</p></li>`;
  }).join('');
}

async function doCompare() {
  if (state.selected.size === 0) {
    $('compareStatus').textContent = t('needAnswers');
    return;
  }
  $('compareStatus').textContent = t('loading');
  const answers = [...state.selected].sort((a, b) => a - b).map((i) => state.answers[i]);
  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: state.question,
        questionUrl: state.questionUrl,
        answers: answers.map((a) => ({ summary: a.summary, url: a.url })),
        language: state.lang,
        model: $('model').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || res.status);
    $('compareStatus').textContent = data.degraded ? t('degraded') : '';
    $('compareSummary').textContent = data.summary || '';
    renderPoints($('consensusList'), data.consensus);
    renderPoints($('divergenceList'), data.divergence);
    $('compareCard').hidden = false;
    $('compareCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    $('compareStatus').textContent = `${t('error')}: ${esc(e.message)}`;
  }
}

$('searchBtn').addEventListener('click', doSearch);
$('query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});
$('compareBtn').addEventListener('click', doCompare);
$('lang').addEventListener('change', (e) => {
  state.lang = e.target.value;
  applyI18n();
  loadStatus();
});
$('model').addEventListener('change', () => {});

applyI18n();
loadStatus();
