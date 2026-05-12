'use strict';

// ── db.js 纯函数测试 ─────────────────────────────────────────────────────────
// 覆盖：buildArticleMarkdown、parseMarkdownRecord 及两者的往返一致性
const { test, assert, assertEqual } = Suite;

let isolatedDbSeq = 0;

function useIsolatedDb(label) {
  const name = `zhijing_db_test_${label}_${Date.now()}_${isolatedDbSeq++}`;
  globalThis.__ZHJ_TEST_DB_NAME__ = name;
  return name;
}

function createLegacyV3Database(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 3);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      const articles = db.createObjectStore('articles', { keyPath: 'id' });
      articles.createIndex('by_date', 'savedAt');
      articles.createIndex('by_url', 'url');
      articles.createIndex('by_project', 'project_id');
      db.createObjectStore('nodes', { keyPath: 'id' });
      db.createObjectStore('config', { keyPath: 'key' });
    };
    req.onerror = e => reject(e.target.error);
    req.onsuccess = e => {
      const db = e.target.result;
      const t = db.transaction(['articles', 'nodes', 'config'], 'readwrite');
      t.objectStore('articles').put({
        id: 'legacy_article',
        savedAt: '2024-01-01T00:00:00.000Z',
        url: 'https://example.com/legacy',
        project_id: 'default',
        article: { title: '旧库文章', type: 'article', body: '旧正文' },
        analysis: { domain: '文学', core_claim: '旧判断', nodes_hit: [] },
      });
      t.objectStore('nodes').put({ id: 'legacy_node', name: '旧节点', type: 'concept', articles: ['legacy_article'] });
      t.objectStore('config').put({ key: 'projects', value: [{ id: 'default', name: '默认项目' }] });
      t.oncomplete = () => { db.close(); resolve(); };
      t.onerror = err => reject(err.target.error);
    };
  });
}

const SAMPLE_REC = {
  id: 'test000abc123',
  savedAt: '2024-03-10T08:00:00.000Z',
  url: 'https://zhuanlan.zhihu.com/p/999999',
  article: { title: '行为经济学入门', author: '张三', url: 'https://zhuanlan.zhihu.com/p/999999', type: 'article' },
  analysis: {
    domain: '经济学', sub_domain: '行为经济学',
    perspective: '认知偏误视角',
    core_claim: '人类决策系统性偏离理性假设',
    map_position: '行为经济学核心框架',
    tags: ['行为经济学', '认知偏误', '决策'],
    strengths: [{ dimension: '论证结构', evidence: '用禀赋效应实验说明损失厌恶' }],
    nodes_hit: [
      { name: '丹尼尔·卡尼曼', type: 'person',  role: 'primary',    contribution: '双系统理论提出者' },
      { name: '损失厌恶',      type: 'concept', role: 'secondary',   contribution: '核心解释机制' },
    ],
    new_concepts: ['快思慢想', '禀赋效应'],
    connections: ['心理学', '神经科学'],
    insight: '你在这篇文章里展示了一种能力：用可验证的实验替代抽象理论',
    next_suggestions: [
      { type: '延伸', suggestion: '前景理论的创作实践', reason: '填补应用层空白', theory_ref: '《思考，快与慢》' },
    ],
  },
};

// ── 0. 备份配置白名单 ───────────────────────────────────────────────────────
test('normalizeBackupConfig: 只保留可备份的 config 白名单', () => {
  const cfg = normalizeBackupConfig({
    projects: [{ id: 'default', name: '默认项目', createdAt: '2024-01-01T00:00:00.000Z' }],
    asset_views: [{ id: 'v1', name: '哲学视图', filters: { year: '2024', domain: '哲学', node: '康德', type: 'article' } }],
    local_folder: { name: '不能序列化的句柄' },
  });
  assertEqual(cfg.projects.length, 1);
  assertEqual(cfg.asset_views.length, 1);
  assert(!Object.prototype.hasOwnProperty.call(cfg, 'local_folder'), '本地文件夹句柄不应进入 JSON 备份');
});

test('normalizeBackupConfig: 忽略格式异常的视图配置', () => {
  const cfg = normalizeBackupConfig({
    projects: [{ id: 'default', name: '默认项目' }, { id: 123, name: '坏项目' }],
    asset_views: [
      { id: 'ok', name: '有效视图', filters: { year: 2024 } },
      { id: 'bad', name: '坏视图' },
    ],
  });
  assertEqual(cfg.projects.length, 1);
  assertEqual(cfg.asset_views.length, 1);
  assertEqual(cfg.asset_views[0].filters.year, '2024');
});

