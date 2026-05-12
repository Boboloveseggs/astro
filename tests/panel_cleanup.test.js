'use strict';

{

// ── Day 5 功能清理回归测试 ────────────────────────────────────────────────
const { test, assert } = Suite;

test('cleanup: 旧地图和旧时间线函数已删除，标签卡不再渲染', () => {
  assert(typeof renderMap === 'undefined', '旧 D3 force renderMap 不应存在');
  assert(typeof renderKnowledgeSphere === 'undefined', '旧知识球 renderKnowledgeSphere 不应存在');
  assert(typeof reviewTimeline === 'undefined', '旧简陋 reviewTimeline 不应存在');
  assert(cardTags({ tags: ['写作', '文学'] }) === '', 'cardTags 应固定返回空字符串');
});

test('updateAssetCount: 0 时隐藏 count-badge，有数量时显示', async () => {
  const originalCount = dbGetArticleCount;
  const badge = document.createElement('span');
  badge.id = 'assetCount';
  document.body.appendChild(badge);

  dbGetArticleCount = async () => 0;
  await updateAssetCount();
  assert(badge.textContent === '', '0 篇时徽标文字应为空');
  assert(badge.style.display === 'none', '0 篇时徽标应 display:none');

  dbGetArticleCount = async () => 3;
  await updateAssetCount();
  assert(badge.textContent === '3', '有数量时徽标应显示数量');
  assert(badge.style.display === 'inline-block', '有数量时徽标应显示');

  dbGetArticleCount = originalCount;
  badge.remove();
});

test('applyUiTheme: 开灯模式使用蓝白主题并更新按钮状态', () => {
  const btn = document.createElement('button');
  btn.id = 'themeToggleBtn';
  document.body.appendChild(btn);

  try {
    applyUiTheme('light');
    assert(document.documentElement.classList.contains('theme-light'), '开灯模式应添加 theme-light');
    assert(document.documentElement.dataset.theme === 'light', '开灯模式应记录 light 状态');
    assert(btn.title === '关灯模式', '开灯后按钮应提示可关灯');
    assert(btn.textContent === '☾', '开灯后按钮应显示月亮');

    applyUiTheme('dark');
    assert(!document.documentElement.classList.contains('theme-light'), '关灯后应移除 theme-light');
    assert(document.documentElement.dataset.theme === 'dark', '关灯后应记录 dark 状态');
    assert(btn.title === '开灯模式', '关灯后按钮应提示可开灯');
  } finally {
    btn.remove();
    document.documentElement.classList.remove('theme-light');
    delete document.documentElement.dataset.theme;
  }
});

test('loadUiTheme: 新用户默认进入亮灯模式', async () => {
  const originalChrome = globalThis.chrome;
  const btn = document.createElement('button');
  btn.id = 'themeToggleBtn';
  document.body.appendChild(btn);
  globalThis.chrome = {
    storage: {
      local: {
        get: async () => ({}),
      },
    },
  };

  try {
    await loadUiTheme();
    assert(document.documentElement.classList.contains('theme-light'), '无历史设置时应默认亮灯');
    assert(document.documentElement.dataset.theme === 'light', '默认主题应记录为 light');
    assert(btn.title === '关灯模式', '默认亮灯后应提示可切换到关灯模式');
  } finally {
    btn.remove();
    document.documentElement.classList.remove('theme-light');
    delete document.documentElement.dataset.theme;
    globalThis.chrome = originalChrome;
  }
});

test('panelOnboardingSteps: 新手引导按区域拆分，不再一口气跨完整项目', () => {
  const analyze = panelOnboardingSteps('analyze');
  const themeRecommendation = panelOnboardingSteps('themeRecommendation');
  const assets = panelOnboardingSteps('assets');
  const review = panelOnboardingSteps('review');
  const map = panelOnboardingSteps('map');
  const fingerprint = panelOnboardingSteps('fingerprint');

  assert(analyze.length === 5, '第一次使用的分析区引导应压缩为五步');
  assert(analyze.some(s => s.action === 'openOptions'), '分析区应能跳转到设置页配置 API Key');
  const demoStep = analyze.find(s => s.target === '#demoArticleBtn');
  assert(demoStep, '分析区应引导直接载入示例文章');
  assert(demoStep.title.includes('示例文章'), '第二步应自然说明示例文章链路');
  assert(demoStep.action === 'loadDemoArticle', '点击引导主按钮应直接载入示例文章');
  assert(String(demoStep.body).includes('先用一篇示例文章跑通完整流程'), '示例链路应说明体验流程');
  assert(!String(demoStep.body).includes('\u8bc4\u59d4'), '引导文案不应暴露使用者身份设计');
  assert(!String(demoStep.body).includes('\u77e5\u4e4e\u4e3b\u9875'), '引导文案不应提到无需打开外部主页');
  assert(!String(demoStep.body).includes('比赛'), '引导文案不应暴露比赛兜底设计');
  assert(!String(demoStep.body).includes('知乎开放 API'), '演示入口不应再引入知乎故事 API');
  const demoAnalyzeStep = analyze.find(s => s.target === '#analyzeBtn');
  assert(demoAnalyzeStep, '分析区应复用原来的开始分析按钮');
  assert(demoAnalyzeStep?.requiresTarget === '#analyzeBtn', '未载入示例文章前不应进入分析步骤');
  assert(demoAnalyzeStep.action === 'runDemoAnalysis', '点击引导主按钮应通过内部示例通道执行分析');
  assert(!String(demoAnalyzeStep.body).includes('\u73b0\u573a\u5927\u6a21\u578b'), '引导文案不应暴露演示实现细节');
  assert(!String(demoAnalyzeStep.body).includes('比赛'), '分析归库文案不应暴露比赛兜底设计');
  const resultStep = analyze.find(s => s.title.includes('分析结果'));
  assert(resultStep?.target === '#result', '演示结果步骤应指向已经渲染的结果区');
  assert(resultStep?.requiresTarget === '#result', '未生成演示结果前不应进入结果步骤');
  const savedStep = analyze[analyze.length - 1];
  assert(savedStep.target === '#savedBanner', '最后一步应指向真实的已保存提示');
  assert(savedStep.requiresTarget === '#savedBanner', '未入库前不应手动跳到归库完成步');
  assert(String(savedStep.body).includes('已经成功归库'), '最后一步应明确告诉创作者文章已归库');
  assert(!analyze.some(s => ['assets', 'review', 'map', 'fingerprint'].includes(s.tab)), '分析区不应夹带其他区域引导');

  assert(themeRecommendation.length === 1, '关灯体验推荐应独立于核心五步教程');
  assert(themeRecommendation[0].action === 'ackThemeRecommendation', '关灯推荐应只是提示，不应强制切换暗色模式');
  assert(String(themeRecommendation[0].title).includes('强烈推荐'), '关灯推荐应表达强烈推荐');

  assert(assets.length === 2, '资产区应是独立短引导');
  assert(assets.every(s => s.tab === 'assets'), '资产区引导只应定位资产页');
  assert(assets.some(s => s.target === '.asset-mode[data-asset-mode="assets"]' && String(s.body).includes('完整报告')), '资产区应说明完整分析报告在作品里查找');

  assert(review.every(s => s.tab === 'review'), '复盘区引导只应定位复盘页');
  assert(review.some(s => s.reviewSection === 'direction'), '复盘区应介绍创作方向');
  assert(review.some(s => s.reviewSection === 'nodes'), '复盘区应介绍高频节点');
  assert(review.some(s => s.reviewSection === 'timeline'), '复盘区应介绍时间轴');
  assert(review.some(s => String(s.body).includes('AI 复盘')), '复盘区应在本区内介绍 AI 复盘');
  assert(review.every(s => !s.reviewSection || String(s.target || '').startsWith(`#review-${s.reviewSection}`)), '复盘细分引导应指向当前分页面板');

  assert(map.every(s => s.tab === 'map'), '地图区引导只应定位地图页');
  assert(!map.some(s => s.target === '#mapTab'), '地图引导不应高亮整个地图容器，避免误触和遮挡');
  assert(!map.some(s => s.peek), '地图不应再有单独宇宙全貌观察步，避免阻塞下一步');
  const dragStepIndex = map.findIndex(s => s.title.includes('插件框往左拉'));
  const starStepIndex = map.findIndex(s => s.title.includes('点一颗星星'));
  assert(dragStepIndex >= 0, '地图区应提示把插件框往左拉宽以观看完整知识宇宙');
  assert(dragStepIndex < starStepIndex, '插件框拉宽提示应出现在点星星之前');
  assert(String(map[dragStepIndex].body).includes('插件框左边缘'), '文案应说明要拖插件框左边缘');
  assert(map[dragStepIndex].target === '#universeCanvasWrap', '插件框拉宽步骤应指向宇宙画面');
  assert(map.find(s => s.title.includes('点一颗星星'))?.target === '#universeCanvasWrap', '点星星步骤箭头应指向宇宙画面');

  assert(fingerprint.every(s => s.tab === 'fingerprint'), '总复盘报告引导只应定位总复盘页');
  assert(fingerprint.some(s => s.target === '#weekProgWrap'), '总复盘报告应介绍周目标');
});

test('maybeStartPanelOnboarding: 首次打开不自动弹出，引导只藏在问号入口', async () => {
  onboardingState.active = false;
  await maybeStartPanelOnboarding();
  assert(!onboardingState.active, '面板首次打开不应自动启动新手引导');
});

test('maybeStartPanelOnboardingForSection: 点击哪个区只启动哪个区的引导', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="tab-btn active" data-tab="assets"></button>
    <div id="onboardingLayer"></div>
    <div id="onboardingArrow"></div>
    <div id="onboardingMeta"></div>
    <div id="onboardingTitle"></div>
    <div id="onboardingBody"></div>
    <button id="onboardingSkipBtn"></button>
    <button id="onboardingBackBtn"></button>
    <button id="onboardingNextBtn"></button>
  `;
  document.body.appendChild(host);
  document.body.dataset.activeTab = 'assets';

  const originalChrome = globalThis.chrome;
  const stored = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async key => (typeof key === 'string' ? { [key]: stored[key] } : {}),
        set: async obj => Object.assign(stored, obj),
        remove: async key => {
          (Array.isArray(key) ? key : [key]).forEach(k => { delete stored[k]; });
        },
      },
    },
  };

  try {
    onboardingState.active = false;
    await maybeStartPanelOnboardingForSection('assets');
    assert(onboardingState.active, '点击未完成区域后应启动引导');
    assert(onboardingState.section === 'assets', '启动的应是资产区引导');
    assert(document.getElementById('onboardingMeta').textContent.includes('资产区引导'), '浮层应显示当前区域名称');
    assert(document.getElementById('onboardingSkipBtn').textContent === '跳过本区引导', '每段引导都应带本区跳过标识');

    await finishPanelOnboarding();
    assert(stored.onboardingSectionDone_assets === true, '跳过或完成后只标记当前区域');
    assert(!stored.onboardingSectionDone_map, '不应顺手标记未打开的地图区');
  } finally {
    onboardingState.active = false;
    delete document.body.dataset.activeTab;
    host.remove();
    clearOnboardingHighlight();
    globalThis.chrome = originalChrome;
  }
});

test('finishPanelOnboarding: 完成核心教程后强推荐关灯体验', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <button id="themeToggleBtn"></button>
    <div id="onboardingLayer"></div>
    <div id="onboardingArrow"></div>
    <div id="onboardingMeta"></div>
    <div id="onboardingTitle"></div>
    <div id="onboardingBody"></div>
    <button id="onboardingSkipBtn"></button>
    <button id="onboardingBackBtn"></button>
    <button id="onboardingNextBtn"></button>
  `;
  document.body.appendChild(host);

  const originalChrome = globalThis.chrome;
  const stored = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async key => {
          if (Array.isArray(key)) return Object.fromEntries(key.map(k => [k, stored[k]]));
          if (typeof key === 'string') return { [key]: stored[key] };
          return {};
        },
        set: async obj => Object.assign(stored, obj),
        remove: async key => {
          (Array.isArray(key) ? key : [key]).forEach(k => { delete stored[k]; });
        },
      },
    },
  };

  try {
    applyUiTheme('light');
    onboardingState.active = true;
    onboardingState.section = 'analyze';
    onboardingState.index = panelOnboardingSteps('analyze').length - 1;

    await finishPanelOnboarding();
    assert(stored.onboardingSectionDone_analyze === true, '应先标记核心分析教程完成');
    assert(onboardingState.active, '核心教程结束后应继续弹出关灯体验推荐');
    assert(onboardingState.section === 'themeRecommendation', '后续浮层应是关灯体验推荐');
    assert(document.getElementById('onboardingTitle').textContent.includes('强烈推荐'), '标题应强烈推荐关灯体验');
    assert(document.getElementById('onboardingSkipBtn').textContent === '继续亮灯', '推荐框应允许继续保持亮灯');
    assert(document.getElementById('onboardingNextBtn').textContent === '知道了', '推荐框主按钮应是知道了，不强制操作');

    await nextPanelOnboarding();
    assert(document.documentElement.dataset.theme === 'light', '知道了以后也不应替使用者自动切换');
    assert(stored[UI_THEME_KEY] !== 'dark', '关灯推荐不应写入主题偏好');
    assert(stored[THEME_RECOMMEND_DONE_KEY] === true, '关灯推荐完成后不应反复出现');
    assert(stored.onboardingSectionDone_themeRecommendation === true, '关灯推荐也应记录完成');
  } finally {
    onboardingState.active = false;
    host.remove();
    clearOnboardingHighlight();
    document.documentElement.classList.remove('theme-light');
    delete document.documentElement.dataset.theme;
    globalThis.chrome = originalChrome;
  }
});

