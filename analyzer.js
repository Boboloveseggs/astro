'use strict';

// ── Prompt ───────────────────────────────────────────────────────────────────
const SYSTEM = `你是一位知识地图分析师。只输出 JSON，不要有任何说明或 markdown 代码块标记。`;

const makeUserPrompt = text => `分析以下文章，严格按照下方格式输出 JSON（仅 JSON，不加任何说明文字）：

{
  "domain": "主学科领域",
  "sub_domain": "具体分支",
  "perspective": "分析视角（词组）",
  "core_claim": "核心判断（20字以内）",
  "creator_strength": "用50-80字夸创作者：这篇里你最亮眼的能力是什么？跟一般写法比，你做对了什么？措辞要让创作者有继续写的动力。",
  "craft_review": {
    "praise": "知识图鉴式夸奖：80-120 字。要像真正读懂了这篇作品一样，具体指出某段、某句、某个用词的好处，让创作者听到能笑出来。允许带轻微感叹（'真是…'、'最难得的是…'、'一般人写到这里都会…，你居然…'）。不要打分，不要罗列结构、用词、节奏等抽象维度——直接夸具体的句子或段落。",
    "praise_quote": "从原文里摘一句你最想夸的话（≤30 字）",
    "summary": "用一句话总评这篇文章的整体气质（≤30 字）"
  },
  "strengths": [
    {
      "dimension": "论证结构|概念界定|案例质量|跨学科连接|新颖视角（选最匹配的一项）",
      "evidence": "具体说明（引用文章中的具体做法，读者可自行验证，不写主观评语）"
    }
  ],
  "nodes_hit": [
    {
      "name": "节点名称",
      "type": "person|concept|theory|event",
      "role": "primary|secondary|background",
      "contribution": "这篇文章对此节点的贡献（一句话）"
    }
  ],
  "new_concepts": ["新引入的概念或视角"],
  "map_position": "在知识地图里的位置描述（一句话）",
  "next_suggestions": [
    {
      "type": "延伸|补空|跨域",
      "suggestion": "具体可写的选题",
      "reason": "为什么现在写这个有价值（结合该领域的空白、趋势或跨学科连接点，不写泛泛评语）",
      "theory_ref": "可参考理论或著作"
    }
  ],
  "connections": ["相邻领域或理论"],
  "reusable_clips": [
    {
      "type": "案例|数据|金句|比喻",
      "content": "可复用的具体片段（30字内引用原文）",
      "why_reusable": "为什么这块未来可换素材复用（一句）"
    }
  ],
  "essence_insights": [
    {
      "viewpoint": "独特观点",
      "why_essential": "为什么这是精华（一句）"
    }
  ],
  "tags": ["3-5个简短标签，每个不超过6字，用于快速归类过滤，如「行为经济学」「叙事结构」「职场」"],
  "insight": "用一句话说出这篇文章体现了创作者的什么能力或视角——重点是创作者本人，不是预测市场。从下列开头任选最贴切的（每篇选不同的）：「你在这篇文章里展示了一种能力：」「这篇文章能看出，你对X有一种别人少有的感知：」「你真正思考过这个问题，因为：」「这篇文章里有一个视角，是大多数人写同类题材时会错过的：」「你在这篇文章里做到了一件真正困难的事：」「能写出这篇文章，说明你：」"
}

文章内容：
${text}`;

function getCompetitionDefaultConfig() {
  const cfg = globalThis.COMPETITION_DEFAULTS || {};
  const providers = typeof PROVIDERS !== 'undefined' ? PROVIDERS : (globalThis.PROVIDERS || {});
  const apiKey = String(cfg.apiKey || '').trim();
  const provider = String(cfg.provider || 'zhipu').trim();
  const model = String(cfg.model || '').trim();
  if (!cfg.enabled || !apiKey || apiKey.includes('__') || !providers[provider]) return null;
  return {
    provider,
    model: model || providers[provider].models?.[0]?.id || 'glm-4-flash',
    apiKey,
    note: String(cfg.note || ''),
  };
}

function resolveProviderModel(settings = {}) {
  const providers = typeof PROVIDERS !== 'undefined' ? PROVIDERS : (globalThis.PROVIDERS || {});
  const competition = getCompetitionDefaultConfig();
  const provider = settings.provider || competition?.provider || 'zhipu';
  const model = settings.model
    || (competition?.provider === provider ? competition.model : '')
    || providers[provider]?.models?.[0]?.id
    || 'glm-4-flash';
  return { provider, model };
}

function getApiKeyForProvider(provider, apiKeys = {}) {
  if (apiKeys?.[provider]) return apiKeys[provider];
  const competition = getCompetitionDefaultConfig();
  return competition?.provider === provider ? competition.apiKey : '';
}

// ── 智谱 JWT ─────────────────────────────────────────────────────────────────
async function buildToken(apiKey) {
  const [id, secret] = apiKey.split('.');
  const now = Date.now();
  const b64url = s =>
    btoa(unescape(encodeURIComponent(s)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header   = b64url(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' }));
  const payload  = b64url(JSON.stringify({ api_key: id, exp: now + 3_600_000, timestamp: now }));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsigned));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${unsigned}.${sig}`;
}

// ── 统一 LLM 调用 ─────────────────────────────────────────────────────────────
async function callLLM(apiKey, provider, model, messages, maxTokens = 2500) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`未知提供商：${provider}`);

  if (cfg.auth === 'gemini') {
    const url = `${cfg.endpoint}${model}:generateContent?key=${apiKey}`;
    const sys  = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const body = { contents, generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
                   ...(sys ? { systemInstruction: { parts: [{ text: sys.content }] } } : {}) };
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`${resp.status}：${(await resp.text()).slice(0, 120)}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  let headers = { 'Content-Type': 'application/json' };
  let body;

  if (cfg.auth === 'jwt') {
    headers['Authorization'] = `Bearer ${await buildToken(apiKey)}`;
    body = { model, messages, temperature: 0.3, max_tokens: maxTokens };
  } else if (cfg.auth === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
    body = { model, messages, temperature: 0.3, max_tokens: maxTokens };
  } else if (cfg.auth === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    const sys     = messages.find(m => m.role === 'system');
    const userMsg = messages.filter(m => m.role !== 'system');
    body = { model, messages: userMsg, max_tokens: maxTokens,
             ...(sys ? { system: sys.content } : {}) };
  }

  const resp = await fetch(cfg.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`${resp.status}：${(await resp.text()).slice(0, 120)}`);

  const data = await resp.json();
  if (provider === 'anthropic') return data.content?.[0]?.text || '';
  return data.choices?.[0]?.message?.content || '';
}

// ── 解析并校验 AI 返回 ────────────────────────────────────────────────────────
function parseAndValidate(raw) {
  const jsonStr = raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '')
    .trim();

  let result;
  try {
    result = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI 返回格式异常，请重试。若持续出现请换用更强的模型（推荐 GLM-4-Plus 或 DeepSeek V3）');
  }

  for (const f of ['domain', 'core_claim']) {
    if (!result[f]?.trim?.()) throw new Error(`AI 返回数据缺少字段「${f}」，请重试`);
  }
  for (const f of ['nodes_hit', 'next_suggestions']) {
    if (!Array.isArray(result[f]) || !result[f].length)
      throw new Error(`AI 返回数据缺少字段「${f}」，请重试`);
  }

  return { result, jsonStr };
}