test('sameProjectId: 缺失 project_id 视为 default，但不同项目不相等', () => {
  assert(sameProjectId({ project_id: '' }, { project_id: 'default' }), '空 project_id 应按 default 处理');
  assert(!sameProjectId({ project_id: 'p1' }, { project_id: 'p2' }), '不同项目不能被视为同一项目');
});

test('findUniqueUrlRecord: URL 跨多项目重复时不返回兜底记录', () => {
  const records = [
    { id: 'a', url: 'https://example.com/a', project_id: 'p1' },
    { id: 'b', url: 'https://example.com/a', project_id: 'p2' },
    { id: 'c', url: 'https://example.com/c', project_id: 'p1' },
  ];
  assertEqual(findUniqueUrlRecord(records, 'https://example.com/a'), null);
  assertEqual(findUniqueUrlRecord(records, 'https://example.com/c').id, 'c');
});

test('findUniqueShortIdRecord: shortId 碰撞时不返回兜底记录', () => {
  const records = [
    { id: 'alphaabc123' },
    { id: 'betaabc123' },
    { id: 'gammaxyz789' },
  ];
  assertEqual(findUniqueShortIdRecord(records, 'abc123'), null);
  assertEqual(findUniqueShortIdRecord(records, 'xyz789').id, 'gammaxyz789');
});

// ── 0b. clips store / v4 migration ─────────────────────────────────────────
test('dbSaveClip/dbGetClips: 可保存并按 type/project 读取素材', async () => {
  useIsolatedDb('clip_save');
  await dbSaveClip({
    id: 'clip_a',
    type: '素材',
    content: '一个可复用案例',
    why_reusable: '可替换到别的文章',
    source_article_id: 'a1',
    source_article_title: '来源文章',
    project_id: 'p1',
    savedAt: '2024-01-02T00:00:00.000Z',
  });
  await dbSaveClip({
    id: 'clip_b',
    type: '立意',
    content: '一个立意',
    source_article_id: 'a1',
    project_id: 'p1',
    savedAt: '2024-01-03T00:00:00.000Z',
  });
  const clips = await dbGetClips({ type: '素材', project: 'p1' });
  assertEqual(clips.length, 1);
  assertEqual(clips[0].content, '一个可复用案例');
});

test('dbDeleteClip: 可删除单条 clip', async () => {
  useIsolatedDb('clip_delete');
  await dbSaveClip({ id: 'clip_del', type: '素材', content: '待删除', source_article_id: 'a1' });
  await dbDeleteClip('clip_del');
  const clips = await dbGetClips();
  assertEqual(clips.length, 0);
});

test('dbDeleteClipsBySource: 可按 source_article_id 批量删除', async () => {
  useIsolatedDb('clip_delete_source');
  await dbSaveClip({ id: 'clip_s1', type: '素材', content: '同源1', source_article_id: 'a1' });
  await dbSaveClip({ id: 'clip_s2', type: '立意', content: '同源2', source_article_id: 'a1' });
  await dbSaveClip({ id: 'clip_s3', type: '素材', content: '其他源', source_article_id: 'a2' });
  await dbDeleteClipsBySource('a1');
  const clips = await dbGetClips();
  assertEqual(clips.length, 1);
  assertEqual(clips[0].id, 'clip_s3');
});

test('dbReplaceClipsBySource: 删除旧片段后写入新片段', async () => {
  useIsolatedDb('clip_replace_source');
  await dbSaveClip({ id: 'clip_old', type: '素材', content: '旧素材', source_article_id: 'a1' });
  await dbReplaceClipsBySource('a1', [
    { id: 'clip_new', type: '立意', content: '新立意', source_article_id: 'a1', project_id: 'p1' },
  ]);
  const clips = await dbGetClips({ source_article_id: 'a1' });
  assertEqual(clips.length, 1);
  assertEqual(clips[0].id, 'clip_new');
  assertEqual(clips[0].type, '立意');
});