test('maybeShowOnboardingEntryHint: 首次打开应提示问号是新手指引', async () => {
  const host = document.createElement('div');
  host.innerHTML = `<div id="onboardingEntryHint" hidden></div>`;
  document.body.appendChild(host);
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
      },
    },
  };

  try {
    onboardingState.active = false;
    await maybeShowOnboardingEntryHint();
    const hint = document.getElementById('onboardingEntryHint');
    assert(!onboardingState.active, '显示问号提示不应启动整套引导');
    assert(hint.hidden === false, '首次打开应显示问号提示');
    assert(hint.classList.contains('visible'), '问号提示应进入可见状态');
  } finally {
    host.remove();
    globalThis.chrome = originalChrome;
  }
});

test('replayPanelOnboarding: 可手动重看引导但不重置首次出现状态', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <div id="onboardingLayer"></div>
    <div id="onboardingArrow"></div>
    <div id="onboardingMeta"></div>
    <div id="onboardingTitle"></div>
    <div id="onboardingBody"></div>
    <button id="onboardingBackBtn"></button>
    <button id="onboardingNextBtn"></button>
  `;
  document.body.appendChild(host);

  try {
    await replayPanelOnboarding();
    assert(onboardingState.active, '手动重看应启动引导');
    assert(document.getElementById('onboardingLayer').classList.contains('visible'), '引导浮层应显示');
    assert(onboardingState.section === 'analyze', '默认应重看当前分析区引导');
    assert(document.getElementById('onboardingTitle').textContent.includes('第一步'), '应从当前区第一步开始');
  } finally {
    onboardingState.active = false;
    host.remove();
    clearOnboardingHighlight();
  }
});

test('nextPanelOnboarding: API 设置页只是分支，引导会记录回到面板后的续接步骤', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <div id="onboardingLayer"></div>
    <div id="onboardingArrow"></div>
    <div id="onboardingMeta"></div>
    <div id="onboardingTitle"></div>
    <div id="onboardingBody"></div>
    <button id="onboardingBackBtn"></button>
    <button id="onboardingNextBtn"></button>
  `;
  document.body.appendChild(host);

  const originalChrome = globalThis.chrome;
  const stored = {};
  let opened = false;
  globalThis.chrome = {
    storage: {
      local: {
        set: async obj => Object.assign(stored, obj),
        get: async () => ({}),
        remove: async key => { delete stored[key]; },
      },
    },
    runtime: { openOptionsPage: () => { opened = true; } },
  };

  try {
    const steps = panelOnboardingSteps();
    const idx = steps.findIndex(s => s.action === 'openOptions');
    onboardingState.active = true;
    onboardingState.section = 'analyze';
    onboardingState.index = idx;
    await nextPanelOnboarding();

    assert(opened, '应打开设置页');
    assert(stored.onboardingOptionsPending === true, '应只标记 API 设置分支待完成');
    assert(stored.onboardingResumeSection === 'analyze', '应记录回到面板后的续接区域');
    assert(Number.isInteger(stored.onboardingResumeIndex), '应记录回到面板后的续接步骤');
    assert(steps[stored.onboardingResumeIndex]?.title.includes('示例文章'), '回到面板后应从载入示例文章继续');
    assert(!stored.onboardingComplete, '打开 API 设置不应把整段新手引导标为完成');
  } finally {
    onboardingState.active = false;
    host.remove();
    clearOnboardingHighlight();
    globalThis.chrome = originalChrome;
  }
});

