'use strict';

{

// ── analyzer.js 纯函数测试 ───────────────────────────────────────────────────
// 覆盖：parseAndValidate 的合法输入、代码块剥离、缺字段报错
const { test, assert, assertEqual } = Suite;

const VALID = {
  domain:    '科技', sub_domain: 'AI', perspective: '技术视角',
  core_claim: '大语言模型将改变信息获取方式',
  asset_cards: [
    {
      type: 'core_viewpoint',
      title: '大语言模型改变信息入口',
      summary: '这张卡沉淀文章的核心判断。',
      source_title: '测试文章',
      keywords: ['AI', '信息入口'],
      why_reusable: '可作为后续技术观察文章的主判断。',
      reuse_score: 5,
    },
  ],
  creator_strength: '你把技术变化写成了可理解的经验判断，让读者知道它为什么和自己有关。',
  craft_review: {
    structure: '先提出变化，再落到应用场景，层次清楚。',
    diction: '关键词使用准确，没有堆砌术语。',
    rhythm: '长短句搭配自然，阅读压力不大。',
    elegance: '表达朴素，专业内容也容易读懂。',
    summary: '整体像一篇清楚、有温度的技术观察。',
  },
  strengths: [{ dimension: '论证结构', evidence: '用具体案例说明' }],
  nodes_hit: [{ name: 'GPT', type: 'concept', role: 'primary', contribution: '核心概念' }],
  new_concepts:     ['语言模型'],
  map_position:     'AI 核心',
  next_suggestions: [{ type: '延伸', suggestion: 'RAG 应用', reason: '填补检索空白', theory_ref: '' }],
  connections: ['自然语言处理'],
  reusable_clips: [{ type: '案例', content: '搜索方式正在变化', why_reusable: '可替换为其他工具变迁的例子' }],
  essence_insights: [{ viewpoint: '信息获取方式会从搜索转向对话', why_essential: '它概括了文章最核心的判断' }],
  tags:    ['AI', '大模型'],
  insight: '你展示了一种能力：跨越技术和人文的理解',
};

// ── 1. 合法 JSON ─────────────────────────────────────────────────────────────
test('parseAndValidate: 合法 JSON 返回 result 对象', () => {
  const { result } = parseAndValidate(JSON.stringify(VALID));
  assertEqual(result.domain,     '科技');
  assertEqual(result.core_claim, '大语言模型将改变信息获取方式');
  assert(Array.isArray(result.nodes_hit), 'nodes_hit 应为数组');
});

test('parseAndValidate: result 内 tags 原样保留', () => {
  const { result } = parseAndValidate(JSON.stringify(VALID));
  assertEqual(result.tags.length, 2);
  assertEqual(result.tags[0], 'AI');
});

test('parseAndValidate: 新创作反馈字段原样传递', () => {
  const { result } = parseAndValidate(JSON.stringify(VALID));
  assertEqual(result.asset_cards[0].type, 'core_viewpoint');
  assertEqual(result.creator_strength, VALID.creator_strength);
  assertEqual(result.craft_review.summary, VALID.craft_review.summary);
  assertEqual(result.reusable_clips[0].content, '搜索方式正在变化');
  assertEqual(result.essence_insights[0].viewpoint, '信息获取方式会从搜索转向对话');
});

test('parseAndValidate: 缺少新字段不报错，兼容旧分析记录', () => {
  const legacy = { ...VALID };
  delete legacy.creator_strength;
  delete legacy.asset_cards;
  delete legacy.craft_review;
  delete legacy.reusable_clips;
  delete legacy.essence_insights;
  const { result } = parseAndValidate(JSON.stringify(legacy));
  assertEqual(result.core_claim, VALID.core_claim);
});

test('makeUserPrompt: 包含 D6 新 schema 字段', () => {
  const prompt = makeUserPrompt('这是一篇足够长的测试文章，用于检查 prompt schema。');
  assert(prompt.includes('"asset_cards"'), '应要求 asset_cards');
  assert(prompt.includes('"type": "core_viewpoint"'), '应明确列出核心观点资产卡对象');
  assert(prompt.includes('"type": "writing_fingerprint"'), '应明确列出写作指纹资产卡对象');
  assert(!prompt.includes('core_viewpoint|knowledge_node'), '不应再用管道字符串作为 type 示例');
  assert(prompt.includes('"creator_strength"'), '应要求 creator_strength');
  assert(prompt.includes('"craft_review"'), '应要求 craft_review');
  assert(prompt.includes('"praise"'), '写作技法应要求 praise');
  assert(prompt.includes('"praise_quote"'), '写作技法应要求 praise_quote');
  assert(!prompt.includes('"structure"'), '新 prompt 不应再要求结构/用词/节奏/雅俗四格');
  assert(prompt.includes('"reusable_clips"'), '应要求 reusable_clips');
  assert(prompt.includes('"essence_insights"'), '应要求 essence_insights');
});

test('getApiKeyForProvider: 用户 Key 优先于比赛默认 Key', () => {
  const old = globalThis.COMPETITION_DEFAULTS;
  const oldProviders = globalThis.PROVIDERS;
  globalThis.PROVIDERS = { zhipu: { models: [{ id: 'glm-4-flash' }] }, deepseek: { models: [{ id: 'deepseek-chat' }] } };
  globalThis.COMPETITION_DEFAULTS = {
    enabled: true,
    provider: 'zhipu',
    model: 'glm-4-flash',
    apiKey: 'competition-key',
  };

  try {
    assertEqual(getApiKeyForProvider('zhipu', { zhipu: 'user-key' }), 'user-key');
    assertEqual(getApiKeyForProvider('zhipu', {}), 'competition-key');
    assertEqual(getApiKeyForProvider('deepseek', {}), '');
  } finally {
    globalThis.COMPETITION_DEFAULTS = old;
    globalThis.PROVIDERS = oldProviders;
  }
});

test('resolveProviderModel: 无保存设置时可落到比赛默认模型', () => {
  const old = globalThis.COMPETITION_DEFAULTS;
  const oldProviders = globalThis.PROVIDERS;
  globalThis.PROVIDERS = { zhipu: { models: [{ id: 'glm-4-flash' }] }, deepseek: { models: [{ id: 'deepseek-chat' }] } };
  globalThis.COMPETITION_DEFAULTS = {
    enabled: true,
    provider: 'zhipu',
    model: 'glm-4-air',
    apiKey: 'competition-key',
  };

  try {
    assertEqual(resolveProviderModel({}).provider, 'zhipu');
    assertEqual(resolveProviderModel({}).model, 'glm-4-air');
    assertEqual(resolveProviderModel({ provider: 'deepseek', model: 'deepseek-chat' }).provider, 'deepseek');
  } finally {
    globalThis.COMPETITION_DEFAULTS = old;
    globalThis.PROVIDERS = oldProviders;
  }
});

// ── 2. markdown 代码块剥离 ───────────────────────────────────────────────────
test('parseAndValidate: 剥离 ```json 代码块包裹', () => {
  const raw = '```json\n' + JSON.stringify(VALID) + '\n```';
  const { result } = parseAndValidate(raw);
  assertEqual(result.domain, '科技');
});

test('parseAndValidate: 剥离无语言标记的 ``` 包裹', () => {
  const raw = '```\n' + JSON.stringify(VALID) + '\n```';
  const { result } = parseAndValidate(raw);
  assertEqual(result.core_claim, VALID.core_claim);
});

// ── 3. 缺字段报错 ────────────────────────────────────────────────────────────
test('parseAndValidate: domain 为空字符串时抛出', () => {
  let threw = false;
  try { parseAndValidate(JSON.stringify({ ...VALID, domain: '' })); }
  catch { threw = true; }
  assert(threw, '应抛出缺少 domain 的错误');
});

test('parseAndValidate: core_claim 缺失时抛出', () => {
  let threw = false;
  try { parseAndValidate(JSON.stringify({ ...VALID, core_claim: undefined })); }
  catch { threw = true; }
  assert(threw, '应抛出缺少 core_claim 的错误');
});

test('parseAndValidate: nodes_hit 为空数组时抛出', () => {
  let threw = false;
  try { parseAndValidate(JSON.stringify({ ...VALID, nodes_hit: [] })); }
  catch { threw = true; }
  assert(threw, 'nodes_hit 为空时应抛出');
});

test('parseAndValidate: next_suggestions 为空数组时抛出', () => {
  let threw = false;
  try { parseAndValidate(JSON.stringify({ ...VALID, next_suggestions: [] })); }
  catch { threw = true; }
  assert(threw, 'next_suggestions 为空时应抛出');
});

test('parseAndValidate: 非 JSON 字符串时抛出格式异常', () => {
  let threw = false;
  try { parseAndValidate('这不是JSON'); }
  catch { threw = true; }
  assert(threw, '非 JSON 输入应抛出格式异常');
});

}