test('dbDeleteArticle: 删除文章时连带清理 clips', async () => {
  useIsolatedDb('clip_delete_article');
  await dbSaveArticle({
    id: 'article_with_clip',
    savedAt: '2024-01-04T00:00:00.000Z',
    project_id: 'default',
    article: { title: '带素材文章', type: 'article', body: '正文' },
    analysis: {},
  });
  await dbSaveClip({ id: 'clip_linked', type: '素材', content: '跟随文章删除', source_article_id: 'article_with_clip' });
  await dbDeleteArticle('article_with_clip');
  const clips = await dbGetClips({ source_article_id: 'article_with_clip' });
  const articles = await dbGetAllArticles();
  assertEqual(clips.length, 0);
  assertEqual(articles.length, 0);
});

test('DB v3→v4 migration: 保留 articles/nodes/config 并创建 clips store', async () => {
  const name = useIsolatedDb('migration_v3_v4');
  await createLegacyV3Database(name);
  const articles = await dbGetAllArticles();
  const nodes = await dbGetAllNodes();
  const projects = await dbGetConfig('projects');
  const clips = await dbGetClips();
  assertEqual(articles.length, 1);
  assertEqual(articles[0].id, 'legacy_article');
  assertEqual(nodes.length, 1);
  assertEqual(projects[0].id, 'default');
  assertEqual(clips.length, 0);
});

// ── 1. buildArticleMarkdown ──────────────────────────────────────────────────
test('buildArticleMarkdown: 标题输出为 H1 首行', () => {
  const md = buildArticleMarkdown(SAMPLE_REC);
  assert(md.startsWith('# 行为经济学入门'), '第一行应为 # 行为经济学入门');
});

test('buildArticleMarkdown: tags 写入 **标签**：行', () => {
  const md = buildArticleMarkdown(SAMPLE_REC);
  assert(md.includes('**标签**：行为经济学 · 认知偏误 · 决策'), '应包含完整标签行');
});

test('buildArticleMarkdown: 知识节点格式正确', () => {
  const md = buildArticleMarkdown(SAMPLE_REC);
  assert(md.includes('- [primary] **丹尼尔·卡尼曼**（person）— 双系统理论提出者'), '节点格式应匹配');
});

test('buildObsidianMarkdown: 输出 YAML front-matter', () => {
  const md = buildObsidianMarkdown(SAMPLE_REC, '默认项目');
  assert(md.startsWith('---\n'), '应以 front-matter 开头');
  assert(md.includes('title: "行为经济学入门"'), 'front-matter 应包含标题');
  assert(md.includes('project: "默认项目"'), 'front-matter 应包含项目名');
});

test('buildObsidianMarkdown: tags 和 nodes 可被 Obsidian 索引', () => {
  const md = buildObsidianMarkdown(SAMPLE_REC, '默认项目');
  assert(md.includes('tags:\n  - "行为经济学"\n  - "认知偏误"\n  - "决策"'), 'tags 应输出为 YAML 数组');
  assert(md.includes('nodes:\n  - "丹尼尔·卡尼曼"\n  - "损失厌恶"'), 'nodes 应输出为 YAML 数组');
  assert(md.includes('[[丹尼尔·卡尼曼]]'), '知识节点正文应输出为 Wikilink');
});

test('buildObsidianMarkdown: 速记正文写入 Markdown', () => {
  const md = buildObsidianMarkdown({
    id: 'idea001',
    savedAt: '2024-03-11T08:00:00.000Z',
    project_id: 'default',
    article: { title: '一个选题念头', body: '比较卡尼曼和巴赫金的叙事判断。', type: 'idea' },
    analysis: {},
  }, '默认项目');
  assert(md.includes('type: "idea"'), 'front-matter 应保留速记类型');
  assert(md.includes('## 速记\n比较卡尼曼和巴赫金的叙事判断。'), '速记正文应被导出');
});

test('buildArticleMarkdown: 速记写出本地 Markdown 正文', () => {
  const md = buildArticleMarkdown({
    id: 'idea001',
    savedAt: '2024-03-11T08:00:00.000Z',
    article: { title: '一个选题念头', body: '比较卡尼曼和巴赫金的叙事判断。', type: 'idea' },
    analysis: {},
  });
  assert(md.includes('# 一个选题念头'), '速记应保留标题');
  assert(md.includes('## 速记\n比较卡尼曼和巴赫金的叙事判断。'), '速记正文应写入本地 Markdown');
});

