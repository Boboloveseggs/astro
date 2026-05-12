'use strict';

{

// ── D6 分析卡片重组测试 ───────────────────────────────────────────────────
const { test, assert, assertEqual } = Suite;

test('PANEL_ONBOARDING_SECTIONS: 评委使用版不暴露集中式长引导', () => {
  assert(!PANEL_ONBOARDING_SECTIONS.pitch, '当前阶段不应提供集中式演示引导');
  assertEqual(normalizeOnboardingSection('pitch'), 'analyze');
  assertEqual(panelOnboardingSteps('pitch'), panelOnboardingSteps('analyze'));
});

test('makeUserPrompt: 要求 AI 输出知乎环境建议', () => {
  const prompt = makeUserPrompt('测试文章正文', {
    source: 'zhihu_search',
    query: '细节写作',
    results: [{ title: '知乎相关问题', excerpt: '社区讨论摘要', url: 'https://www.zhihu.com/question/1' }],
  });
  assert(prompt.includes('zhihu_environment_advice'), 'prompt 应要求输出知乎环境建议字段');
  assert(prompt.includes('question_contexts'), 'prompt 应要求输出问题语境');
  assert(prompt.includes('search_keywords'), 'prompt 应要求输出知乎搜索关键词');
  assert(prompt.includes('next_zhihu_topics'), 'prompt 应要求输出下一篇知乎选题');
  assert(prompt.includes('hotspot_hooks'), 'prompt 应要求输出现实切口');
  assert(prompt.includes('知乎相关问题'), 'prompt 应纳入真实知乎搜索结果标题');
  assert(prompt.includes('社区讨论摘要'), 'prompt 应纳入真实知乎搜索结果摘要');
});

const ANALYSIS_FIXTURE = {
  domain: '文学',
  sub_domain: '叙事',
  perspective: '创作视角',
  core_claim: '细节承载结构',
  asset_cards: [
    {
      type: 'core_viewpoint',
      title: '细节承载结构',
      summary: '这篇文章把细节当成结构入口。',
      source_title: '测试文章',
      keywords: ['细节', '结构'],
      why_reusable: '可以作为下一篇写作方法文章的主判断。',
      reuse_score: 5,
    },
  ],
  creator_strength: '你能把一个细节写成结构线索，这让文章不仅有观点，也有可感的现场。',
  craft_review: {
    structure: '先铺场景再提出判断，推进自然。',
    diction: '用词具体，没有空泛的大词。',
    rhythm: '短句和长句交替，读起来有停顿。',
    elegance: '表达亲近，雅俗平衡。',
    summary: '整体有清楚的语文感和创作者自觉。',
  },
  strengths: [{ dimension: '案例质量', evidence: '用具体场景支撑判断' }],
  nodes_hit: [{ name: '叙事结构', type: 'concept', role: 'primary', contribution: '提供结构判断' }],
  new_concepts: ['场景线索'],
  map_position: '位于文学叙事方法的细节分支',
  next_suggestions: [{ type: '延伸', suggestion: '继续写场景如何推动观点', reason: '可形成系列', theory_ref: '叙事学' }],
  zhihu_environment_advice: {
    question_contexts: [
      { question_type: '为什么细节能决定一篇文章的可信度？', why_fit: '这篇文章已经把细节和结构之间的关系讲清楚。' },
    ],
    community_difference: '它不是泛泛讲写作技巧，而是把细节当成结构入口。',
    search_keywords: ['细节写作', '叙事结构', '知乎创作'],
    next_zhihu_topics: [
      { title: '为什么好文章不是观点越多越好？', angle: '从细节承载观点切入', reason: '能把旧观点转成新的知乎回答。' },
    ],
    hotspot_hooks: [
      { theme: 'AI 写作', hook: '讨论 AI 为什么容易丢失细节现场', reason: '能把写作方法连接到当下创作讨论。' },
    ],
  },
  connections: ['修辞学'],
  reusable_clips: [{ type: '金句', content: '细节是结构的入口', why_reusable: '可用于后续写作方法文章' }],
  essence_insights: [{ viewpoint: '细节不是装饰，而是结构', why_essential: '它提炼了文章的核心立意' }],
  insight: '你在这篇文章里做到了一件真正困难的事：把感受变成判断。',
};

test('groupPosition: 渲染作品资产卡分组', () => {
  const html = groupPosition(ANALYSIS_FIXTURE);
  assert(html.includes('analysis-group-title'), '应有分组标题');
  assert(html.includes('作品资产卡'), '应显示作品资产卡分组');
  assert(html.includes('核心观点'), '应显示核心观点资产卡');
  assert(html.includes('为什么可复用'), '资产卡应说明复用价值');
  assert(html.includes('用于新文章'), '资产卡应提供用于新文章入口');
  assert(html.includes('细节承载结构'), '应包含核心判断');
});

test('groupCreatorFeedback: 渲染创作者优势、技法和文章优势', () => {
  const html = groupCreatorFeedback(ANALYSIS_FIXTURE);
  assert(html.includes('写作指纹证据'), '应显示写作指纹证据分组');
  assert(html.includes('创作者优势判断'), '应渲染 creator_strength');
  assert(html.includes('写作技法'), '应渲染 craft_review');
  assert(html.includes('文章优势'), '应保留旧 strengths');
});

test('cardCraftReview: 新技法卡渲染知识图鉴夸奖和整体气质', () => {
  const html = cardCraftReview({
    craft_review: {
      praise: '这段写得真好，最难得的是你没有急着下判断，而是先把现场摆出来。',
      praise_quote: '细节是结构的入口',
      summary: '清醒、具体，而且有一点温柔。',
    },
  });
  assert(html.includes('知识图鉴夸你'), '应显示知识图鉴夸奖标题');
  assert(html.includes('teacher-quote'), '应渲染红笔波浪线摘句');
  assert(html.includes('整体气质'), '应显示整体气质');
});

test('cardCraftReview: 旧 structure/diction/rhythm/elegance 记录可 fallback', () => {
  const html = cardCraftReview(ANALYSIS_FIXTURE);
  assert(html.includes('知识图鉴夸你'), '旧记录也应汇总成夸奖卡');
  assert(html.includes('先铺场景再提出判断'), '旧结构字段应进入 fallback 文案');
});

test('groupMaterials: 渲染素材、立意、概念和连接', () => {
  const html = groupMaterials(ANALYSIS_FIXTURE);
  assert(html.includes('素材资产'), '应显示素材资产分组');
  assert(html.includes('可复用素材'), '应渲染 reusable_clips');
  assert(html.includes('立意精华'), '应渲染 essence_insights');
  assert(html.includes('场景线索'), '应保留 new_concepts');
  assert(html.includes('修辞学'), '应保留 connections');
});

test('groupZhihuEnvironment: 渲染知乎环境建议和社区参照', () => {
  const html = groupZhihuEnvironment(ANALYSIS_FIXTURE);
  assert(html.includes('知乎环境建议'), '应显示知乎环境建议分组');
  assert(html.includes('社区参照原则'), '应说明知乎 API 只是社区语境参照');
  assert(html.includes('适合进入的问题语境'), '应显示问题语境');
  assert(html.includes('和常见讨论的差异点'), '应显示差异点');
  assert(html.includes('可用于知乎搜索 / 热榜匹配的关键词'), '应显示搜索关键词');
  assert(html.includes('下一篇知乎选题'), '应显示下一篇知乎选题');
  assert(html.includes('现实切口'), '应显示现实切口');
});

test('groupExtension: 渲染旧文章复利、地图、节点和作品识别', () => {
  const html = groupExtension(ANALYSIS_FIXTURE);
  assert(html.includes('旧文章复利'), '应显示旧文章复利分组');
  assert(html.includes('下一篇创作方向'), '应保留 suggestions');
  assert(html.includes('进入知识宇宙的位置'), '应保留 map_position');
  assert(html.includes('知识节点资产'), '应保留 nodes');
  assert(html.includes('作品识别到的你'), '应保留 insight');
});

test('renderResult: 旧记录缺少 D6 新字段时仍可渲染', () => {
  const legacy = { ...ANALYSIS_FIXTURE };
  delete legacy.asset_cards;
  delete legacy.creator_strength;
  delete legacy.craft_review;
  delete legacy.reusable_clips;
  delete legacy.essence_insights;
  const host = document.createElement('div');
  host.id = 'analysisTestHost';
  document.body.appendChild(host);
  renderResult(legacy, JSON.stringify(legacy), 'analysisTestHost');
  assert(host.textContent.includes('作品资产卡'), '旧记录仍应显示作品资产卡');
  assert(host.textContent.includes('核心观点'), '旧记录仍应回退生成核心观点资产');
  assert(host.textContent.includes('文章优势'), '旧记录仍应显示旧 strengths');
  assert(!host.textContent.includes('undefined'), '旧记录不应渲染 undefined');
  host.remove();
});

test('setLoading: 显示知识图鉴加载状态并清理轮换计时器', () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <button id="analyzeBtn">开始分析</button>
    <div id="loading" style="display:none">
      <div id="knowledgeLoadingMessage">初始</div>
    </div>
  `;
  document.body.appendChild(host);

  try {
    setLoading(true);
    assertEqual(document.getElementById('loading').style.display, 'block');
    assertEqual(document.getElementById('analyzeBtn').textContent, '知识图鉴分析中…');
    assert(knowledgeLoadingTimer, '开启 loading 时应启动加载文案轮换计时器');

    setLoading(false);
    assertEqual(document.getElementById('loading').style.display, 'none');
    assertEqual(document.getElementById('analyzeBtn').textContent, '开始分析');
    assertEqual(knowledgeLoadingTimer, null);
  } finally {
    stopKnowledgeLoadingMessages();
    host.remove();
  }
});

test('recaptureCurrentPage: 项目栏小按钮可请求后台重新抓取并回到分析页', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <button id="recaptureBtn" title="重新抓取当前知乎页"></button>
    <button class="tab-btn" data-tab="analyze"></button>
    <button class="tab-btn" data-tab="assets"></button>
    <button class="tab-btn" data-tab="review"></button>
    <button class="tab-btn" data-tab="map"></button>
    <button class="tab-btn" data-tab="fingerprint"></button>
    <section id="analyzeTab"></section>
    <section id="assetsTab"></section>
    <section id="reviewTab"></section>
    <section id="mapTab"></section>
    <section id="fingerprintTab"></section>
    <div id="errorBox" style="display:block"></div>
    <div id="result"></div>
    <div id="detectedCard"></div>
    <div id="detectedLabel"></div>
    <div id="detectedTitle"></div>
    <div id="detectedMeta"></div>
    <div id="toggleManual"></div>
    <div id="waitingSection"></div>
    <button id="analyzeBtn"></button>
  `;
  document.body.appendChild(host);

  const oldChrome = window.chrome;
  const article = {
    type: 'article',
    title: '重新抓取的新文章',
    body: '这是一段足够长的知乎文章正文，用来验证项目栏旁边的小按钮可以重新抓取当前页面。',
    author: '作者',
    published_at: '2026-05-10',
  };
  let sent = null;
  window.chrome = {
    tabs: {
      query: async () => [{ id: 42, url: 'https://www.zhihu.com/p/123456' }],
    },
    runtime: {
      sendMessage: async (msg) => {
        sent = msg;
        return { ok: true, article };
      },
    },
  };

  try {
    await recaptureCurrentPage();
    assertEqual(sent, {
      action: 'capture_current_tab',
      tabId: 42,
      tabUrl: 'https://www.zhihu.com/p/123456',
    }, '应把当前知乎标签页交给后台抓取');
    assertEqual(document.body.dataset.activeTab, 'analyze', '抓取后应回到分析页');
    assertEqual(capturedText, article.body, '应载入新抓取正文');
    assertEqual(document.getElementById('detectedTitle').textContent, article.title);
    assertEqual(document.getElementById('detectedCard').style.display, 'block');
    assertEqual(document.getElementById('errorBox').style.display, 'none');
    assert(!document.getElementById('recaptureBtn').disabled, '完成后按钮应恢复可点击');
  } finally {
    window.chrome = oldChrome;
    host.remove();
    document.body.removeAttribute('data-active-tab');
  }
});

