'use strict';

{

// ── panel.js 时间轴 deck 测试 ───────────────────────────────────────────────
// 覆盖：双轴、卡片牌组、slider、右侧 gear
const { test, assert } = Suite;

const TL_FIXTURE = [
  {
    id: 'tl001',
    savedAt: '2024-05-07T10:00:00.000Z',
    article: { title: '第一篇文章', body: '这是一段用于时间轴卡片摘要的正文。' },
    analysis: { domain: '文学', sub_domain: '叙事', nodes_hit: [{ name: '红楼梦', type: 'theory', role: 'primary', contribution: '测试' }] },
  },
  {
    id: 'tl002',
    savedAt: '2024-05-07T12:00:00.000Z',
    article: { title: '第二篇文章', body: '第二段正文。' },
    analysis: { domain: '哲学', sub_domain: '认识论', nodes_hit: [] },
  },
  {
    id: 'tl003',
    savedAt: '2024-05-06T08:00:00.000Z',
    article: { title: '前一天文章', body: '前一天的正文。' },
    analysis: { domain: '历史', nodes_hit: [] },
  },
];

test('renderTimelineDeck: 输出双轴、卡片牌组、slider 和 gear', () => {
  selectedTimelineDate = '';
  selectedTimelineArticle = '';
  const host = document.createElement('div');
  host.innerHTML = renderTimelineDeck(TL_FIXTURE);
  document.body.appendChild(host);
  bindTimelineDeck(host);

  assert(host.querySelector('.tl-date-path'), '应渲染上轴面包屑');
  assert(host.querySelectorAll('.tl-date-dot-btn').length >= 2, '应渲染下轴日期圆点');
  assert(host.querySelectorAll('.tl-deck-card').length === 2, '默认选中最新日期下的 2 张卡');
  assert(host.querySelector('.tl-card-slider'), '应渲染底部 slider');
  assert(host.querySelector('.tl-date-gear-item'), '应渲染右侧 gear 列表');

  stopTimelineDeckForTest();
  host.remove();
});

test('selectTimelineDeckCardByIndex: slider 选择会切换 active 卡片', () => {
  selectedTimelineDate = '';
  selectedTimelineArticle = '';
  const host = document.createElement('div');
  host.innerHTML = renderTimelineDeck(TL_FIXTURE);
  document.body.appendChild(host);
  bindTimelineDeck(host);

  selectTimelineDeckCardByIndex(1);
  const active = host.querySelector('.tl-deck-card.active');
  assert(active?.dataset.articleId === 'tl001', '索引 1 应选中同日较早的一张卡');

  stopTimelineDeckForTest();
  host.remove();
});

function stopTimelineDeckForTest() {
  clearTimeout(timelineDeckHoverTimer);
  if (timelineDeckScrollFrame) cancelAnimationFrame(timelineDeckScrollFrame);
  timelineDeckScrollFrame = null;
}

}

