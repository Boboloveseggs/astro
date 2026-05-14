'use strict';

{

// ── D9 复盘升级测试 ─────────────────────────────────────────
const { test, assert, assertEqual } = Suite;

const REVIEW_FIXTURE = [
  {
    id: 'r1',
    savedAt: '2026-05-08T10:00:00.000Z',
    article: { title: '本周文学', body: 'a'.repeat(100), type: 'article' },
    analysis: {
      domain: '文学',
      sub_domain: '叙事结构',
      perspective: '结构拆解',
      core_claim: '细节推动判断',
      creator_strength: '能把观察转为判断',
      craft_review: { summary: '结构推进稳定' },
      nodes_hit: [{ name: '细节推动', type: 'concept', role: 'primary', contribution: '支撑文章判断' }],
      new_concepts: ['结构线索'],
      tags: ['叙事'],
    },
  },
  {
    id: 'r2',
    savedAt: '2026-05-05T10:00:00.000Z',
    article: { title: '本周速记', body: 'b'.repeat(20), type: 'idea' },
    analysis: {},
  },
  {
    id: 'r3',
    savedAt: '2026-04-30T10:00:00.000Z',
    article: { title: '上周哲学', body: 'c'.repeat(60), type: 'article' },
    analysis: {
      domain: '哲学',
      sub_domain: '认识论',
      core_claim: '认识依赖问题意识',
      creator_strength: '能提出反问',
      nodes_hit: [{ name: '问题意识', type: 'concept', role: 'primary', contribution: '作为认识入口' }],
    },
  },
  {
    id: 'r4',
    savedAt: '2026-04-12T10:00:00.000Z',
    article: { title: '上月文学', body: 'd'.repeat(40), type: 'article' },
    analysis: {
      domain: '文学',
      sub_domain: '人物关系',
      core_claim: '叙事来自秩序',
      nodes_hit: [{ name: '人物关系', type: 'concept', role: 'secondary', contribution: '组织情节秩序' }],
    },
  },
];

test('reviewMetricSummary: 聚合本周作品/字数/日均频率/月度对比', () => {
  const stats = reviewMetricSummary(REVIEW_FIXTURE, new Date('2026-05-08T12:00:00'));
  assertEqual(stats.weekArticles, 2);
  assertEqual(stats.weekChars, 120);
  assertEqual(stats.weekArticleDelta, 1);
  assertEqual(stats.monthArticles, 2);
  assertEqual(stats.monthArticleDelta, 0);
  assertEqual(stats.dailyFreq, 0.13);
});

test('reviewDomainWordStats: 按领域统计字数且速记单独归类', () => {
  const stats = reviewDomainWordStats(REVIEW_FIXTURE);
  assertEqual(stats[0].domain, '文学');
  assertEqual(stats[0].chars, 140);
  assert(stats.some(item => item.domain === '速记' && item.chars === 20), '速记应独立归类');
});

test('reviewLitDirections: 已点亮方向按出现次数排序', () => {
  const dirs = reviewLitDirections(REVIEW_FIXTURE.filter(r => r.article.type !== 'idea'));
  assertEqual(dirs[0], { name: '文学', count: 2 });
  assertEqual(dirs[1], { name: '哲学', count: 1 });
});

test('reviewDirectionMap/renderReviewDirectionAnalysis: 按大领域、子领域和知识点生成成长地图', () => {
  const articles = REVIEW_FIXTURE.filter(r => r.article.type !== 'idea');
  const map = reviewDirectionMap(articles);
  const literature = map.find(item => item.name === '文学');
  assert(literature, '应存在文学大方向');
  assertEqual(literature.count, 2);
  assert(literature.subdomains.some(item => item.name === '叙事结构'), '应保留子领域');
  assert(literature.points.some(item => item.name === '细节推动'), '应把 nodes_hit 纳入具体知识点');

  const html = renderReviewDirectionAnalysis(articles);
  const host = document.createElement('div');
  host.innerHTML = html;
  assert(host.textContent.includes('方向地图：大领域 → 子领域 → 知识点'), '应渲染方向地图层级标题');
  assert(host.textContent.includes('下一步成长抓手'), '应给出成长抓手而不只是统计');
  assert(host.textContent.includes('《本周文学》'), '应把代表作品放回方向证据里');
});

test('parseReviewGuidance/buildReviewSystemPrompt: 可解析 AI JSON 并带核心上下文', () => {
  const prompt = buildReviewSystemPrompt(REVIEW_FIXTURE, new Date('2026-05-08T12:00:00'));
  assert(prompt.includes('细节推动判断'), 'prompt 应包含 core_claim');
  assert(prompt.includes('能把观察转为判断'), 'prompt 应包含 creator_strength');
  assert(prompt.includes('细节推动(concept)'), 'prompt 应包含具体知识点');
  assert(prompt.includes('不要只做数据归纳'), 'prompt 应明确避免浅层数据归纳');

  const parsed = parseReviewGuidance('```json\n{"blank_spots":"试试人物细读","writing_pattern":"结构意识稳定"}\n```');
  assertEqual(parsed.blank_spots, '试试人物细读');
  assertEqual(parsed.writing_pattern, '结构意识稳定');
});

test('buildWeeklyReportPrompt/parseWeeklyReport: 周复盘 JSON 闭环', () => {
  const now = new Date('2026-05-08T12:00:00');
  const prompt = buildWeeklyReportPrompt(REVIEW_FIXTURE, REVIEW_FIXTURE, now);
  assert(prompt.includes('本周作品'), 'prompt 应包含本周作品');
  assert(prompt.includes('细节推动判断'), 'prompt 应带 core_claim');
  assert(prompt.includes('能把观察转为判断'), 'prompt 应带 creator_strength');

  const parsed = parseWeeklyReport('```json\n{"week_label":"2026 第 19 周","highlight":"知乎创作图鉴看到了亮点","pattern":"结构意识稳定","blank":"下周补人物细读","stats":"本周 2 篇 / 120 字 / 涉及 1 个领域"}\n```', REVIEW_FIXTURE, now);
  assertEqual(parsed.week_label, '2026 第 19 周');
  assertEqual(parsed.highlight, '知乎创作图鉴看到了亮点');
  assertEqual(parsed.stats, '本周 2 篇 / 120 字 / 涉及 1 个领域');
});

test('renderWeeklyReportCard: 渲染本周报告并保留全部周历史入口', () => {
  const currentKey = reviewWeeklyReportKey();
  const currentLabel = reviewWeeklyLabel();
  const report = normalizeWeeklyReport({
    week_label: currentLabel,
    highlight: '知乎创作图鉴看到了亮点',
    pattern: '结构稳定',
    blank: '补人物细读',
    stats: '本周 2 篇 / 120 字 / 涉及 1 个领域',
  }, REVIEW_FIXTURE, new Date());
  const reports = { [currentKey]: report };
  let oldestKey = currentKey;
  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = reviewWeeklyReportKey(d);
    oldestKey = key;
    reports[key] = { week_label: reviewWeeklyLabel(d), stats: `${i} 篇` };
  }
  const html = renderWeeklyReportCard(report, reports, currentKey);
  const host = document.createElement('div');
  host.innerHTML = html;
  assert(host.querySelector('#refreshWeeklyReportBtn'), '应有手动刷新按钮');
  assert(host.textContent.includes('本周复盘报告'), '应显示周报标题');
  assert(host.querySelector('#weeklyReportSelect'), '周标题旁应有周报切换下拉框');
  assertEqual(host.querySelectorAll('#weeklyReportSelect option').length, 6);
  assert(host.querySelector('[data-week-nav="older"]'), '应有上一周按钮');
  assert(host.querySelector('[data-week-nav="newer"]'), '应有下一周按钮');
  assertEqual(host.querySelectorAll('.weekly-report-history-row').length, 6);
  assert(host.textContent.includes('历史周报'), '底部应明确标注历史周报入口');
  assert(host.querySelector(`[data-week-report-key="${oldestKey}"]`), '最早一周也应可回溯查看');
  assert(host.querySelector(`[data-week-report-key="${currentKey}"]`)?.classList.contains('active'), '当前周应高亮');
});