test('recaptureCurrentPage: 优先直接注入知乎页抓取，不依赖后台返回', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <button id="recaptureBtn" title="重新抓取当前知乎页"></button>
    <button class="tab-btn" data-tab="analyze"></button>
    <button class="tab-btn" data-tab="assets"></button>
    <button class="tab-btn" data-tab="review"></button>
    <button class="tab-btn" data-tab="map"></button>
    <button class="tab-btn" data-tab="fingerprint"></button>
    <section id="analyzeTab"></section>
    <section id="assetsTab"></section>
    <section id="reviewTab"></section>
    <section id="mapTab"></section>
    <section id="fingerprintTab"></section>
    <div id="errorBox" style="display:block"></div>
    <div id="result"></div>
    <div id="detectedCard"></div>
    <div id="detectedLabel"></div>
    <div id="detectedTitle"></div>
    <div id="detectedMeta"></div>
    <div id="toggleManual"></div>
    <div id="waitingSection"></div>
    <button id="analyzeBtn"></button>
  `;
  document.body.appendChild(host);

  const oldChrome = window.chrome;
  const article = {
    type: 'answer',
    title: '直接注入抓到的回答',
    body: '这是直接从知乎页面注入抓取回来的正文，长度足够进入分析流程，不需要等待后台消息。',
    author: '作者',
    url: 'https://www.zhihu.com/question/1/answer/2',
  };
  let storageSaved = null;
  let runtimeCalled = false;
  window.chrome = {
    tabs: {
      query: async () => [{ id: 99, url: article.url }],
    },
    scripting: {
      executeScript: async ({ target, func }) => {
        assertEqual(target.tabId, 99);
        assertEqual(func, grabZhihuPageContentForPanel);
        return [{ result: article }];
      },
    },
    storage: {
      local: {
        set: async (payload) => { storageSaved = payload; },
      },
    },
    runtime: {
      sendMessage: async () => {
        runtimeCalled = true;
        return { ok: false };
      },
    },
  };

  try {
    await recaptureCurrentPage();
    assertEqual(capturedText, article.body, '直接抓取成功后应载入正文');
    assertEqual(document.getElementById('detectedTitle').textContent, article.title);
    assertEqual(storageSaved.lastArticle.title, article.title, '应由 panel 直接写入 lastArticle');
    assert(!runtimeCalled, '直接抓取成功时不应再调用后台兜底');
  } finally {
    window.chrome = oldChrome;
    host.remove();
    document.body.removeAttribute('data-active-tab');
  }
});

test('getCurrentZhihuTabForCapture: 当前页拿不到时回退到最近知乎标签', async () => {
  const oldChrome = window.chrome;
  const queries = [];
  window.chrome = {
    tabs: {
      query: async (query) => {
        queries.push(query);
        if (query.url) {
          return [
            { id: 7, url: 'https://www.zhihu.com/question/1/answer/2', active: false, lastAccessed: 10 },
            { id: 8, url: 'https://zhuanlan.zhihu.com/p/123', active: false, lastAccessed: 20 },
          ];
        }
        return [{ id: 1, url: 'https://example.com/', active: true, lastAccessed: 30 }];
      },
    },
  };

  try {
    const tab = await getCurrentZhihuTabForCapture();
    assertEqual(tab.id, 8, '应在当前页非知乎时回退到最近访问的知乎标签');
    assert(queries.some(q => Array.isArray(q.url)), '应查询所有知乎标签作为兜底');
  } finally {
    window.chrome = oldChrome;
  }
});

}
