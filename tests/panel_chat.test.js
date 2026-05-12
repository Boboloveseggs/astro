'use strict';

{

// ── D8 追问对话测试 ─────────────────────────────────────────
const { test, assert, assertEqual } = Suite;

function makeChatFixture() {
  const analysis = {
    domain: '文学',
    core_claim: '细节推动判断',
    creator_strength: '能把个人观察转成可讨论的判断。',
    nodes_hit: [{ name: '叙事结构', type: 'concept', role: 'primary', contribution: '支撑分析' }],
    reusable_clips: [{ content: '一个可复用素材', why_reusable: '可换题材' }],
    essence_insights: [{ viewpoint: '一个立意', why_essential: '可沉淀' }],
  };
  const id = createChatSession(analysis, JSON.stringify(analysis), 'chatTestHost', {
    articleText: '正文'.repeat(5000),
    articleTitle: '测试文章',
    record: { id: 'article_chat_001', project_id: 'p-chat', article: { title: '测试文章', body: '完整正文' } },
  });
  const host = document.createElement('div');
  host.innerHTML = cardChat(id);
  document.body.appendChild(host);
  return { host, card: host.querySelector('.chat-card'), session: chatSessions[id] };
}

test('cardChat: 渲染 6 个模板且不使用固定 id', () => {
  const html = cardChat('chat_unit');
  const host = document.createElement('div');
  host.innerHTML = html;
  assertEqual(host.querySelectorAll('[data-chat-template]').length, 6);
  assert(!host.querySelector('#chatHistory'), '追问区不应使用固定 id，避免多结果区冲突');
});

test('cardChat: 作者分身可使用专属模板与标题', () => {
  const html = cardChat('author_chat_unit', {
    label: '问问过去的我',
    placeholder: '向历史作品提问…',
    templates: AUTHOR_AGENT_TEMPLATES,
    templateAttr: 'data-author-template',
  });
  const host = document.createElement('div');
  host.innerHTML = html;
  assert(host.textContent.includes('问问过去的我'), '应渲染作者分身标题');
  assertEqual(host.querySelectorAll('[data-author-template]').length, 3);
  assertEqual(host.querySelector('.chat-input').getAttribute('placeholder'), '向历史作品提问…');
});

test('CHAT_TEMPLATES.craft: 使用知乎头部创作者视角文案', () => {
  assertEqual(CHAT_TEMPLATES.craft.label, '用头部创作者视角看我的结构和用词怎么样？');
  assert(CHAT_TEMPLATES.craft.prompt.includes('知乎头部创作者'), 'prompt 应强调知乎头部创作者视角');
  assert(!CHAT_TEMPLATES.craft.label.includes('语文老师'), '追问模板不应再出现语文老师标准');
});

test('buildAuthorAgentMessages: 作者分身只能基于历史作品资产回答', () => {
  const session = {
    agentMode: 'author',
    authorContext: {
      articleCount: 1,
      works: [{
        title: '位置决定命运',
        core_claim: '位置决定命运，信息差即权力',
        asset_cards: [{ type: '核心观点', title: '位置决定命运' }],
        reusable_clips: [{ content: '西门庆的资源入口' }],
      }],
    },
    history: [],
  };
  const messages = buildAuthorAgentMessages(session, '我以前怎么看位置决定命运？');
  assert(messages[0].content.includes('只能基于'), '系统提示应限制只能基于历史资产');
  assert(messages[1].content.includes('位置决定命运'), '上下文应包含历史旧文');
  assert(messages[messages.length - 1].content.includes('相关旧文'), '提问应要求引用相关旧文');
  assert(messages[messages.length - 1].content.includes('可以继续扩写'), '提问应要求给出下一步方向');
});

test('buildAuthorAgentContext: 从历史作品提取分身依据', () => {
  const context = buildAuthorAgentContext([{
    id: 'old-article',
    savedAt: '2026-05-12T00:00:00.000Z',
    article: { title: '旧文章', type: 'article' },
    analysis: {
      domain: '文学',
      sub_domain: '社会结构',
      core_claim: '位置决定命运',
      creator_strength: '擅长结构分析',
      asset_cards: [
        { type: 'core_viewpoint', title: '位置决定命运', summary: '结构分析', keywords: ['位置'], reuse_score: 5 },
      ],
      nodes_hit: [
        { name: '位置决定命运', type: 'concept', role: 'primary', contribution: '核心节点' },
      ],
    },
  }]);
  assertEqual(context.articleCount, 1);
  assertEqual(context.works[0].title, '旧文章');
  assert(context.topThemes.some(item => item.name === '文学 · 社会结构'), '应提取高频主题');
  assert(context.topNodes.some(item => item.name === '位置决定命运'), '应提取高频节点');
  assertEqual(context.works[0].asset_cards[0].title, '位置决定命运');
});

test('buildAssetRemixPrompt: 资产卡可生成下一篇文章结构', () => {
  const prompt = buildAssetRemixPrompt({
    type: '核心观点',
    title: '位置决定命运',
    summary: '这是一张核心观点资产。',
    source: '旧文标题',
    keywords: ['位置', '命运'],
    whyReusable: '可迁移到职场和平台生态。',
    reuseScore: 5,
  });
  assert(prompt.includes('新选题'), '应生成新选题');
  assert(prompt.includes('标题建议'), '应生成标题建议');
  assert(prompt.includes('文章大纲'), '应生成文章大纲');
  assert(prompt.includes('可能反驳点'), '应生成反驳点');
  assert(prompt.includes('旧文章如何继续为下一篇创作工作'), '应强化旧文复利价值');
});

test('buildChatMessages: 带正文/分析摘要/最近 6 轮历史并截断正文', () => {
  const { host, session } = makeChatFixture();
  session.history = Array.from({ length: 8 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: `历史 ${i}`,
  }));
  const messages = buildChatMessages(session, '继续追问');
  assertEqual(messages[0].role, 'system');
  assert(messages[1].content.includes('测试文章'), '应包含文章标题');
  assert(messages[1].content.includes('上下文已截断'), '长正文应做 token 截断');
  assert(messages.some(m => m.content.includes('core_claim')), '应包含分析 JSON 摘要');
  assertEqual(messages.filter(m => String(m.content).startsWith('历史')).length, 6);
  assertEqual(messages[messages.length - 1].content, '继续追问');
  host.remove();
});

