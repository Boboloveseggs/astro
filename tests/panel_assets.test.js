'use strict';

{

// ── D7 素材/立意资产入口测试 ───────────────────────────────────────────────
const { test, assert, assertEqual } = Suite;

test('clipsFromAnalysis: 将 reusable_clips / essence_insights 转为素材和立意', () => {
  const record = {
    id: 'article001',
    project_id: 'p1',
    article: { title: '来源作品' },
    analysis: {
      reusable_clips: [{ content: '一个案例', why_reusable: '可复用' }],
      essence_insights: [{ viewpoint: '一个观点', why_essential: '是核心' }],
    },
  };
  const clips = clipsFromAnalysis(record);
  assertEqual(clips.length, 2);
  assertEqual(clips[0].type, '素材');
  assertEqual(clips[1].type, '立意');
  assertEqual(clips[0].source_article_id, 'article001');
  assertEqual(clips[0].project_id, 'p1');
});

test('initAssetsToolbar: 默认提供素材/立意/作品三段切换', async () => {
  const oldGetConfig = dbGetConfig;
  dbGetConfig = async () => null;
  assetListMode = 'clips-material';
  const toolbar = document.createElement('div');
  toolbar.id = 'assetsToolbar';
  document.body.appendChild(toolbar);

  await initAssetsToolbar();
  assertEqual(toolbar.querySelectorAll('[data-asset-mode]').length, 3);
  assert(toolbar.querySelector('[data-asset-mode="clips-material"]').classList.contains('active'), '素材应默认 active');
  assert(document.getElementById('assetSearch').placeholder.includes('素材'), '搜索框应强调素材/立意');
  assert(document.getElementById('assetYearFilter'), '资产工具栏应提供年份筛选');
  assert(document.getElementById('assetMonthFilter'), '资产工具栏应提供月份筛选');
  assert(document.getElementById('assetDayFilter'), '资产工具栏应提供日期筛选');
  assertEqual(toolbar.querySelectorAll('.asset-date-select').length, 3);
  assert(document.getElementById('assetSelectAllBtn'), '应提供资产全选按钮');
  assert(document.getElementById('assetBatchDeleteBtn')?.hidden, '未勾选时批量删除按钮应隐藏');
  assert(document.getElementById('assetBatchExportBtn')?.hidden, '未勾选时导出按钮应隐藏');

  dbGetConfig = oldGetConfig;
  toolbar.remove();
});

test('summarizeTopMetricBuckets: 按总/年/月/周/日统计作品和字数', () => {
  const rec = (id, date, body) => ({
    id,
    savedAt: date.toISOString(),
    article: { body },
  });
  const now = new Date(2026, 4, 9, 12, 0, 0);
  const buckets = summarizeTopMetricBuckets([
    rec('today', new Date(2026, 4, 9, 10), 'aa'),
    rec('week', new Date(2026, 4, 5, 10), 'bbbb'),
    rec('month', new Date(2026, 4, 1, 10), 'cccccc'),
    rec('year', new Date(2026, 0, 10, 10), 'dddddddd'),
    rec('old', new Date(2025, 11, 31, 10), 'eeeeeeeeee'),
  ], now);

  assertEqual(buckets.total, { count: 5, chars: 30 });
  assertEqual(buckets.year, { count: 4, chars: 20 });
  assertEqual(buckets.month, { count: 3, chars: 12 });
  assertEqual(buckets.week, { count: 2, chars: 6 });
  assertEqual(buckets.day, { count: 1, chars: 2 });
});

test('normalizeWeekGoal: 周目标默认 3 篇并限制在合理范围', () => {
  assertEqual(normalizeWeekGoal(undefined), 3);
  assertEqual(normalizeWeekGoal(0), 1);
  assertEqual(normalizeWeekGoal(120), 99);
  assertEqual(normalizeWeekGoal('6'), 6);
});

test('updateTopMetrics: 渲染本周目标条和今日本月提示', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  const oldChrome = window.chrome;
  dbGetAllArticles = async () => [
    { id: 'today', savedAt: new Date().toISOString(), article: { body: 'abcd' } },
    { id: 'old', savedAt: '2000-01-01T00:00:00.000Z', article: { body: 'xx' } },
  ];
  window.chrome = {
    storage: {
      local: {
        async get() { return { weekGoal: 4 }; },
      },
    },
  };

  const host = document.createElement('div');
  host.innerHTML = `
    <div id="weekProgWrap">
      <span id="weekProgLabel"></span>
      <div id="weekProgFill"></div>
      <span id="weekProgPct"></span>
    </div>
    <div id="topPeriodHint"></div>
  `;
  document.body.appendChild(host);

  try {
    await updateTopMetrics();
    assertEqual(document.getElementById('weekProgLabel').textContent, '本周 1/4 篇');
    assertEqual(document.getElementById('weekProgFill').style.width, '25%');
    assertEqual(document.getElementById('weekProgPct').textContent, '25%');
    assertEqual(document.getElementById('topPeriodHint').textContent, '今日 1 篇 · 本月 1 篇');
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    window.chrome = oldChrome;
    host.remove();
  }
});