test('extractWikilinks: 解析并去重 Obsidian 链接', () => {
  const links = extractWikilinks('参考 [[卡尼曼]]、[[损失厌恶|损失]]、[[卡尼曼]]、[[前景理论#章节]]');
  assertEqual(links.length, 3);
  assertEqual(links[0], '卡尼曼');
  assertEqual(links[1], '损失厌恶');
  assertEqual(links[2], '前景理论');
});

test('buildLocalMarkdownFilename: 标题参与文件名但 shortId 稳定', () => {
  const filename = buildLocalMarkdownFilename({
    id: 'test000abc123',
    savedAt: '2024-03-10T08:00:00.000Z',
    article: { title: 'A/B:C*D?E"F<G>H|I' },
  });
  assertEqual(filename, '2024-03-10_A_B_C_D_E_F_G_H_I_abc123.md');
});

// ── 2. parseMarkdownRecord ───────────────────────────────────────────────────
test('parseMarkdownRecord: 解析标题', () => {
  const md = '# 测试文章标题\n\n原文：https://example.com\n';
  const r  = parseMarkdownRecord(md, '2024-01-01_测试文章标题_abc123.md');
  assertEqual(r.title, '测试文章标题');
});

test('parseMarkdownRecord: 解析原文 URL', () => {
  const md = '# T\n\n原文：https://zhihu.com/p/123\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assertEqual(r.url, 'https://zhihu.com/p/123');
});

test('parseMarkdownRecord: 解析领域和子领域', () => {
  const md = '# T\n\n**领域**：经济学 · 行为经济学\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assertEqual(r.analysis.domain,     '经济学');
  assertEqual(r.analysis.sub_domain, '行为经济学');
});

test('parseMarkdownRecord: 解析知识节点', () => {
  const md = '# T\n\n## 知识节点\n- [primary] **卡尼曼**（person）— 提出双系统\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assertEqual(r.analysis.nodes_hit.length, 1);
  assertEqual(r.analysis.nodes_hit[0].name, '卡尼曼');
  assertEqual(r.analysis.nodes_hit[0].role, 'primary');
  assertEqual(r.analysis.nodes_hit[0].type, 'person');
});

test('parseMarkdownRecord: 知识节点格式异常时不返回空数组覆盖旧数据', () => {
  const md = '# T\n\n## 知识节点\n- [primary] **卡尼曼**(person) - 提出双系统\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assert(!Object.prototype.hasOwnProperty.call(r.analysis, 'nodes_hit'), '格式异常时应保留旧 nodes_hit');
});

test('parseMarkdownRecord: 知识节点部分异常时整段不覆盖旧数据', () => {
  const md = '# T\n\n## 知识节点\n- [primary] **卡尼曼**（person）— 提出双系统\n- [secondary] **损失厌恶**(concept) - 半角格式坏掉\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assert(!Object.prototype.hasOwnProperty.call(r.analysis, 'nodes_hit'), '只要存在异常节点行，就应保留旧 nodes_hit');
  assert(r.warnings.some(w => w.includes('知识节点')), '应返回可提示用户的节点解析 warning');
});

test('parseMarkdownRecord: 解析 tags', () => {
  const md = '# T\n\n**标签**：AI · 创作 · 效率\n';
  const r  = parseMarkdownRecord(md, 'x.md');
  assertEqual(r.analysis.tags.length, 3);
  assertEqual(r.analysis.tags[0], 'AI');
  assertEqual(r.analysis.tags[2], '效率');
});

test('parseMarkdownRecord: 从文件名末段提取 shortId', () => {
  const md = '# T\n';
  const r  = parseMarkdownRecord(md, '2024-03-10_行为经济学入门_abc123.md');
  assertEqual(r.shortId, 'abc123');
});

test('parseMarkdownRecord: 忽略过短 shortId，避免误匹配', () => {
  const md = '# T\n';
  const r  = parseMarkdownRecord(md, 'a_b.md');
  assertEqual(r.shortId, '');
  assert(r.warnings.some(w => w.includes('shortId')), '应提示 shortId 被忽略');
});

test('parseMarkdownRecord: long shortId 取末 6 位匹配库内 id', () => {
  const md = '# T\n';
  const r  = parseMarkdownRecord(md, '2024-03-10_文章_test000abc123.md');
  assertEqual(r.shortId, 'abc123');
});