test('saveWeeklyReport: 保存新周报时不删除旧周报', async () => {
  const oldChrome = window.chrome;
  let weeklyReports = {};
  for (let i = 1; i <= 14; i++) {
    const key = `2026-W${String(i).padStart(2, '0')}`;
    weeklyReports[key] = { week_label: key, stats: `${i} 篇` };
  }
  window.chrome = {
    storage: {
      local: {
        async get() { return { weeklyReports }; },
        async set(value) { weeklyReports = value.weeklyReports; },
      },
    },
  };

  try {
    await saveWeeklyReport('2026-W15', { week_label: '2026 第 15 周', stats: '15 篇' });
    assertEqual(Object.keys(weeklyReports).length, 15);
    assert(weeklyReports['2026-W01'], '旧周报不能被裁剪掉');
    assert(weeklyReports['2026-W15'], '新周报应保存');
  } finally {
    window.chrome = oldChrome;
  }
});

test('buildStyleFingerprintPrompt/renderStyleFingerprintCard: 写作指纹卡闭环', () => {
  const prompt = buildStyleFingerprintPrompt(REVIEW_FIXTURE);
  assert(prompt.includes('结构推进稳定'), 'prompt 应包含 craft_review summary');
  assert(prompt.includes('第二人称'), 'prompt 应要求第二人称');
  assert(prompt.includes('高频主题'), 'prompt 应要求高频主题');
  assert(prompt.includes('隐性连接'), 'prompt 应要求作品之间的隐性连接');
  assert(hasFingerprintContext(REVIEW_FIXTURE[0]), '有核心判断和节点的作品应可进入指纹上下文');
  assert(fallbackStyleFingerprint(REVIEW_FIXTURE).content.includes('问题切口'), '本地 fallback 也应生成结构化指纹');

  const html = renderStyleFingerprintCard({
    generatedAt: '2026-05-08T12:00:00.000Z',
    content: '高频主题：文学 → 叙事结构 → 细节推动\n论证方式：你擅长把细节推进成判断。',
  });
  const host = document.createElement('div');
  host.innerHTML = html;
  assert(host.textContent.includes('你的写作指纹'), '应显示指纹标题');
  assert(host.textContent.includes('高频主题'), '应渲染结构化指纹内容');
  assert(host.querySelector('#refreshStyleFingerprintBtn'), '应提供刷新按钮');
});