test('updateTopMetrics: 周目标达成时保留原文案', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  const oldChrome = window.chrome;
  dbGetAllArticles = async () => [
    { id: 'today', savedAt: new Date().toISOString(), article: { body: 'abcd' } },
  ];
  window.chrome = {
    storage: {
      local: {
        async get() { return { weekGoal: 1 }; },
      },
    },
  };

  const host = document.createElement('div');
  host.innerHTML = `
    <div id="weekProgWrap">
      <span id="weekProgLabel"></span>
      <div id="weekProgFill"></div>
      <span id="weekProgPct"></span>
    </div>
  `;
  document.body.appendChild(host);

  try {
    await updateTopMetrics();
    assertEqual(document.getElementById('weekProgLabel').textContent, '本周目标达成 ✓');
    assertEqual(document.getElementById('weekProgFill').style.width, '100%');
    assert(document.getElementById('weekProgWrap').classList.contains('achieved'), '达成后应进入金色完成态');
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    window.chrome = oldChrome;
    host.remove();
  }
});

test('updateTopMetrics: 顶部周目标下拉可直接修改达标篇数', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  const oldChrome = window.chrome;
  let weekGoal = 3;
  dbGetAllArticles = async () => [
    { id: 'today', savedAt: new Date().toISOString(), article: { body: 'abcd' } },
    { id: 'week', savedAt: new Date().toISOString(), article: { body: 'efgh' } },
  ];
  window.chrome = {
    storage: {
      local: {
        async get() { return { weekGoal }; },
        async set(value) { weekGoal = value.weekGoal; },
      },
    },
  };

  const host = document.createElement('div');
  host.innerHTML = `
    <div id="weekProgWrap">
      <span id="weekProgLabel"></span>
      <div id="weekProgFill"></div>
      <span id="weekProgPct"></span>
      <select id="weekGoalSelect">
        <option value="3">3篇</option>
        <option value="5">5篇</option>
      </select>
    </div>
  `;
  document.body.appendChild(host);

  try {
    await updateTopMetrics();
    assertEqual(document.getElementById('weekGoalSelect').value, '3');
    document.getElementById('weekGoalSelect').value = '5';
    document.getElementById('weekGoalSelect').dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 10));
    assertEqual(weekGoal, 5);
    assertEqual(document.getElementById('weekProgLabel').textContent, '本周 2/5 篇');
    assertEqual(document.getElementById('weekProgPct').textContent, '40%');
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    window.chrome = oldChrome;
    host.remove();
  }
});