test('seedDemoDataIfEmpty: empty library imports packaged demo data once', async () => {
  const originalChrome = globalThis.chrome;
  const originalFetch = globalThis.fetch;
  const originalCount = dbGetArticleCount;
  const originalImport = dbImportAll;
  const stored = {};
  let fetchedUrl = '';
  let imported = null;

  globalThis.chrome = {
    storage: {
      local: {
        get: async key => (typeof key === 'string' ? { [key]: stored[key] } : {}),
        set: async obj => Object.assign(stored, obj),
      },
    },
    runtime: { getURL: path => `chrome-extension://demo/${path}` },
  };
  globalThis.fetch = async url => {
    fetchedUrl = url;
    return {
      ok: true,
      json: async () => ({ articles: [{ id: 'demo_a1', article: { title: 'demo' } }], nodes: [], clips: [], config: {} }),
    };
  };
  dbGetArticleCount = async () => 0;
  dbImportAll = async data => { imported = data; };

  try {
    const seeded = await seedDemoDataIfEmpty();
    assert(seeded, 'empty library should seed packaged demo data');
    assert(fetchedUrl.endsWith(DEMO_DATA_PATH), 'should fetch packaged demo data from extension bundle');
    assert(imported?.articles?.length === 1, 'should pass demo articles to dbImportAll');
    assert(stored[DEMO_SEED_KEY] === true, 'should remember demo seed completion');
  } finally {
    globalThis.chrome = originalChrome;
    globalThis.fetch = originalFetch;
    dbGetArticleCount = originalCount;
    dbImportAll = originalImport;
  }
});

test('seedDemoDataIfEmpty: existing user data is never overwritten', async () => {
  const originalChrome = globalThis.chrome;
  const originalFetch = globalThis.fetch;
  const originalCount = dbGetArticleCount;
  const originalImport = dbImportAll;
  let fetched = false;
  let imported = false;

  globalThis.chrome = {
    storage: {
      local: {
        get: async key => (typeof key === 'string' ? { [key]: false } : {}),
        set: async () => {},
      },
    },
    runtime: { getURL: path => path },
  };
  globalThis.fetch = async () => {
    fetched = true;
    return { ok: true, json: async () => ({ articles: [] }) };
  };
  dbGetArticleCount = async () => 2;
  dbImportAll = async () => { imported = true; };

  try {
    const seeded = await seedDemoDataIfEmpty();
    assert(!seeded, 'non-empty library should skip demo seed');
    assert(!fetched, 'non-empty library should not fetch bundled demo data');
    assert(!imported, 'non-empty library should not call dbImportAll');
  } finally {
    globalThis.chrome = originalChrome;
    globalThis.fetch = originalFetch;
    dbGetArticleCount = originalCount;
    dbImportAll = originalImport;
  }
});

}
