// Mock data for demo mode (no Access Secret configured).
// Structurally identical to the real API shapes; content is demo-only.
// Every mock response is flagged mock: true by the server.
'use strict';

const SAMPLE_QUESTION_URL = 'https://www.zhihu.com/question/600000001';
const SAMPLE_QUESTION_TITLE = '未成年人签订的合同有效吗？';

function mockSearch(_query) {
  return {
    items: [
      {
        title: '未成年人签订的合同有效吗？',
        contentType: 'Answer',
        contentId: '900000001',
        contentText: '关键看年龄：不满 8 周岁是无民事行为能力人，合同无效；8 周岁以上是限制民事行为能力人，纯获利益或与其年龄、智力相适应的合同有效，其余合同效力待定，须法定代理人追认……',
        url: 'https://www.zhihu.com/question/600000001/answer/900000001',
        commentCount: 412,
        voteUpCount: 3284,
        authorName: '民法小讲堂',
        authorAvatar: '',
        authorBadge: '法律领域答主',
        editTime: 1763000000,
        authorityLevel: 3,
        rankingScore: 0.92,
      },
      {
        title: '民法典第 145 条：限制民事行为能力人的合同效力全解析',
        contentType: 'Article',
        contentId: '900000002',
        contentText: '本文逐句拆解民法典第 145 条：效力待定不是无效，追认、催告与撤销权的行使规则，以及相对人如何保护自己的交易安全……',
        url: 'https://www.zhihu.com/question/600000002',
        commentCount: 187,
        voteUpCount: 1521,
        authorName: '法言法语',
        authorAvatar: '',
        authorBadge: '法学博士',
        editTime: 1762500000,
        authorityLevel: 4,
        rankingScore: 0.88,
      },
      {
        title: '16 岁打工签劳动合同有效吗？',
        contentType: 'Answer',
        contentId: '900000003',
        contentText: '16 周岁以上不满 18 周岁，以自己的劳动收入为主要生活来源的，视为完全民事行为能力人，劳动合同原则上有效；但用人单位仍须遵守未成年工特殊保护规定……',
        url: 'https://www.zhihu.com/question/600000003/answer/900000003',
        commentCount: 96,
        voteUpCount: 986,
        authorName: '劳动法观察',
        authorAvatar: '',
        authorBadge: '',
        editTime: 1762000000,
        authorityLevel: 2,
        rankingScore: 0.81,
      },
      {
        title: '未成年人直播打赏的钱能追回吗？',
        contentType: 'Answer',
        contentId: '900000004',
        contentText: '打赏行为的效力同样按年龄分段判断；实践中追回的关键是举证：证明打赏人是未成年人、打赏金额与其年龄智力不相适应，以及法定代理人事后未追认……',
        url: 'https://www.zhihu.com/question/600000004/answer/900000004',
        commentCount: 523,
        voteUpCount: 2740,
        authorName: '民法小讲堂',
        authorAvatar: '',
        authorBadge: '法律领域答主',
        editTime: 1761500000,
        authorityLevel: 3,
        rankingScore: 0.85,
      },
    ],
    hasMore: false,
  };
}

function mockAnswers(_questionUrl) {
  return {
    items: [
      {
        contentType: 'Answer',
        contentToken: '900000001',
        url: 'https://www.zhihu.com/question/600000001/answer/900000001',
        summary: '按《民法典》第 145 条分段判断：不满 8 周岁是无民事行为能力人，合同无效；8 周岁以上是限制民事行为能力人，纯获利益或与其年龄、智力相适应的合同有效。',
        stance: 'affirmative',
      },
      {
        contentType: 'Answer',
        contentToken: '900000005',
        url: 'https://www.zhihu.com/question/600000001/answer/900000005',
        summary: '其余合同属于效力待定，不是当然无效；经法定代理人追认后有效，追认前相对人可以催告，法定代理人在一个月内未作表示的视为拒绝追认。',
        stance: 'conditional',
      },
      {
        contentType: 'Answer',
        contentToken: '900000006',
        url: 'https://www.zhihu.com/question/600000001/answer/900000006',
        summary: '不满 8 周岁的未成年人没有民事行为能力，签订的合同一律无效；法定代理人可以要求返还财产，恢复原状。',
        stance: 'negative',
      },
      {
        contentType: 'Answer',
        contentToken: '900000007',
        url: 'https://www.zhihu.com/question/600000001/answer/900000007',
        summary: '“效力待定”不等于“无效”：未经追认的合同在追认之前效力未定，善意相对人享有催告权和撤销权，撤销权行使后合同才确定不生效。',
        stance: 'nuanced',
      },
      {
        contentType: 'Answer',
        contentToken: '900000008',
        url: 'https://www.zhihu.com/question/600000001/answer/900000008',
        summary: '实务关键在举证：年龄证明、法定代理人是否书面追认、合同金额是否与未成年人年龄智力相适应；直播打赏等场景已有法院支持返还的判例。',
        stance: 'practical',
      },
    ],
    paging: { isEnd: true, nextOffset: null, totals: 5 },
  };
}