test('loadClips: 渲染 clip 卡片并按当前项目读取', async () => {
  const oldGetClips = dbGetClips;
  dbGetClips = async filter => {
    assertEqual(filter.type, '素材');
    assertEqual(filter.project, 'default');
    return [{
      id: 'clip001',
      type: '素材',
      content: '可复用片段',
      why_reusable: '因为可以换场景复用',
      source_article_id: 'article001',
      source_article_title: '来源文章',
      project_id: 'default',
    }];
  };
  const input = document.createElement('input');
  input.id = 'assetSearch';
  const list = document.createElement('div');
  list.id = 'assetsList';
  document.body.append(input, list);

  await loadClips('素材');
  assert(list.querySelector('.clip-card'), '应渲染素材卡片');
  assert(list.querySelector('.asset-select-btn'), '素材卡右下角应有勾选按钮');
  assert(list.textContent.includes('可复用片段'), '应显示素材正文');
  assert(list.textContent.includes('来源文章'), '应显示来源文章');

  dbGetClips = oldGetClips;
  input.remove();
  list.remove();
});

test('loadAssetSearchResults: 按资产类型分组找回旧素材并可用于新文章', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  const oldGetClips = dbGetClips;
  const oldProject = activeProject;

  activeProject = 'default';
  dbGetAllArticles = async filter => {
    assertEqual(filter.project, 'default');
    return [{
      id: 'a-position',
      savedAt: '2026-05-12T08:00:00.000Z',
      project_id: 'default',
      article: { title: '位置决定命运', body: '位置决定命运，信息差即权力。', type: 'article' },
      analysis: {
        domain: '文学',
        sub_domain: '社会结构',
        perspective: '位置决定论',
        core_claim: '位置决定命运，信息差即权力',
        creator_strength: '擅长把文学人物转译成社会结构分析',
        insight: '反复关注位置、入口和命运',
        tags: ['位置', '权力结构'],
        asset_cards: [
          {
            type: 'core_viewpoint',
            title: '位置决定命运',
            summary: '这不是人物道德评价，而是结构分析。',
            keywords: ['位置', '命运'],
            why_reusable: '可迁移到职场和平台生态话题。',
            reuse_score: 5,
          },
          {
            type: 'writing_fingerprint',
            title: '把文学人物转译成社会结构',
            summary: '这是稳定的写作优势证据。',
            keywords: ['位置'],
            why_reusable: '可帮助选择下一篇深耕方向。',
            reuse_score: 4,
          },
        ],
        reusable_clips: [
          { type: '金句', content: '位置决定命运，信息差即权力', why_reusable: '可作为新文章开头。' },
        ],
        essence_insights: [
          { viewpoint: '努力必须进入正确入口才会产生复利', why_essential: '延展位置主题。' },
        ],
        nodes_hit: [
          { name: '位置决定命运', type: 'concept', role: 'primary', contribution: '解释人物命运的结构入口。' },
        ],
        next_suggestions: [
          { type: '延展', suggestion: '普通人为什么很难靠努力跨越阶层？', reason: '把位置主题迁移到现实。' },
        ],
      },
    }];
  };
  dbGetClips = async filter => {
    assertEqual(filter.project, 'default');
    return [{
      id: 'clip-position',
      type: '素材',
      content: '西门庆的资源入口不是普通努力',
      why_reusable: '可复用到“位置决定命运”的现实议题。',
      source_article_id: 'a-position',
      source_article_title: '位置决定命运',
      savedAt: '2026-05-12T09:00:00.000Z',
    }];
  };

  const host = document.createElement('div');
  host.innerHTML = `
    <input id="assetSearch" value="位置">
    <div id="assetDateFilter">
      <select id="assetYearFilter"><option value="">年</option></select>
      <select id="assetMonthFilter"><option value="">月</option></select>
      <select id="assetDayFilter"><option value="">日</option></select>
    </div>
    <button id="assetSelectAllBtn" type="button">全选</button>
    <button id="assetBatchDeleteBtn" type="button" hidden>删除</button>
    <button id="assetBatchExportBtn" type="button" hidden>导出</button>
    <span id="assetSelectionStatus"></span>
    <div id="assetsList"></div>
  `;
  document.body.appendChild(host);

  try {
    await loadAssetSearchResults('位置');
    const text = host.textContent;
    assert(text.includes('你搜索了：位置'), '应显示搜索关键词');
    assert(text.includes('相关观点'), '应按观点分组');
    assert(text.includes('相关素材'), '应按素材分组');
    assert(text.includes('相关知识节点'), '应按知识节点分组');
    assert(text.includes('相关写作指纹'), '应按写作指纹分组');
    assert(text.includes('可复用金句'), '应按金句分组');
    assert(text.includes('可延展方向'), '应按延展方向分组');
    assert(host.querySelector('[data-asset-remix]'), '搜索结果应能用于新文章');
    assert(host.querySelector('.chat-card'), '搜索页应提供继续追问的上下文');
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    dbGetClips = oldGetClips;
    activeProject = oldProject;
    resetAssetSelection('clips-material');
    host.remove();
  }
});