test('isStyleFingerprintFresh: 新版结构化缓存同月有效，旧缓存失效', () => {
  const fp = {
    schema: STYLE_FINGERPRINT_SCHEMA,
    generatedAt: '2026-05-01T00:00:00.000Z',
    content: '高频主题：A\n论证方式：B\n表达气质：C\n反复世界观：D\n问题切口：E\n隐性连接：F',
  };
  const legacy = { generatedAt: '2026-05-01T00:00:00.000Z', content: '旧版一段式指纹' };
  assert(isStyleFingerprintFresh(fp, new Date('2026-05-20T00:00:00')), '同月应视为新鲜');
  assert(!isStyleFingerprintFresh(legacy, new Date('2026-05-20T00:00:00')), '旧版一段式缓存应失效并触发新版指纹');
  assert(!isStyleFingerprintFresh(fp, new Date('2026-06-01T00:00:00')), '跨月应自动更新');
});

test('reviewChatPanel/buildReviewChatMessages: 4 模板按钮与周复盘上下文', () => {
  const host = document.createElement('div');
  host.innerHTML = reviewChatPanel();
  assertEqual(host.querySelectorAll('[data-review-template]').length, 4);
  assert(host.querySelector('#reviewChatPanel').hidden, '复盘对话默认不展开');

  reviewChatHistory = [{ role: 'assistant', content: '上一轮回答' }];
  const context = buildReviewChatContext(REVIEW_FIXTURE, REVIEW_FIXTURE.filter(r => r.article.type !== 'idea'), new Date('2026-05-08T12:00:00'));
  const messages = buildReviewChatMessages(context, REVIEW_CHAT_TEMPLATES.amplify.prompt);
  assert(messages[1].content.includes('本周作品'), '应包含本周作品上下文');
  assert(messages[1].content.includes('上周作品'), '应包含上周作品上下文');
  assert(messages.some(m => m.content === '上一轮回答'), '应携带历史对话');
});

test('reviewNavBlockHtml/reviewAnchorSection: 复盘导航切换为单页分区入口', () => {
  const host = document.createElement('div');
  host.innerHTML = [
    reviewNavBlockHtml('timeline'),
    reviewAnchorSection('timeline', '时间轴', '时间轴'),
  ].join('');

  assert(host.querySelector('.review-nav-title')?.textContent.includes('复盘'), '导航应归入复盘二级标题下');
  assertEqual(host.querySelectorAll('.review-anchor').length, 5);
  for (const [id, label] of REVIEW_ANCHORS) {
    assert(host.querySelector(`.review-anchor[data-anchor="${id}"]`)?.textContent.includes(label), `应存在分页入口 ${label}`);
  }
  assert(host.querySelector('.review-anchor[data-anchor="timeline"]')?.classList.contains('active'), '当前分区入口应高亮');
  assertEqual(host.querySelectorAll('.review-section').length, 1);
  assert(host.querySelector('#review-timeline'), '一次只渲染当前复盘分区');
  assert(!host.querySelector('#review-overview'), '非当前分区不应堆在同一页');
});

test('reviewNodes: 默认只显示前三个高频节点，可展开和收起', () => {
  const host = document.createElement('div');
  const nodes = Array.from({ length: 5 }, (_, index) => ({
    name: `节点${index + 1}`,
    type: 'concept',
    count: 5 - index,
  }));
  host.innerHTML = reviewNodes(nodes);
  document.body.appendChild(host);

  const visibleCount = () => Array.from(host.querySelectorAll('.node-freq-item'))
    .filter(el => !el.closest('.review-node-extra[hidden]')).length;

  try {
    assertEqual(visibleCount(), 3);
    const btn = host.querySelector('.review-node-toggle');
    assert(btn.textContent.includes('展开全部 5 个'), '应显示展开全部按钮');

    bindReviewNodeToggles(host);
    btn.click();
    assert(host.querySelector('.review-node-list').classList.contains('expanded'), '展开后列表应进入滚动容器态');
    assertEqual(visibleCount(), 5);
    assertEqual(btn.textContent, '收起');

    btn.click();
    assertEqual(visibleCount(), 3);
    assert(btn.textContent.includes('展开全部 5 个'), '收起后应恢复展开按钮文案');
  } finally {
    host.remove();
  }
});

}