// Mock viewpoint synthesis, built from the mock answers' stances.
// Same JSON shape as the live zhida path. Sources are URLs.
const MOCK_COMPARISON = {
  zh: {
    summary: '五条回答都以《民法典》第 145 条为判断核心：未成年人合同的效力首先按年龄分段；分歧集中在“效力待定”与“无效”的边界、追认期限与相对人权利，以及实务中的举证责任。',
    consensus: [
      { text: '各方都以《民法典》第 145 条为共同判断依据，年龄是决定合同效力的第一道门槛。', sources: [0, 1, 2, 3, 4] },
      { text: '纯获利益的合同对未成年人始终有效，这一点没有分歧。', sources: [0] },
    ],
    divergence: [
      { text: '其余合同是“效力待定”还是“无效”：一方认为须法定代理人追认、追认前效力未定，另一方对不满 8 周岁坚持合同一律无效。', sources: [1, 2] },
      { text: '追认期限与相对人权利的边界：催告后一个月未表示视为拒绝追认，善意相对人在此期间享有撤销权。', sources: [1, 3] },
      { text: '实务举证责任与返还范围：年龄证明、书面追认证据、金额是否相适应，是法院支持返还的关键。', sources: [4] },
    ],
  },
  en: {
    summary: 'All five answers use Article 145 of the Civil Code as the core test: a minor\'s contract is first judged by age. The disagreements are about the boundary between "pending validity" and "invalid", the ratification deadline and the counterparty\'s rights, and the burden of proof in practice.',
    consensus: [
      { text: 'All sides use Article 145 of the Civil Code as the common test; age is the first threshold for a contract\'s validity.', sources: [0, 1, 2, 3, 4] },
      { text: 'Contracts that purely benefit the minor are always valid; there is no disagreement on this point.', sources: [0] },
    ],
    divergence: [
      { text: 'Whether other contracts are "pending validity" or "invalid": one side says they need a legal representative\'s ratification, while another insists contracts signed by children under 8 are void.', sources: [1, 2] },
      { text: 'The ratification deadline and the counterparty\'s rights: no reply within one month of notice counts as refusal, and a good-faith counterparty holds a right of revocation in the meantime.', sources: [1, 3] },
      { text: 'Burden of proof and scope of restitution in practice: age evidence, written ratification, and whether the amount fits the minor\'s age and intellect decide whether courts order refunds.', sources: [4] },
    ],
  },
  ru: {
    summary: 'Все пять ответов опираются на статью 145 Гражданского кодекса как на главный критерий: действительность договора несовершеннолетнего в первую очередь зависит от возраста. Разногласия касаются границы между «отложенной действительностью» и «недействительностью», срока подтверждения и прав контрагента, а также бремени доказывания на практике.',
    consensus: [
      { text: 'Все стороны используют статью 145 Гражданского кодекса как общий критерий; возраст — первый порог действительности договора.', sources: [0, 1, 2, 3, 4] },
      { text: 'Договоры, которые только выгодны несовершеннолетнему, всегда действительны; по этому пункту разногласий нет.', sources: [0] },
    ],
    divergence: [
      { text: 'Являются ли остальные договоры «отложенно действительными» или «недействительными»: одна сторона требует подтверждения законным представителем, другая настаивает, что договоры детей младше 8 лет недействительны.', sources: [1, 2] },
      { text: 'Срок подтверждения и права контрагента: отсутствие ответа в течение месяца после уведомления считается отказом, а добросовестный контрагент в это время имеет право на отказ от договора.', sources: [1, 3] },
      { text: 'Бремя доказывания и объём возврата на практике: подтверждение возраста, письменное согласие представителя и соответствие суммы возрасту и интеллекту решают, вернёт ли суд деньги.', sources: [4] },
    ],
  },
};

function mockCompare(answers, language) {
  const lang = MOCK_COMPARISON[language] ? language : 'zh';
  const tpl = MOCK_COMPARISON[lang];
  const urls = (answers || []).map((a) => a.url || '');
  const resolve = (indices) => indices.map((i) => urls[i]).filter(Boolean);
  return {
    summary: tpl.summary,
    consensus: tpl.consensus.map((c) => ({ text: c.text, sources: resolve(c.sources) })),
    divergence: tpl.divergence.map((d) => ({ text: d.text, sources: resolve(d.sources) })),
    model: 'mock',
  };
}

function mockQuota() {
  const item = (id, total, used) => ({ APIID: id, TotalQuota: total, TotalUsed: used, RemainingQuota: total - used });
  return {
    items: [
      item('global_search', 5000, 4),
      item('zhihu_search', 10000, 12),
      item('hot_list', 100, 2),
      item('question_answers', 100, 3),
      item('user_data', 100, 0),
      item('creator', 100, 0),
      item('zhida_openai', 200000, 1500),
      item('knowledge', 500, 0),
      item('tools', 100, 0),
    ],
  };
}

module.exports = {
  SAMPLE_QUESTION_URL,
  SAMPLE_QUESTION_TITLE,
  mockSearch,
  mockAnswers,
  mockCompare,
  mockQuota,
};