test('loadAssets: 年月日下拉按 savedAt 日期筛选作品', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  dbGetAllArticles = async () => [
    { id: 'a1', savedAt: '2026-05-01T10:00:00.000Z', article: { title: '五月一日作品', body: '正文', type: 'article' }, analysis: { domain: '文学' } },
    { id: 'a2', savedAt: '2026-05-02T10:00:00.000Z', article: { title: '五月二日作品', body: '正文', type: 'article' }, analysis: { domain: '历史' } },
  ];
  const input = document.createElement('input');
  input.id = 'assetSearch';
  const date = document.createElement('div');
  date.id = 'assetDateFilter';
  date.innerHTML = `
    <select id="assetYearFilter"><option value="2026" selected>2026</option></select>
    <select id="assetMonthFilter"><option value="05" selected>5</option></select>
    <select id="assetDayFilter"><option value="02" selected>2</option></select>
  `;
  const list = document.createElement('div');
  list.id = 'assetsList';
  document.body.append(input, date, list);

  try {
    assetListMode = 'assets';
    resetAssetSelection('assets');
    await loadAssets();
    assert(list.textContent.includes('五月二日作品'), '应显示日期命中的作品');
    assert(!list.textContent.includes('五月一日作品'), '不应显示其他日期作品');
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    resetAssetSelection('clips-material');
    input.remove();
    date.remove();
    list.remove();
  }
});

test('loadAssets/deleteSelectedAssets: 支持右下角勾选、Shift 连选和批量删除', async () => {
  const oldGetAllArticles = dbGetAllArticles;
  const oldDeleteArticle = dbDeleteArticle;
  const oldUpdateAssetCount = updateAssetCount;
  const oldLoadCurrentAssetMode = loadCurrentAssetMode;
  const oldConfirm = window.confirm;

  dbGetAllArticles = async () => [
    { id: 'a1', savedAt: '2026-05-01T00:00:00.000Z', article: { title: '第一篇', body: '正文', type: 'article' }, analysis: { domain: '文学' } },
    { id: 'a2', savedAt: '2026-05-02T00:00:00.000Z', article: { title: '第二篇', body: '正文', type: 'article' }, analysis: { domain: '文学' } },
    { id: 'a3', savedAt: '2026-05-03T00:00:00.000Z', article: { title: '第三篇', body: '正文', type: 'article' }, analysis: { domain: '文学' } },
  ];
  const calls = [];
  let confirmMessage = '';
  dbDeleteArticle = async id => { calls.push(['delete', id]); };
  updateAssetCount = async () => { calls.push(['count']); };
  loadCurrentAssetMode = async () => { calls.push(['load']); };
  window.confirm = msg => {
    confirmMessage = msg;
    return true;
  };

  const host = document.createElement('div');
  host.innerHTML = `
    <div id="assetsToolbar">
      <button id="assetSelectAllBtn" type="button">全选</button>
      <button id="assetBatchDeleteBtn" type="button" hidden>删除</button>
      <button id="assetBatchExportBtn" type="button" hidden>导出</button>
      <span id="assetSelectionStatus"></span>
    </div>
    <input id="assetSearch">
    <div id="assetsList"></div>
  `;
  document.body.appendChild(host);

  try {
    assetListMode = 'assets';
    resetAssetSelection('assets');
    bindAssetBatchControls();
    await loadAssets();

    const buttons = [...host.querySelectorAll('.asset-select-btn')];
    assertEqual(buttons.length, 3);
    buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));

    assertEqual(host.querySelectorAll('.asset-card.selected').length, 3);
    assertEqual(document.getElementById('assetSelectionStatus').textContent, '已选 3/3');
    assert(!document.getElementById('assetBatchDeleteBtn').hidden, '勾选后应显示批量删除按钮');
    assert(!document.getElementById('assetBatchExportBtn').hidden, '勾选后应显示导出按钮');

    document.getElementById('assetBatchDeleteBtn').click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert(confirmMessage.includes('3 条作品/速记'), '批量删除应提示选中数量');
    assertEqual(calls, [
      ['delete', 'a1'],
      ['delete', 'a2'],
      ['delete', 'a3'],
      ['count'],
      ['load'],
    ]);
  } finally {
    dbGetAllArticles = oldGetAllArticles;
    dbDeleteArticle = oldDeleteArticle;
    updateAssetCount = oldUpdateAssetCount;
    loadCurrentAssetMode = oldLoadCurrentAssetMode;
    window.confirm = oldConfirm;
    resetAssetSelection('clips-material');
    host.remove();
  }
});