test('buildChatClip: 模板入库使用稳定 id，重复保存会覆盖而不是新增', () => {
  const { host, session } = makeChatFixture();
  const a = buildChatClip(session, '立意', '回答内容', { dedupeKey: 'praise' });
  const b = buildChatClip(session, '立意', '新回答内容', { dedupeKey: 'praise' });
  assertEqual(a.id, b.id);
  assertEqual(a.source_article_id, 'article_chat_001');
  assertEqual(a.project_id, 'p-chat');
  assertEqual(a.type, '立意');
  host.remove();
});

test('parseMaterialReply: 将素材模板回答拆成多条素材', () => {
  const pieces = parseMaterialReply('1. 场景素材：雨夜争执\n- 金句素材：细节不是装饰\n普通说明');
  assertEqual(pieces.length, 2);
  assert(pieces[0].includes('雨夜争执'), '应保留条目正文');
});

test('saveAutoChatReply: praise 自动保存为立意，reuse 自动保存为多条素材', async () => {
  const { host, session } = makeChatFixture();
  const saved = [];
  const oldSave = dbSaveClip;
  const oldGet = dbGetClips;
  const oldDelete = dbDeleteClip;
  dbSaveClip = async clip => { saved.push(clip); };
  dbGetClips = async () => [{ id: 'chat_article_chat_001_reuse_9', project_id: 'p-chat' }];
  dbDeleteClip = async id => { saved.push({ deleted: id }); };

  await saveAutoChatReply(session, {
    templateKey: 'praise',
    content: '你最好的地方是判断稳定。',
  }, CHAT_TEMPLATES.praise);
  await saveAutoChatReply(session, {
    templateKey: 'reuse',
    content: '1. 场景素材：雨夜争执\n2. 金句素材：细节不是装饰',
  }, CHAT_TEMPLATES.reuse);

  assertEqual(saved[0].type, '立意');
  assertEqual(saved[1].deleted, 'chat_article_chat_001_reuse_9');
  assertEqual(saved[2].type, '素材');
  assertEqual(saved[3].type, '素材');
  assert(saved[0].id.includes('praise'), '模板自动入库应带稳定去重 key');

  dbSaveClip = oldSave;
  dbGetClips = oldGet;
  dbDeleteClip = oldDelete;
  host.remove();
});

test('sendChatQuestion: isChatting 防止连续点击产生并发请求', async () => {
  const { host, card } = makeChatFixture();
  const oldChrome = window.chrome;
  const oldKeys = getStoredApiKeys;
  const oldCall = callLLM;
  let callCount = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });

  window.chrome = { storage: { sync: { get: async () => ({ provider: 'zhipu', model: 'test-model' }) } } };
  getStoredApiKeys = async () => ({ zhipu: 'test-key' });
  callLLM = async () => {
    callCount++;
    await pending;
    return 'AI 回答';
  };

  const first = sendChatQuestion(card, '第一个问题', { label: '第一个问题', custom: true });
  await sendChatQuestion(card, '第二个问题', { label: '第二个问题', custom: true });
  await new Promise(resolve => setTimeout(resolve, 0));
  assertEqual(callCount, 1);

  release();
  await first;
  assert(card.textContent.includes('AI 回答'), '首个请求完成后应渲染回答');

  callLLM = oldCall;
  getStoredApiKeys = oldKeys;
  window.chrome = oldChrome;
  host.remove();
});

}