test('parseMarkdownRecord: 解析速记正文为 article patch', () => {
  const md = '# 一个选题念头\n\n## 速记\n比较卡尼曼和巴赫金的叙事判断。\n## 小标题\n第二行继续。\n';
  const r  = parseMarkdownRecord(md, '2024-03-11_一个选题念头_idea01.md');
  assertEqual(r.article.type, 'idea');
  assertEqual(r.article.title, '一个选题念头');
  assert(r.article.body.includes('## 小标题'), '速记正文里的 Markdown 标题不应截断正文');
  assert(r.article.body.includes('第二行继续。'), '速记正文应保留多行内容');
});

test('parseMarkdownRecord: 提取全文 wikilinks', () => {
  const r = parseMarkdownRecord('# T\n\n## 编辑评语\n连接到 [[卡尼曼]] 和 [[损失厌恶]]。\n', 'x.md');
  assertEqual(r.analysis.wikilinks.length, 2);
  assertEqual(r.analysis.wikilinks[0], '卡尼曼');
});

test('mergeParsedMarkdownRecord: 合并标题和分析补丁', () => {
  const parsed = parseMarkdownRecord('# 新标题\n\n**核心判断**：新的判断\n', 'x.md');
  const merged = mergeParsedMarkdownRecord(SAMPLE_REC, parsed);
  assertEqual(merged.record.article.title, '新标题');
  assertEqual(merged.record.analysis.core_claim, '新的判断');
  assert(merged.hasPatch, '标题或分析改动应被识别为 patch');
});

test('mergeParsedMarkdownRecord: 相同 Markdown 不产生 patch', () => {
  const parsed = parseMarkdownRecord(buildArticleMarkdown(SAMPLE_REC), 'x.md');
  const merged = mergeParsedMarkdownRecord(SAMPLE_REC, parsed);
  assert(!merged.hasPatch, '内容未变化时不应计为同步 patch');
  assert(!merged.shouldReplaceNodes, '节点未变化时不应重建节点表');
});

test('mergeParsedMarkdownRecord: 普通文章不被速记段落改成 idea', () => {
  const parsed = parseMarkdownRecord('# 普通文章\n\n## 速记\n这不应覆盖普通文章正文\n', 'x.md');
  const merged = mergeParsedMarkdownRecord(SAMPLE_REC, parsed);
  assertEqual(merged.record.article.type, 'article');
  assertEqual(merged.record.article.body, undefined);
});

test('mergeParsedMarkdownRecord: 速记正文可回写', () => {
  const idea = {
    id: 'idea001',
    savedAt: '2024-03-11T08:00:00.000Z',
    article: { title: '旧标题', body: '旧正文', type: 'idea' },
    analysis: {},
  };
  const parsed = parseMarkdownRecord('# 新标题\n\n## 速记\n新正文\n', 'idea.md');
  const merged = mergeParsedMarkdownRecord(idea, parsed);
  assertEqual(merged.record.article.title, '新标题');
  assertEqual(merged.record.article.body, '新正文');
});

test('mergeParsedMarkdownRecord: 删除 wikilinks 可产生 patch', () => {
  const withLinks = {
    ...SAMPLE_REC,
    analysis: { ...SAMPLE_REC.analysis, wikilinks: ['卡尼曼'] },
  };
  const parsed = parseMarkdownRecord(buildArticleMarkdown({ ...withLinks, analysis: { ...withLinks.analysis, wikilinks: [] } }), 'x.md');
  const merged = mergeParsedMarkdownRecord(withLinks, parsed);
  assert(merged.hasPatch, '删除已有 wikilinks 应被识别为 patch');
  assertEqual(merged.record.analysis.wikilinks.length, 0);
});

// ── 3. build → parse 往返一致性 ──────────────────────────────────────────────
test('build→parse 往返：core_claim 保持一致', () => {
  const md     = buildArticleMarkdown(SAMPLE_REC);
  const parsed = parseMarkdownRecord(md, '2024-03-10_行为经济学入门_abc123.md');
  assertEqual(parsed.analysis.core_claim, SAMPLE_REC.analysis.core_claim);
});

test('build→parse 往返：tags 数量和内容保持一致', () => {
  const md     = buildArticleMarkdown(SAMPLE_REC);
  const parsed = parseMarkdownRecord(md, '2024-03-10_行为经济学入门_abc123.md');
  assertEqual(parsed.analysis.tags.length, SAMPLE_REC.analysis.tags.length);
  assertEqual(parsed.analysis.tags[0], SAMPLE_REC.analysis.tags[0]);
});