test('buildSelectedAssetsExportPayload: 导出已选作品并带上关联素材', () => {
  activeProject = 'default';
  assetSelectionState.mode = 'assets';
  const article = { id: 'a1', article: { title: '作品一' }, analysis: { domain: '文学' } };
  const directClip = { id: 'c1', type: '素材', content: '直接选中的素材', source_article_id: 'a9' };
  const linkedClip = { id: 'c2', type: '立意', content: '作品关联立意', source_article_id: 'a1' };
  const otherClip = { id: 'c3', type: '素材', content: '其他素材', source_article_id: 'other' };

  const payload = buildSelectedAssetsExportPayload([
    { id: 'a1', kind: 'article', data: article },
    { id: 'c1', kind: 'clip', data: directClip },
  ], [linkedClip, otherClip]);

  assertEqual(payload.export_format, 'zhijing_selected_assets_v1');
  assertEqual(payload.articles.length, 1);
  assertEqual(payload.clips.length, 2);
  assert(payload.clips.some(clip => clip.id === 'c1'), '应导出直接勾选的素材');
  assert(payload.clips.some(clip => clip.id === 'c2'), '应导出已选作品关联素材');
  assert(!payload.clips.some(clip => clip.id === 'c3'), '不应导出无关素材');
});

test('showAssetDetail: 作品详情可删除作品并回到资产列表', async () => {
  const oldDeleteArticle = dbDeleteArticle;
  const oldUpdateAssetCount = updateAssetCount;
  const oldLoadCurrentAssetMode = loadCurrentAssetMode;
  const oldConfirm = window.confirm;

  const calls = [];
  let confirmMessage = '';
  dbDeleteArticle = async id => { calls.push(['delete', id]); };
  updateAssetCount = async () => { calls.push(['count']); };
  loadCurrentAssetMode = async () => { calls.push(['load']); };
  window.confirm = msg => {
    confirmMessage = msg;
    return true;
  };

  const list = document.createElement('div');
  list.id = 'assetsList';
  document.body.appendChild(list);

  try {
    showAssetDetail({
      id: 'article_to_delete',
      article: { title: '待删除作品', type: 'article' },
      analysis: {},
    });
    const btn = document.getElementById('deleteAssetBtn');
    assertEqual(btn.textContent, '删除作品');

    btn.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert(confirmMessage.includes('确定删除这条作品？该文章和它的素材/立意会一并清除'), '应提示文章与素材/立意会一并清除');
    assertEqual(calls, [
      ['delete', 'article_to_delete'],
      ['count'],
      ['load'],
    ]);
  } finally {
    dbDeleteArticle = oldDeleteArticle;
    updateAssetCount = oldUpdateAssetCount;
    loadCurrentAssetMode = oldLoadCurrentAssetMode;
    window.confirm = oldConfirm;
    list.remove();
  }
});

}
