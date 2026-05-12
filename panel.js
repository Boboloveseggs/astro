'use strict';

let capturedText  = '';
let isAnalyzing   = false;
let isChatting    = false;
let activeProject = 'default';
let packagedDemoArticleLoaded = false;
let guidedDemoArticle = null;
let guidedDemoAnalysis = null;
let earthSphereState = null;
let earthSphereDemoFillEnabled = false;
let universeSceneState = null;
let assetListMode    = 'clips-material';
let assetSelectionState = { mode: 'clips-material', ids: new Set(), items: [], lastIndex: null };
let selectedTimelineDate = '';
let selectedTimelineArticle = '';
let timelineDeckItems = [];
let timelineDeckScrollFrame = null;
let timelineDeckHoverTimer = null;
let isReviewChatting = false;
let reviewChatContext = null;
let reviewChatHistory = [];
let weeklyReportAutoPromise = null;
let mapView = 'single';
let universeMode = 'domain';
let activeBallId = null;
let knowledgeLoadingTimer = null;
let knowledgeLoadingIndex = 0;
var DEBUG = false;

const UI_THEME_KEY = 'uiTheme';
const ONBOARDING_DONE_KEY = 'onboardingComplete';
const ONBOARDING_OPTIONS_PENDING_KEY = 'onboardingOptionsPending';
const ONBOARDING_RESUME_INDEX_KEY = 'onboardingResumeIndex';
const ONBOARDING_RESUME_SECTION_KEY = 'onboardingResumeSection';
const ONBOARDING_HINT_SEEN_KEY = 'onboardingHintSeen';
const THEME_RECOMMEND_DONE_KEY = 'themeRecommendDone';
const MAP_LIGHT_HINT_DONE_KEY = 'mapLightHintDone';
const DEMO_SEED_KEY = 'demoSeededFromPackage20260511';
const DEMO_DATA_PATH = 'demo_data/知识图鉴_演示数据_当前库.json';
const NODE_HOVER_SHOW_DELAY = 1000;
let nodeHoverShowTimer = null;
let nodeHoverHideTimer = null;
let nodeHoverPending   = null;
let onboardingState = { active: false, index: 0, section: 'analyze', wired: false };

const KNOWLEDGE_LOADING_MESSAGES = [
  '正在给旧观点松松筋…',
  '正在把散落灵感捡回仓库…',
  '正在给这篇文章量骨相…',
  '正在从句子里掏小火花…',
  '正在把随手一写变成资产…',
  '正在确认这不是普通碎碎念…',
  '正在给观点贴回家门牌…',
  '正在让素材按用途排队…',
  '正在审问标题：你想干嘛…',
  '正在给知识节点找邻居…',
  '正在把老文章擦亮再上架…',
  '正在闻一闻你的写作指纹…',
  '正在拆论证链的螺丝钉…',
  '正在从沙发缝里抠灵感…',
  '正在给下一篇递小纸条…',
  '正在检查观点有没有偷懒…',
  '正在把重复写过的事升级成母题…',
  '正在给冷门素材开灯…',
  '正在把知识星星擦到发亮…',
  '正在问旧文章：你还能干点啥…',
  '正在把金句从草稿堆里拎出来…',
  '正在给你的优势画重点…',
  '正在把文章送进宇宙户口本…',
  '正在给素材办理长期居住证…',
  '正在把思路揉成可复用面团…',
  '正在检测哪句话最有后劲…',
  '正在把观点从抽屉里请出来…',
  '正在给知识宇宙补一颗灯泡…',
  '正在看你到底总在惦记什么…',
  '正在从旧文里挖未来方向…',
];

const CHAT_ARTICLE_LIMIT = 7000;
const CHAT_ANALYSIS_LIMIT = 3200;
const CHAT_HISTORY_LIMIT = 6;
const CHAT_REPLY_LIMIT = 2200;
const chatSessions = {};
let chatSessionSeq = 0;
const MAP_STATE_KEY = 'zhj_map_state';
const UNIVERSE_ZOOM_MIN = 0.48;
const UNIVERSE_ZOOM_MAX = 1.85;
const UNIVERSE_ZOOM_STEP = 0.10;
const UNIVERSE_DRAG_ROTATE = 0.0048;
const UNIVERSE_FULL_ROTATION = Math.PI * 2;
const REVIEW_ANCHORS = [
  ['overview', '本周概览'],
  ['direction', '创作方向'],
  ['nodes', '高频节点'],
  ['timeline', '时间轴'],
  ['chat', 'AI 复盘'],
];
let activeReviewSection = 'overview';

const REVIEW_CHAT_TEMPLATES = {
  amplify: {
    label: '这周我哪篇内容最值得放大？',
    prompt: '请从本周作品里选出最值得继续放大的 1 篇，说明为什么，以及下一篇可以如何顺着它写。',
  },
  style: {
    label: '我这周开始形成什么写作风格了？',
    prompt: '请根据本周作品判断我正在形成的写作风格，必须结合标题、核心判断和创作者优势说明。',
  },
  next: {
    label: '下周该尝试什么新方向？',
    prompt: '请根据本周和本月作品，给出下周最值得尝试的 3 个新方向，每个方向给一个可写标题。',
  },
  progress: {
    label: '对比上周，我有哪些进步？',
    prompt: '请对比本周与上周作品，指出我在选题、表达、结构或素材意识上的具体进步。',
  },
};

const AUTHOR_AGENT_TEMPLATES = {
  position: {
    label: '我以前怎么看位置决定命运？',
    prompt: '请回答：我以前怎么看“位置决定命运”？请先概括历史作品中的核心判断，再列出相关旧文、可复用素材和下一篇可写方向。',
  },
  reuse: {
    label: '帮我找能复用的旧素材',
    prompt: '请从我的历史作品资产中找出最适合复用的旧素材，按观点、素材、金句和知识节点分组，并说明各自适合写到什么新文章里。',
  },
  next: {
    label: '基于旧文生成下一篇方向',
    prompt: '请基于我的历史作品资产，生成一篇新的知乎文章方向。必须包含标题、核心观点、开头、大纲、可复用旧素材和可能反驳点。',
  },
};

function formalizeProductName(text) {
  return String(text || '').replace(/\u7403\u7403/g, '知识图鉴');
}

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function applyUiTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.classList.toggle('theme-light', normalized === 'light');
  document.documentElement.dataset.theme = normalized;
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const isLight = normalized === 'light';
    btn.textContent = isLight ? '☾' : '☀';
    btn.title = isLight ? '关灯模式' : '开灯模式';
    btn.setAttribute('aria-label', isLight ? '关灯模式' : '开灯模式');
  }
  return normalized;
}

async function loadUiTheme() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return applyUiTheme('light');
  const { [UI_THEME_KEY]: theme = 'light' } = await chrome.storage.local.get(UI_THEME_KEY);
  return applyUiTheme(theme);
}

async function toggleUiTheme() {
  const next = document.documentElement.classList.contains('theme-light') ? 'dark' : 'light';
  applyUiTheme(next);
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [UI_THEME_KEY]: next });
  }
}

const PANEL_ONBOARDING_SECTIONS = {
  analyze: {
    label: '分析区引导',
    steps: [
      {
        title: '第一步：先配置自己的 API Key',
        body: 'GitHub 公开版不内置 API Key。请先点右上角小齿轮，在设置页填写自己的 API Key。\n\n比赛演示包会内置一次性默认通道；源码公开版为了安全已经移除。配置完成后，我们再跑通核心流程：分析一篇文章，然后看它归库。',
        target: '#settingsBtn',
        tab: 'analyze',
        primary: '知道了',
      },
      {
        title: '第二步：载入示例文章',
        body: '先用一篇示例文章跑通完整流程。\n\n点下面的按钮，知识图鉴会载入一篇已经准备好的文章。标题出现后，引导会自动进入下一步。',
        target: '#demoArticleBtn',
        tab: 'analyze',
        action: 'loadDemoArticle',
        primary: '载入示例文章',
      },
      {
        title: '第三步：开始分析',
        body: '点“开始分析”，知识图鉴会把这篇作品拆成核心观点、可复用素材、写作指纹和下一篇知乎选题，并写入你的资产库。\n\n这一步完成后，你就能看到一篇旧文章如何继续为下一次创作工作。',
        target: '#analyzeBtn',
        tab: 'analyze',
        requiresTarget: '#analyzeBtn',
        waitMessage: '先载入示例文章',
        action: 'runDemoAnalysis',
        primary: '开始分析',
      },
      {
        title: '第四步：查看分析结果',
        body: '分析结果已经出现。\n\n这里只保留三类真正能继续写的东西：可复用素材与立意、相邻领域与书单、下一篇知乎问题方向。确认看见结果后继续即可。',
        target: '#result',
        tab: 'analyze',
        requiresTarget: '#result',
        waitMessage: '先点开始分析',
        primary: '下一步',
      },
      {
        title: '第五步：这篇文章已经归库',
        body: '看到“已保存到资产库”，就说明第一篇文章已经成功归库。\n\n第一次引导到这里就结束。资产、复盘、地图和“读出的你”这些功能，等你点开对应区域时，再出现对应的小引导块。',
        target: '#savedBanner',
        tab: 'analyze',
        requiresTarget: '#savedBanner',
        waitMessage: '分析完成后会自动继续',
        action: 'articleSaved',
        primary: '完成核心引导',
      },
    ],
  },
  themeRecommendation: {
    label: '关灯体验推荐',
    steps: [
      {
        title: '强烈推荐：关灯感受一次知识宇宙',
        body: '你已经完成最初的教程，第一篇文章也成功归库了。\n\n强烈建议你等下点一下右上角的月亮按钮，切到关灯模式感受知识宇宙。暗色模式下，地图、星球、节点和写作指纹会更像一片真正被点亮的个人知识宇宙。',
        target: '#themeToggleBtn',
        primary: '知道了',
        skipText: '继续亮灯',
        action: 'ackThemeRecommendation',
      },
    ],
  },
  mapLightHint: {
    label: '星球关灯提示',
    steps: [
      {
        title: '这颗星球，关灯会更亮',
        body: '你已经点进知识星球了。\n\n如果现在是蓝白亮灯背景，星球的光会被冲淡。建议点一下右上角的月亮按钮，切到关灯模式再看一次：星球、节点和连线会更像一片真正被点亮的知识宇宙。\n\n这只是观看建议，不影响继续使用。',
        target: '#themeToggleBtn',
        tab: 'map',
        primary: '知道了',
        skipText: '继续亮灯',
        action: 'ackMapLightHint',
      },
    ],
  },
  assets: {
    label: '资产区引导',
    steps: [
      {
        title: '资产：你的文章会被放进这里',
        body: '这一段只讲资产区。\n\n这里不是普通收藏夹。分析过的作品、观点资产、可复用素材和立意都会在这里，之后写下一篇不用再从空白页开始。',
        target: '.tab-btn[data-tab="assets"]',
        tab: 'assets',
        primary: '下一步',
      },
      {
        title: '完整分析报告，在“作品”里找',
        body: '资产页上面有“素材 / 立意 / 作品”三个入口。\n\n每次分析完一篇文章，完整报告都会放进“作品”里；素材和立意，是知识图鉴从作品里拆出来的可复用资产。',
        target: '.asset-mode[data-asset-mode="assets"]',
        tab: 'assets',
        primary: '完成本区引导',
      },
    ],
  },
  review: {
    label: '复盘区引导',
    steps: [
      {
        title: '复盘：看最近的创作走势',
        body: '这一段只讲复盘区。\n\n它会帮你看最近哪些作品正在形成方向，哪些主题反复出现，哪些旧素材还能继续生长，像是把一周的资产摊开看清楚。',
        target: '.tab-btn[data-tab="review"]',
        tab: 'review',
        primary: '下一步',
      },
      {
        title: '创作方向：看你最近在往哪里走',
        body: '“创作方向”会帮你看见：最近点亮了哪些主题，哪些视角已经出现，哪些方向还空着。\n\n它不是催你写更多，而是帮你知道自己已经走到了哪里。',
        target: '#review-direction .review-section-title',
        tab: 'review',
        reviewSection: 'direction',
        primary: '下一步',
      },
      {
        title: '高频节点：哪些东西一直在回来',
        body: '“高频节点”会把反复出现的概念、人物、问题和写法列出来。\n\n如果一个节点经常出现，说明它可能已经是你的长期关注。',
        target: '#review-nodes .review-section-title',
        tab: 'review',
        reviewSection: 'nodes',
        primary: '下一步',
      },
      {
        title: '时间轴和 AI 复盘',
        body: '“时间轴”会把你的文章按时间排成卡片；“AI 复盘”可以结合这一周作品回答下一步该写什么。\n\n以后想回头找某一周的变化，就来这里。',
        target: '#review-timeline .review-section-title',
        tab: 'review',
        reviewSection: 'timeline',
        primary: '完成本区引导',
      },
    ],
  },
  map: {
    label: '地图区引导',
    steps: [
      {
        title: '地图：这里是你的知识宇宙',
        body: '这一段只讲地图区。\n\n它会把你的文章、主题、节点和项目慢慢变成一片知识宇宙。每分析一篇文章，都会在这里点亮一点光。',
        target: '.tab-btn[data-tab="map"]',
        tab: 'map',
        primary: '下一步',
      },
      {
        title: '把插件框往左拉，先看宇宙全貌',
        body: '现在这个窄面板只能露出知识宇宙的一部分。\n\n把鼠标放到插件框左边缘，按住往左拉宽面板。面板拉开以后，星区、星球和连线会完整很多，再点星星会更容易看见知识宇宙的层次和美感。',
        target: '#universeCanvasWrap',
        tab: 'map',
        primary: '下一步',
      },
      {
        title: '点一颗星星，看它背后的内容',
        body: '宇宙画面里的小亮点不是装饰，而是你的知识星球。\n\n鼠标移到星星上会出现名字；点一次锁定视角，再点同一颗进入内部。',
        target: '#universeCanvasWrap',
        tab: 'map',
        primary: '下一步',
      },
      {
        title: '星球会随着积累变完整',
        body: '当一个领域被你持续点亮，它会越来越像一颗真正的知识星球。\n\n文章越多、观点越多、素材越多，星球上的节点和连接就会越密。',
        target: '.universe-tools',
        tab: 'map',
        primary: '完成本区引导',
      },
    ],
  },
  fingerprint: {
    label: '读出的你引导',
    steps: [
      {
        title: '读出的你：每周看一次就够',
        body: '这一段只讲“知识图鉴读出的你”。\n\n它会告诉你本周新增了多少作品资产、哪些主题变亮、哪些素材最值得继续写，以及你的写作指纹正在往哪里长。',
        target: '.tab-btn[data-tab="fingerprint"]',
        tab: 'fingerprint',
        primary: '下一步',
      },
      {
        title: '上面这里可以设定目标',
        body: '看顶部的目标达成。你可以设定每周几篇算达标。\n\n每完成一次分析，就像给自己的知识宇宙添了一点光，不用一次做很多。',
        target: '#weekProgWrap',
        tab: 'fingerprint',
        primary: '完成本区引导',
      },
    ],
  },
  author: {
    label: '作者分身引导',
    steps: [
      {
        title: '问问过去的我',
        body: '这里不是通用聊天，而是向自己的历史作品提问。\n\n它只基于已经入库的旧文、观点卡、素材卡和知识节点回答，适合演示“旧文章继续为下一篇创作工作”。',
        target: '.tab-btn[data-tab="author"]',
        tab: 'author',
        primary: '完成本区引导',
      },
    ],
  },
};

function normalizeOnboardingSection(section) {
  return PANEL_ONBOARDING_SECTIONS[section] ? section : 'analyze';
}

function panelOnboardingSection(section = onboardingState.section) {
  return PANEL_ONBOARDING_SECTIONS[normalizeOnboardingSection(section)];
}

function panelOnboardingSteps(section = onboardingState.section) {
  return panelOnboardingSection(section).steps;
}

function onboardingSectionDoneKey(section) {
  return `onboardingSectionDone_${normalizeOnboardingSection(section)}`;
}

async function isOnboardingSectionDone(section) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
  const key = onboardingSectionDoneKey(section);
  const result = await chrome.storage.local.get(key);
  return !!result[key];
}

async function markOnboardingSectionDone(section) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const normalized = normalizeOnboardingSection(section);
  const payload = {
    [onboardingSectionDoneKey(normalized)]: true,
    [ONBOARDING_HINT_SEEN_KEY]: true,
  };
  if (normalized === 'themeRecommendation') payload[THEME_RECOMMEND_DONE_KEY] = true;
  if (normalized === 'mapLightHint') payload[MAP_LIGHT_HINT_DONE_KEY] = true;
  await chrome.storage.local.set(payload);
}

async function maybeStartPanelOnboardingForSection(section, opts = {}) {
  const normalized = normalizeOnboardingSection(section);
  setupPanelOnboardingEvents();
  if (onboardingState.active && !opts.force) return;
  if (!opts.force && await isOnboardingSectionDone(normalized)) return;
  await dismissOnboardingEntryHint();
  startPanelOnboarding(0, normalized);
}

function legacyPanelOnboardingSteps() {
  return [
    {
      title: '欢迎来到知识图鉴',
      body: '这里是面向知乎创作者的作品资产库、写作指纹系统与个人知识宇宙。\n\n知识图鉴会通过作品，看见创作者自己；也会让旧文章继续为下一篇创作工作。你不用一下子学会所有按钮，我们先跑通第一篇文章。',
      primary: '下一步',
    },
    {
      title: '第一件事：先配置自己的 API Key',
      body: 'GitHub 公开版不内置 API Key。请先点右上角小齿轮，在设置页填写自己的 API Key。\n\n比赛演示包会内置一次性默认通道；源码公开版为了安全已经移除。配置完成后，我们再跑通第一篇文章。',
      target: '#settingsBtn',
      primary: '知道了',
    },
    {
      title: '先载入一篇示例文章',
      body: '先用示例文章跑通第一遍流程。\n\n载入文章后，下面会出现标题，然后继续点开始分析。',
      primary: '下一步',
    },
    {
      title: '点这里，重新读取当前文章',
      body: '如果你已经打开了新的知乎文章，就点“默认项目”旁边这个小图线按钮。\n\n它会重新读取当前页面内容。读到以后，下面会出现文章标题，然后你再点“开始分析”。',
      target: '#recaptureBtn',
      primary: '下一步',
    },
    {
      title: '点开始分析',
      body: '看到“开始分析”以后，点它一下。\n\n知识图鉴会把这篇文章拆成核心观点、可复用素材、写作指纹证据、下一篇知乎选题和创作者优势。分析完成后，这篇文章会进入你的知识资产。',
      target: '#analyzeBtn',
      primary: '下一步',
    },
    {
      title: '这里会显示解析内容',
      body: '分析完成后，页面下方会出现结果。\n\n你会看到：文章到底在说什么、结构为什么能让人读下去、哪里有情绪钩子、哪些素材以后还能再用、哪些写法可以迁移到下一篇。',
      target: '#resultGuideAnchor',
      showResultGuide: true,
      primary: '下一步',
    },
    {
      title: '资产：你的文章会被放进这里',
      body: '点“资产”。\n\n这里不是普通收藏夹。分析过的文章、可复用素材、立意和作品都会在这里。以后想写下一篇，可以先从自己的旧文章资产里继续往前走。',
      target: '.tab-btn[data-tab="assets"]',
      tab: 'assets',
      primary: '打开资产',
    },
    {
      title: '完整分析报告，在“作品”里找',
      body: '资产页上面有“素材 / 立意 / 作品”三个小入口。\n\n每次分析完一篇文章，完整报告都会放进“作品”里；素材和立意，是知识图鉴从报告里帮你拆出来的可复用片段。以后想回看一篇文章的完整解析，就先点“作品”。',
      target: '.asset-mode[data-asset-mode="assets"]',
      tab: 'assets',
      primary: '我知道去作品里找',
    },
    {
      title: '复盘：像有人陪你整理书桌',
      body: '点“复盘”。\n\n这里会帮你看最近分析过哪些文章、哪些主题出现得最多、哪些素材还能继续写、哪些表达方式值得保留。本周阅读和创作的变化，也会慢慢在这里显出来。',
      target: '.tab-btn[data-tab="review"]',
      tab: 'review',
      primary: '打开复盘',
    },
    {
      title: '创作方向：看你最近在往哪里走',
      body: '复盘里的“创作方向”会帮你看见：你最近点亮了哪些主题，哪些视角已经出现，哪些方向还空着。\n\n它不是催你写更多，而是帮你知道自己已经走到了哪里。',
      target: '#review-direction .review-section-title',
      tab: 'review',
      reviewSection: 'direction',
      primary: '看看创作方向',
    },
    {
      title: '高频节点：哪些东西一直在回来',
      body: '“高频节点”会把反复出现的概念、人物、问题和写法列出来。\n\n如果一个节点经常出现，说明它可能已经是你自己的长期关注。以后选题时，可以从这些高频节点里找线索。',
      target: '#review-nodes .review-section-title',
      tab: 'review',
      reviewSection: 'nodes',
      primary: '看看高频节点',
    },
    {
      title: '时间轴：看见你的积累顺序',
      body: '“时间轴”会把你的文章按时间排成卡片。\n\n你可以看到自己先写了什么，后来又转向哪里。它像一条创作小路，帮你回头看清自己是怎么一步一步走过来的。',
      target: '#review-timeline .review-section-title',
      tab: 'review',
      reviewSection: 'timeline',
      primary: '看看时间轴',
    },
    {
      title: '先看一眼时间轴全貌',
      body: '这一屏先不用急着点。背景现在会清楚一点，你只要扫一眼它大概长什么样：上面是时间入口，下面是按日期排列的作品卡片。\n\n以后想回头找“我某一周写了什么”，或者想看创作方向怎么转弯，就来这里。',
      tab: 'review',
      reviewSection: 'timeline',
      peek: true,
      compact: true,
      noTarget: true,
      primary: '我看到了时间轴',
    },
    {
      title: 'AI 复盘：让它陪你问一遍',
      body: '“AI 复盘”不是让你重新写作业，而是帮你把这一周再想一遍。\n\n你可以问：这周哪篇最值得放大？我形成了什么风格？下周该试什么方向？它会结合你的作品来回答。',
      target: '#review-chat .review-section-title',
      tab: 'review',
      reviewSection: 'chat',
      primary: '看看 AI 复盘',
    },
    {
      title: '地图：这里是你的知识宇宙',
      body: '点“地图”。\n\n这一块是知识图鉴最重要的地方之一：它不是列表，也不是普通收藏夹，而是把你的文章、主题、节点和项目慢慢变成一片知识宇宙。\n\n你每分析一篇文章，都会在这里点亮一点光。某个领域写得越多、读得越多，那片星区就会越来越亮。一开始只是一颗小点，后来会变成一片星云。',
      target: '.tab-btn[data-tab="map"]',
      tab: 'map',
      primary: '去看看知识地图',
    },
    {
      title: '把插件框往左拉，先看宇宙全貌',
      body: '现在这个窄面板只能露出知识宇宙的一部分。\n\n把鼠标放到插件框左边缘，按住往左拉宽面板。面板拉开以后，星区、星球和连线会完整很多，再点星星会更容易看见知识宇宙的层次和美感。',
      target: '#universeCanvasWrap',
      tab: 'map',
      primary: '下一步',
    },
    {
      title: '点一颗星星，看它背后的内容',
      body: '现在看向宇宙画面里的小亮点。它们不是装饰，而是你的知识星球。\n\n鼠标移到星星上，会出现它的名字；点一次会锁定视角，再点同一颗才进入内部。不要急着连续点，等镜头停稳以后再操作，会更像一镜到底进入自己的知识宇宙。',
      target: '#universeCanvasWrap',
      tab: 'map',
      primary: '下一步',
    },
    {
      title: '星球会随着积累变完整',
      body: '当一个领域被你持续点亮，它会越来越像一颗真正的知识星球。\n\n文章越多、观点越多、素材越多，星球上的小灯、节点和连接就会越密。这代表你在这个主题上，已经不是零散收藏，而是在形成自己的知识地形。',
      target: '.universe-tools',
      tab: 'map',
      primary: '下一步',
    },
    {
      title: '读出的你：每周看一次就够',
      body: '点“读出的你”。\n\n这里会告诉你本周分析了多少篇文章、哪些主题变亮、哪些素材最值得继续写、哪些领域正在积累，以及知识图鉴从作品里读出了怎样的你。',
      target: '.tab-btn[data-tab="fingerprint"]',
      tab: 'fingerprint',
      primary: '打开读出的你',
    },
    {
      title: '上面这里可以设定目标',
      body: '看顶部的目标达成。你可以设定每周几篇算达标。\n\n每完成一次分析，就像给自己的知识宇宙添了一点光。你不用一下子做很多，一点一点点亮就行。',
      target: '#weekProgWrap',
      primary: '下一步',
    },
    {
      title: '想分析下一篇，就点这个小按钮',
      body: '以后打开新的知乎文章页，再点“默认项目”旁边的小图线按钮，它会重新读取当前页面内容。\n\n你也可以在项目下拉框里新建项目，比如“红楼梦研究”“商业观察”“写作素材”。',
      target: '#recaptureBtn',
      primary: '下一步',
    },
    {
      title: '把插件固定到浏览器右上角',
      body: '如果你还没有固定插件：\n\n1. 找浏览器右上角的拼图图标。\n2. 点开它，找到“知识图鉴”。\n3. 点旁边的小图钉。\n4. 图钉变亮后，它就会一直待在右上角。\n\n以后不用再到插件列表里找它。',
      primary: '我知道了',
    },
    {
      title: '开灯和关灯，换一种使用氛围',
      body: '这个太阳/月亮按钮可以切换开灯和关灯。\n\n开灯模式更清楚，适合白天整理。关灯模式更沉浸，适合晚上复盘、看知识星球。关灯之后，那些被你点亮的星星会更明显。',
      target: '#themeToggleBtn',
      primary: '完成引导',
      action: 'finish',
    },
  ];
}

function setupPanelOnboardingEvents() {
  if (onboardingState.wired) return;
  onboardingState.wired = true;
  document.getElementById('onboardingNextBtn')?.addEventListener('click', nextPanelOnboarding);
  document.getElementById('onboardingBackBtn')?.addEventListener('click', backPanelOnboarding);
  document.getElementById('onboardingSkipBtn')?.addEventListener('click', () => finishPanelOnboarding({ completedNormally: false }));
  document.getElementById('onboardingEntryStartBtn')?.addEventListener('click', async () => {
    await dismissOnboardingEntryHint();
    await replayPanelOnboarding(currentPanelTabName(), { ignoreResume: true });
  });
  document.getElementById('onboardingEntryDismissBtn')?.addEventListener('click', dismissOnboardingEntryHint);
  window.addEventListener('resize', positionOnboardingArrow);
  window.addEventListener('scroll', positionOnboardingArrow, true);
}

async function maybeStartPanelOnboarding() {
  setupPanelOnboardingEvents();
  if (await resumePanelOnboardingIfPending()) return;
  await maybeShowOnboardingEntryHint();
}

async function maybeShowOnboardingEntryHint() {
  const hint = document.getElementById('onboardingEntryHint');
  if (!hint || typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const {
    [ONBOARDING_DONE_KEY]: done,
    [ONBOARDING_HINT_SEEN_KEY]: seen,
  } = await chrome.storage.local.get([ONBOARDING_DONE_KEY, ONBOARDING_HINT_SEEN_KEY]);
  if (!done && !seen) {
    hint.hidden = false;
    hint.classList.add('visible');
  }
}

async function dismissOnboardingEntryHint() {
  const hint = document.getElementById('onboardingEntryHint');
  if (hint) {
    hint.classList.remove('visible');
    hint.hidden = true;
  }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [ONBOARDING_HINT_SEEN_KEY]: true });
  }
}

async function seedDemoDataIfEmpty() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local || !chrome.runtime?.getURL) return false;
  const [{ [DEMO_SEED_KEY]: seeded }, count] = await Promise.all([
    chrome.storage.local.get(DEMO_SEED_KEY),
    dbGetArticleCount().catch(() => 0),
  ]);
  if (seeded || count > 0) return false;

  const resp = await fetch(chrome.runtime.getURL(DEMO_DATA_PATH));
  if (!resp.ok) throw new Error(`演示数据读取失败：${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data?.articles) || !data.articles.length) return false;

  await dbImportAll(data);
  await chrome.storage.local.set({ [DEMO_SEED_KEY]: true });
  return true;
}

async function readPackagedDemoRecord() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
    throw new Error('当前环境无法读取示例文章');
  }
  const resp = await fetch(chrome.runtime.getURL(DEMO_DATA_PATH));
  if (!resp.ok) throw new Error(`示例文章读取失败：${resp.status}`);
  const data = await resp.json();
  const record = Array.isArray(data?.articles) ? data.articles[0] : null;
  if (!record) throw new Error('示例文章不存在');
  return record;
}

function articleFromPackagedDemoRecord(record) {
  const article = record?.article || {};
  const body = String(article.body || '').trim();
  if (!body) throw new Error('示例文章内容为空');
  return {
    title: article.title || '示例文章',
    author: article.author || '',
    body,
    url: article.url || record?.url || '',
    type: article.type || 'answer',
    published_at: article.published_at || (record?.savedAt || '').slice(0, 10),
    source: 'packaged_demo',
  };
}

async function readPackagedDemoArticle() {
  return articleFromPackagedDemoRecord(await readPackagedDemoRecord());
}

function buildGuidedDemoAnalysis(article, sourceAnalysis = null) {
  if (sourceAnalysis && Object.keys(sourceAnalysis).length) return sourceAnalysis;
  const labels = Array.isArray(article.labels) ? article.labels : [];
  const labelText = labels.length ? labels.join(' / ') : '知乎开放故事';
  return {
    domain: '知乎开放内容',
    sub_domain: labelText,
    perspective: '创作者素材复盘',
    core_claim: `《${article.title || '知乎开放故事'}》可以作为创作者练习结构拆解、素材提炼和选题延展的演示文本。`,
    creator_strength: '你可以把一篇知乎内容快速转成可复用资产：先抓主线，再拆素材，再把下一篇选题从文本里长出来。',
    craft_review: {
      praise: '这篇内容适合展示知识图鉴的核心能力：把一次阅读转化为结构复盘、素材库和后续创作线索。',
      praise_quote: article.title || '知乎开放故事',
      summary: '从知乎内容到创作资产的演示链路',
    },
    strengths: [
      { dimension: '结构识别', evidence: '从标题、导语和正文中抽取核心主题，形成可回看的分析报告。' },
      { dimension: '素材沉淀', evidence: '把故事内容转换成素材、立意和知识节点，方便后续复用。' },
    ],
    nodes_hit: [
      { name: '示例素材', type: 'work', role: 'primary', contribution: '作为示例内容进入知识图鉴分析链路。' },
      { name: '创作者资产化', type: 'concept', role: 'primary', contribution: '把阅读内容沉淀为下一次创作的素材与方向。' },
      { name: labelText, type: 'concept', role: 'secondary', contribution: '作为本次演示文本的主题标签。' },
    ],
    reusable_clips: [
      { content: (article.body || '').slice(0, 180), why_reusable: '可作为开篇背景、故事引子或选题素材。' },
      { content: article.title || '知乎开放故事', why_reusable: '标题本身可作为选题复盘和表达训练的入口。' },
    ],
    essence_insights: [
      { viewpoint: '创作者不只需要读内容，还需要把内容变成可检索、可复盘、可继续写的资产。', why_essential: '这是知识图鉴与知乎内容生态结合的主线。' },
    ],
    new_concepts: ['知乎开放内容', '创作者资产化', '素材复盘'],
    connections: ['知乎知识', '故事素材', '选题延展'],
    next_suggestions: [
      { type: '延伸', suggestion: '围绕这篇开放故事继续写一篇结构分析', reason: '从故事主线切入，容易展示观点与素材复用能力', theory_ref: '叙事结构分析' },
      { type: '跨域', suggestion: '把故事主题和当前知乎热点做一次连接', reason: '可以把开放内容转化为更贴近社区讨论的创作方向', theory_ref: '选题迁移' },
    ],
    zhihu_environment_advice: {
      question_contexts: [
        { question_type: '这类故事内容可以如何变成创作者自己的结构分析？', why_fit: '它天然适合展示从阅读内容到作品资产的转换过程。' },
      ],
      community_difference: '这篇示例不只是被摘要，而是被放进创作者自己的素材库、知识节点和下一篇选题里。',
      search_keywords: ['知乎开放内容', '素材复盘', '选题延展', labelText],
      next_zhihu_topics: [
        { title: '为什么好内容不该只被读完一次？', angle: '从内容资产化切入', reason: '能直接说明知识图鉴如何让旧内容继续产生创作价值。' },
      ],
      hotspot_hooks: [
        { theme: '创作者如何使用 AI', hook: '把 AI 从代写工具转成复盘和资产化工具', reason: '贴合知乎创作者对 AI 辅助创作的真实讨论。' },
      ],
    },
    map_position: '知乎开放内容 -> 创作者素材库 -> 下一篇选题',
    insight: '这条演示链路证明：知乎内容可以从一次性阅读变成创作者自己的长期知识资产。',
  };
}

async function readGuidedDemoArticleAndAnalysis() {
  const record = await readPackagedDemoRecord();
  const article = articleFromPackagedDemoRecord(record);
  return {
    article,
    analysis: buildGuidedDemoAnalysis(article, record.analysis || {}),
  };
}

function setDemoAnalyzeButtonReady(ready) {
  packagedDemoArticleLoaded = !!ready;
}

function maybeShowAnalyzeStartOnboardingStep() {
  if (!onboardingState.active || onboardingState.section !== 'analyze') return;
  const steps = panelOnboardingSteps('analyze');
  const demoIndex = steps.findIndex(s => s.target === '#demoArticleBtn');
  const analyzeIndex = steps.findIndex(s => s.target === '#analyzeBtn');
  if (demoIndex < 0 || analyzeIndex < 0) return;
  if (onboardingState.index > demoIndex) return;
  onboardingState.index = analyzeIndex;
  renderPanelOnboarding();
}

function maybeShowAnalyzeResultOnboardingStep() {
  if (!onboardingState.active || onboardingState.section !== 'analyze') return;
  const steps = panelOnboardingSteps('analyze');
  const analyzeIndex = steps.findIndex(s => s.target === '#analyzeBtn');
  const resultIndex = steps.findIndex(s => s.target === '#result');
  if (analyzeIndex < 0 || resultIndex < 0) return;
  if (onboardingState.index > analyzeIndex) return;
  onboardingState.index = resultIndex;
  renderPanelOnboarding();
}

async function loadPackagedDemoArticleForAnalysis() {
  const btn = document.getElementById('demoArticleBtn');
  const originalText = btn?.textContent || '载入示例文章';
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '载入中…';
    }
    const { article, analysis } = await readGuidedDemoArticleAndAnalysis();
    guidedDemoArticle = article;
    guidedDemoAnalysis = analysis;
    await chrome.storage.local.set({ lastArticle: article });
    switchTab('analyze', { skipOnboarding: true });
    loadArticle(article);
    setDemoAnalyzeButtonReady(true);
    maybeShowAnalyzeStartOnboardingStep();
  } catch (e) {
    showError(e.message || '示例文章载入失败');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function runPackagedDemoAnalysis() {
  if (isAnalyzing) return;
  const btn = document.getElementById('analyzeBtn');
  try {
    isAnalyzing = true;
    setLoading(true);
    if (!guidedDemoArticle || !guidedDemoAnalysis) {
      const demo = await readGuidedDemoArticleAndAnalysis();
      guidedDemoArticle = demo.article;
      guidedDemoAnalysis = demo.analysis;
    }
    const article = guidedDemoArticle;
    const analysis = guidedDemoAnalysis || {};
    if (!Object.keys(analysis).length) throw new Error('示例分析结果为空');

    await chrome.storage.local.set({ lastArticle: article });
    switchTab('analyze', { skipOnboarding: true });
    loadArticle(article);
    setDemoAnalyzeButtonReady(true);
    document.getElementById('errorBox').style.display = 'none';
    renderResult(analysis, JSON.stringify(analysis, null, 2), 'result', {
      articleText: article.body,
      articleTitle: article.title || '',
      articleUrl: article.url || '',
    });
    const savedRecord = await saveToLibrary(article.body, analysis, article, { advanceOnboarding: false });
    if (savedRecord) hydrateChatContext('result', { record: savedRecord });
    maybeShowAnalyzeResultOnboardingStep();
  } catch (e) {
    showError(e.message || '示例分析失败');
  } finally {
    isAnalyzing = false;
    setLoading(false);
    showResetBtn();
  }
}

function startPanelOnboarding(index = 0, section = onboardingState.section) {
  const steps = panelOnboardingSteps(section);
  const safeIndex = clampNumber(Number.isInteger(index) ? index : 0, 0, Math.max(steps.length - 1, 0));
  onboardingState.active = true;
  onboardingState.section = normalizeOnboardingSection(section);
  onboardingState.index = safeIndex;
  renderPanelOnboarding();
}

async function resumePanelOnboardingIfPending() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
  const {
    [ONBOARDING_RESUME_INDEX_KEY]: resumeIndex,
    [ONBOARDING_RESUME_SECTION_KEY]: resumeSection,
  } = await chrome.storage.local.get([ONBOARDING_RESUME_INDEX_KEY, ONBOARDING_RESUME_SECTION_KEY]);
  if (!Number.isInteger(resumeIndex)) return false;
  await chrome.storage.local.remove([ONBOARDING_RESUME_INDEX_KEY, ONBOARDING_RESUME_SECTION_KEY]);
  startPanelOnboarding(resumeIndex, resumeSection || 'analyze');
  return true;
}

async function replayPanelOnboarding(section = currentPanelTabName(), opts = {}) {
  setupPanelOnboardingEvents();
  if (!opts.ignoreResume && await resumePanelOnboardingIfPending()) {
    return;
  }
  startPanelOnboarding(0, section);
}

function clearOnboardingHighlight() {
  document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
  const arrow = document.getElementById('onboardingArrow');
  if (arrow) {
    arrow.classList.remove('visible');
    arrow.textContent = '';
  }
}

function currentPanelTabName() {
  return document.body?.dataset.activeTab
    || document.querySelector('.tab-btn.active')?.dataset.tab
    || 'analyze';
}

function navigatePanelOnboardingStep(step) {
  const currentTab = currentPanelTabName();
  const previousReviewSection = activeReviewSection;
  if (step.reviewSection) activeReviewSection = step.reviewSection;
  if (!step.tab) return;

  if (currentTab !== step.tab) {
    switchTab(step.tab, { skipOnboarding: true });
    return;
  }

  if (step.tab === 'review' && step.reviewSection && previousReviewSection !== step.reviewSection) {
    loadReview();
  }
}

function isOnboardingTargetVisible(target) {
  if (!target?.getBoundingClientRect) return true;
  const rect = target.getBoundingClientRect();
  const safeTop = 68;
  const safeBottom = window.innerHeight - 68;
  return rect.top >= safeTop && rect.bottom <= safeBottom;
}

function findPanelOnboardingTarget(step, allowFallback = false) {
  if (step?.noTarget) return null;
  let target = step?.target ? document.querySelector(step.target) : null;
  if (target || !allowFallback) return target;
  if (step.reviewSection) {
    target = document.querySelector(`.review-anchor[data-anchor="${step.reviewSection}"]`)
      || document.querySelector('.tab-btn[data-tab="review"]');
  }
  if (!target && step.tab === 'map') {
    target = document.querySelector('#mapHint')
      || document.querySelector('.universe-tools')
      || document.querySelector('.tab-btn[data-tab="map"]');
  }
  if (!target && step.tab === 'assets') {
    target = document.querySelector('.tab-btn[data-tab="assets"]');
  }
  if (!target && step.tab === 'fingerprint') {
    target = document.querySelector('.tab-btn[data-tab="fingerprint"]');
  }
  if (!target && step.tab === 'author') {
    target = document.querySelector('.tab-btn[data-tab="author"]');
  }
  return target;
}

function highlightPanelOnboardingTarget(step, attempt = 0) {
  clearOnboardingHighlight();
  const allowFallback = attempt >= 10;
  const target = findPanelOnboardingTarget(step, allowFallback);
  if (!target && step?.target && attempt < 10) {
    setTimeout(() => highlightPanelOnboardingTarget(step, attempt + 1), 120);
    return;
  }

  if (target) {
    target.classList.add('onboarding-highlight');
    if (!isOnboardingTargetVisible(target) && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
  }
  setTimeout(positionOnboardingArrow, target ? 180 : 0);
}

function nudgeOnboardingNextButton(message) {
  const btn = document.getElementById('onboardingNextBtn');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = message;
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = original;
  }, 1300);
}

function isOnboardingRequiredTargetReady(selector) {
  const el = selector ? document.querySelector(selector) : null;
  if (!el || el.hidden) return false;
  if ('disabled' in el && el.disabled) return false;
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  return !style || (style.display !== 'none' && style.visibility !== 'hidden');
}

function maybeShowAnalyzeSavedOnboardingStep() {
  if (!onboardingState.active || onboardingState.section !== 'analyze') return;
  const steps = panelOnboardingSteps('analyze');
  const savedIndex = steps.findIndex(s => s.action === 'articleSaved');
  if (savedIndex < 0 || onboardingState.index >= savedIndex) return;
  onboardingState.index = savedIndex;
  renderPanelOnboarding();
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function renderPanelOnboarding() {
  const steps = panelOnboardingSteps();
  const step = steps[onboardingState.index];
  const section = panelOnboardingSection();
  const layer = document.getElementById('onboardingLayer');
  if (!layer || !step) return;

  navigatePanelOnboardingStep(step);
  layer.classList.add('visible');
  layer.classList.toggle('peek', !!step.peek);
  layer.classList.toggle('compact', !!step.compact);
  document.body?.classList.toggle('onboarding-result-guide', !!step.showResultGuide);
  document.getElementById('onboardingMeta').textContent = `${section.label} · 第 ${onboardingState.index + 1} 步 / 共 ${steps.length} 步`;
  const titleEl = document.getElementById('onboardingTitle');
  const bodyEl = document.getElementById('onboardingBody');
  if (step.titleHtml) titleEl.innerHTML = step.titleHtml;
  else titleEl.textContent = step.title;
  if (step.bodyHtml) bodyEl.innerHTML = step.bodyHtml;
  else bodyEl.textContent = step.body;
  document.getElementById('onboardingBackBtn').style.display = onboardingState.index ? '' : 'none';
  const skipBtn = document.getElementById('onboardingSkipBtn');
  if (skipBtn) skipBtn.textContent = step.skipText || '跳过本区引导';
  document.getElementById('onboardingNextBtn').textContent = step.primary || (onboardingState.index === steps.length - 1 ? '完成引导' : '下一步');

  highlightPanelOnboardingTarget(step);
}

function positionOnboardingArrow() {
  if (!onboardingState.active) return;
  const step = panelOnboardingSteps()[onboardingState.index];
  const arrow = document.getElementById('onboardingArrow');
  const card = document.querySelector('#onboardingLayer .onboarding-card');
  const target = findPanelOnboardingTarget(step, true);
  if (!arrow || !card) {
    arrow?.classList.remove('visible');
    return;
  }
  const margin = 14;
  const gap = 36;
  const viewportW = window.innerWidth || document.documentElement.clientWidth || 420;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 620;
  const cardWidth = Math.min(430, viewportW - margin * 2);
  card.style.width = `${cardWidth}px`;

  if (!target?.getBoundingClientRect) {
    const fallbackHeight = card.offsetHeight || 220;
    if (step?.peek) {
      card.style.left = `${clampNumber((viewportW - cardWidth) / 2, margin, viewportW - cardWidth - margin)}px`;
      card.style.top = `${clampNumber(viewportH - fallbackHeight - 22, margin, viewportH - fallbackHeight - margin)}px`;
      arrow.classList.remove('visible');
      return;
    }
    card.style.left = `${clampNumber((viewportW - cardWidth) / 2, margin, viewportW - cardWidth - margin)}px`;
    card.style.top = `${clampNumber(viewportH * 0.22, 76, viewportH - fallbackHeight - margin)}px`;
    arrow.classList.remove('visible');
    return;
  }

  const rect = target.getBoundingClientRect();
  const cardHeight = Math.min(card.offsetHeight || 220, viewportH - margin * 2);
  const targetCenterX = clampNumber(rect.left + rect.width / 2, margin + 18, viewportW - margin - 18);
  const spaceAbove = rect.top - margin;
  const spaceBelow = viewportH - rect.bottom - margin;
  const placeBelow = spaceBelow >= cardHeight + gap || (spaceBelow >= spaceAbove && spaceAbove < cardHeight + gap);
  const rawTop = placeBelow ? rect.bottom + gap : rect.top - cardHeight - gap;
  const top = clampNumber(rawTop, margin, viewportH - cardHeight - margin);
  const left = clampNumber(targetCenterX - cardWidth / 2, margin, viewportW - cardWidth - margin);

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  arrow.textContent = placeBelow ? '↑' : '↓';
  arrow.style.left = `${targetCenterX - 17}px`;
  arrow.style.top = placeBelow
    ? `${clampNumber(top - 34, margin, viewportH - 42)}px`
    : `${clampNumber(top + cardHeight + 4, margin, viewportH - 42)}px`;
  arrow.classList.add('visible');
}

async function nextPanelOnboarding() {
  const steps = panelOnboardingSteps();
  const step = steps[onboardingState.index];
  if (step?.action === 'ackThemeRecommendation') {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [THEME_RECOMMEND_DONE_KEY]: true });
    }
    await finishPanelOnboarding({ suppressThemeRecommendation: true });
    return;
  }
  if (step?.action === 'openOptions') {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        [ONBOARDING_OPTIONS_PENDING_KEY]: true,
        [ONBOARDING_RESUME_SECTION_KEY]: onboardingState.section,
        [ONBOARDING_RESUME_INDEX_KEY]: Math.min(onboardingState.index + 1, steps.length - 1),
      });
    }
    chrome.runtime.openOptionsPage();
    onboardingState.index = Math.min(onboardingState.index + 1, steps.length - 1);
    renderPanelOnboarding();
    return;
  }
  if (step?.action === 'loadDemoArticle') {
    await loadPackagedDemoArticleForAnalysis();
    return;
  }
  if (step?.action === 'runDemoAnalysis') {
    await runPackagedDemoAnalysis();
    return;
  }
  const nextStep = steps[onboardingState.index + 1];
  if (nextStep?.requiresTarget && !isOnboardingRequiredTargetReady(nextStep.requiresTarget)) {
    nudgeOnboardingNextButton(nextStep.waitMessage || '先完成当前步骤');
    return;
  }
  if (step?.action === 'finish' || onboardingState.index >= steps.length - 1) {
    await finishPanelOnboarding();
    return;
  }
  onboardingState.index++;
  renderPanelOnboarding();
}

function backPanelOnboarding() {
  if (!onboardingState.index) return;
  onboardingState.index--;
  renderPanelOnboarding();
}

async function shouldShowThemeRecommendationAfter(section, completedNormally = true) {
  if (!completedNormally || normalizeOnboardingSection(section) !== 'analyze') return false;
  if (document.documentElement.dataset.theme === 'dark') return false;
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
  const doneKey = onboardingSectionDoneKey('themeRecommendation');
  const stored = await chrome.storage.local.get([THEME_RECOMMEND_DONE_KEY, doneKey]);
  return !stored?.[THEME_RECOMMEND_DONE_KEY] && !stored?.[doneKey];
}

async function maybeShowMapLightModeHint() {
  if (document.documentElement.dataset.theme === 'dark') return;
  if (onboardingState.active) return;
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const doneKey = onboardingSectionDoneKey('mapLightHint');
  const stored = await chrome.storage.local.get([MAP_LIGHT_HINT_DONE_KEY, doneKey]);
  if (stored?.[MAP_LIGHT_HINT_DONE_KEY] || stored?.[doneKey]) return;
  startPanelOnboarding(0, 'mapLightHint');
}

async function finishPanelOnboarding(opts = {}) {
  const finishedSection = onboardingState.section;
  const completedNormally = opts.completedNormally !== false;
  onboardingState.active = false;
  const layer = document.getElementById('onboardingLayer');
  layer?.classList.remove('visible');
  layer?.classList.remove('peek');
  layer?.classList.remove('compact');
  document.body?.classList.remove('onboarding-result-guide');
  clearOnboardingHighlight();
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await markOnboardingSectionDone(finishedSection);
    await chrome.storage.local.remove([ONBOARDING_RESUME_INDEX_KEY, ONBOARDING_RESUME_SECTION_KEY]);
  }
  if (!opts.suppressThemeRecommendation && await shouldShowThemeRecommendationAfter(finishedSection, completedNormally)) {
    startPanelOnboarding(0, 'themeRecommendation');
  }
}

// ── API Key 本地存储 ─────────────────────────────────────
async function getStoredApiKeys() {
  const [{ apiKeys: localKeys = {} }, { apiKeys: syncKeys = {} }] = await Promise.all([
    chrome.storage.local.get('apiKeys'),
    chrome.storage.sync.get('apiKeys'),
  ]);
  if (Object.keys(syncKeys).length) {
    const merged = { ...syncKeys, ...localKeys };
    await chrome.storage.local.set({ apiKeys: merged });
    await chrome.storage.sync.remove('apiKeys');
    return merged;
  }
  return localKeys;
}

// ── 初始化 ─────────────────────────────────────────────
async function init() {
  await loadUiTheme();
  document.body.dataset.activeTab = 'analyze';
  debugLog('[知识图鉴 panel] init 启动');
  const { lastArticle } = await chrome.storage.local.get('lastArticle');
  debugLog('[知识图鉴 panel] 当前 storage:', lastArticle ? lastArticle.title : '空');
  if (lastArticle) loadArticle(lastArticle);
  else showLastAnalysisHint();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastArticle?.newValue) {
      loadArticle(changes.lastArticle.newValue);
    }
    if ((area === 'local' && changes.apiKeys) || (area === 'sync' && changes.provider)) {
      document.querySelector('.no-key-banner')?.remove();
      checkApiKey();
    }
    if (area === 'local' && changes.weekGoal) {
      updateTopMetrics().catch(e => debugLog('[知识图鉴 panel] 周目标刷新失败:', e.message));
    }
    if (area === 'local' && changes[UI_THEME_KEY]) {
      applyUiTheme(changes[UI_THEME_KEY].newValue);
    }
  });

  // 跨页面数据变更通知（设置页清空/导入后刷新当前 tab）
  new BroadcastChannel('zhijing_updates').onmessage = e => {
    if (e.data?.type !== 'data_changed') return;
    updateAssetCount();
    const active = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (active === 'assets') loadCurrentAssetMode();
    else if (active === 'review') loadReview();
    else if (active === 'map') loadMap();
    else if (active === 'fingerprint') loadFingerprint();
    else if (active === 'author') loadAuthorAgent();
  };

  // 绑定按钮事件（CSP 不允许 onclick）
  document.getElementById('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('onboardingReplayBtn')?.addEventListener('click', () => {
    dismissOnboardingEntryHint().catch(e => debugLog('[知识图鉴 panel] 关闭新手指引提示失败:', e.message));
    replayPanelOnboarding(currentPanelTabName(), { ignoreResume: true }).catch(e => debugLog('[知识图鉴 panel] 重看新手引导失败:', e.message));
  });
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleUiTheme);
  document.getElementById('recaptureBtn')?.addEventListener('click', recaptureCurrentPage);
  document.getElementById('demoArticleBtn')?.addEventListener('click', loadPackagedDemoArticleForAnalysis);
  document.getElementById('toggleManual').addEventListener('click', switchToManual);
  document.getElementById('manualBtn').addEventListener('click', manualAnalyze);
  document.getElementById('analyzeBtn').addEventListener('click', analyze);
  document.getElementById('quickSaveBtn').addEventListener('click', saveQuickIdea);

  // 结果区按钮用事件委托（renderResult 后动态生成）
  document.getElementById('result').addEventListener('click', (e) => {
    handleResultClick(e);
  });
  document.getElementById('result').addEventListener('keydown', (e) => {
    handleChatKeydown(e);
  });
  // 资产详情区同样需要事件委托（内容动态替换）
  document.getElementById('assetsTab').addEventListener('click', (e) => {
    handleResultClick(e);
  });
  document.getElementById('assetsTab').addEventListener('keydown', (e) => {
    handleChatKeydown(e);
  });
  document.getElementById('authorTab')?.addEventListener('click', (e) => {
    if (!handleAuthorAgentClick(e)) handleResultClick(e);
  });
  document.getElementById('authorTab')?.addEventListener('keydown', (e) => {
    handleChatKeydown(e);
  });

  await dbMigrateFromStorage()
    .catch(e => console.warn('[知识图鉴 panel] storage 迁移失败:', e.message));
  await seedDemoDataIfEmpty()
    .catch(e => console.warn('[知识图鉴 panel] 演示数据导入失败:', e.message));
  await initProjects();
  initTabs();
  updateAssetCount();
  checkApiKey();
  initAssetsToolbar();
  autoGenerateWeeklyReportOnPanelOpen().catch(e =>
    console.warn('[知识图鉴 panel] 自动周复盘生成失败:', e.message)
  );
  maybeStartPanelOnboarding().catch(e => debugLog('[知识图鉴 panel] 新手引导启动失败:', e.message));
}

// ── 项目管理 ─────────────────────────────────────────────
async function initProjects() {
  const { activeProject: saved } = await chrome.storage.local.get('activeProject');
  activeProject = saved || 'default';
  await renderProjectSelect();

  document.getElementById('projectSelect').addEventListener('change', onProjectChange);
  document.getElementById('deleteProjectBtn').addEventListener('click', async () => {
    const projects = await dbGetProjects();
    const proj = projects.find(p => p.id === activeProject);
    if (!proj) return;
    if (!confirm(`确定删除项目「${proj.name}」？\n\n该项目下所有分析记录将被删除，此操作不可撤销。`)) return;
    try {
      await dbDeleteProject(activeProject);
      activeProject = 'default';
      await chrome.storage.local.set({ activeProject: 'default' });
      await renderProjectSelect();
      updateAssetCount();
      const active = document.querySelector('.tab-btn.active')?.dataset.tab;
      if (active === 'assets') loadCurrentAssetMode();
      else if (active === 'review') loadReview();
      else if (active === 'fingerprint') loadFingerprint();
      else if (active === 'map') loadMap();
      else if (active === 'author') loadAuthorAgent();
    } catch (e) {
      alert(e.message);
    }
  });
}

async function renderProjectSelect() {
  const projects = await dbGetProjects();
  const sel = document.getElementById('projectSelect');
  sel.innerHTML =
    projects.map(p =>
      `<option value="${p.id}"${p.id === activeProject ? ' selected' : ''}>${esc(p.name)}</option>`
    ).join('') +
    `<option value="__new__">＋ 新建项目…</option>`;
  document.getElementById('deleteProjectBtn').disabled = (activeProject === 'default');
}

async function onProjectChange(e) {
  const val = e.target.value;
  if (val === '__new__') {
    const name = prompt('新项目名称：');
    if (!name?.trim()) { e.target.value = activeProject; return; }
    const id = Date.now().toString(36);
    await dbSaveProject({ id, name: name.trim(), createdAt: new Date().toISOString() });
    activeProject = id;
  } else {
    activeProject = val;
  }
  await chrome.storage.local.set({ activeProject });
  await renderProjectSelect();
  updateAssetCount();
  const active = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (active === 'assets') loadCurrentAssetMode();
  else if (active === 'review') loadReview();
  else if (active === 'fingerprint') loadFingerprint();
  else if (active === 'map') loadMap();
  else if (active === 'author') loadAuthorAgent();
}

async function checkApiKey() {
  const [settings, apiKeys] = await Promise.all([
    chrome.storage.sync.get(['provider', 'model']),
    getStoredApiKeys(),
  ]);
  const { provider } = resolveProviderModel(settings);
  if (getApiKeyForProvider(provider, apiKeys)) return;
  if (document.querySelector('.no-key-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'no-key-banner';
  banner.innerHTML = `
    <span class="no-key-text">需要填入 API Key 才能开始分析</span>
    <button class="no-key-btn" id="goSettingsBtn">去设置</button>
  `;
  document.getElementById('analyzeTab').prepend(banner);
  document.getElementById('goSettingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function loadArticle(article) {
  const typeLabel = { article: '专栏文章', answer: '问答回答', pin: '想法', zhihu_story: '知乎开放故事' };
  capturedText = article.body || '';
  setDemoAnalyzeButtonReady(article.source === 'packaged_demo');

  // 检测到新文章时清除旧分析结果，避免新旧内容叠显
  document.getElementById('result').style.display = 'none';
  document.getElementById('result').innerHTML = '';
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('resetAnalyzeBtn')?.remove();
  document.querySelector('.last-hint')?.remove();

  document.getElementById('detectedLabel').textContent =
    '已检测到' + (typeLabel[article.type] || '文章');
  document.getElementById('detectedTitle').textContent = article.title || '（无标题）';
  document.getElementById('detectedMeta').textContent =
    [article.author, article.published_at].filter(Boolean).join(' · ') || '';
  document.getElementById('detectedCard').style.display = 'block';
  document.getElementById('toggleManual').style.display = 'block';
  document.getElementById('waitingSection').style.display = 'none';
  document.getElementById('analyzeBtn').style.display = 'block';
}

async function recaptureCurrentPage() {
  const btn = document.getElementById('recaptureBtn');
  if (btn?.disabled) return;
  const oldTitle = btn?.getAttribute('title') || '重新抓取当前知乎页';
  try {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.setAttribute('title', '正在抓取当前页面...');
    }
    switchTab('analyze');
    document.getElementById('errorBox').style.display = 'none';
    const tab = await getCurrentZhihuTabForCapture();
    let directError = '';
    if (tab?.id) {
      try {
        const article = await captureArticleFromTabInPanel(tab.id);
        await chrome.storage.local.set({ lastArticle: article });
        loadArticle(article);
        return;
      } catch (e) {
        directError = e.message || String(e);
        debugLog('[知识图鉴 panel] 直接抓取失败，尝试后台兜底:', directError);
      }
    }
    const resp = await chrome.runtime.sendMessage({
      action: 'capture_current_tab',
      tabId: tab?.id,
      tabUrl: tab?.url,
    });
    if (!resp?.ok) {
      throw new Error(resp?.error || directError || '未找到可抓取的知乎内容页');
    }
    if (resp.article) loadArticle(resp.article);
  } catch (e) {
    showError(e.message || '抓取当前页面失败');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.setAttribute('title', oldTitle);
    }
  }
}

async function captureArticleFromTabInPanel(tabId) {
  const failures = [];

  if (chrome.tabs?.sendMessage) {
    try {
      const article = await chrome.tabs.sendMessage(tabId, { action: 'capture_request' });
      if (isCapturedArticleReady(article)) return normalizeCapturedArticle(article);
      failures.push('页面脚本返回正文为空');
    } catch (e) {
      failures.push(e.message || String(e));
    }
  }

  if (chrome.scripting?.executeScript) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: grabZhihuPageContentForPanel,
      });
      const article = results?.[0]?.result;
      if (isCapturedArticleReady(article)) return normalizeCapturedArticle(article);
      failures.push('直接注入未返回正文');
    } catch (e) {
      failures.push(e.message || String(e));
    }
  }

  throw new Error('当前知乎页没有抓到足够长的正文，请确认页面已加载完整后再点一次' +
    (failures.length ? `（${failures.filter(Boolean).join('；')}）` : ''));
}

function isCapturedArticleReady(article) {
  return !!(article && typeof article.body === 'string' && article.body.trim().length > 30);
}

function normalizeCapturedArticle(article) {
  return {
    type: article.type || 'article',
    title: article.title || '（无标题）',
    body: article.body.trim(),
    author: article.author || '',
    url: article.url || '',
    source_id: article.source_id || '',
    published_at: article.published_at || '',
  };
}

function grabZhihuPageContentForPanel() {
  const url = location.href;

  function cleanTitle(text) {
    return (text || '').replace(/ - 知乎$/, '').trim();
  }

  function pickReadableElement(selectors, root = document) {
    let best = null;
    let bestLen = 0;
    for (const sel of selectors) {
      for (const el of root.querySelectorAll(sel)) {
        const text = el.innerText?.trim() || '';
        const len = text.length;
        if (len > bestLen) {
          best = el;
          bestLen = len;
        }
      }
    }
    return best;
  }

  function pageTitle(root = document) {
    return root.querySelector('h1.Post-Title, .Post-Title, h1.QuestionHeader-title, .QuestionHeader-title, h1')?.innerText?.trim()
      || cleanTitle(document.querySelector('meta[property="og:title"]')?.content)
      || cleanTitle(document.title);
  }

  if (/\/p\/\d+/.test(url)) {
    const bodyEl = pickReadableElement([
      '.Post-RichText',
      '.Post-RichText .RichText',
      'article .RichText',
      '.RichText',
      '.RichContent-inner',
      'article',
      'main',
    ]);
    const body = bodyEl?.innerText?.trim() || '';
    if (body.length > 30) {
      return {
        type: 'article',
        title: pageTitle(),
        body,
        author: document.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name a')?.innerText?.trim() || '',
        url,
        source_id: '',
        published_at: document.querySelector('.ContentItem-time time, time')?.getAttribute('datetime') || '',
      };
    }
  }

  if (/\/question\/\d+\/answer\/\d+/.test(url)) {
    const answerId = url.match(/\/answer\/(\d+)/)?.[1];
    let answerEl = answerId ? document.querySelector(`[data-zop*='"answerId":${answerId}']`) : null;
    if (!answerEl) answerEl = document.querySelector('.AnswerItem, .List-item, .ContentItem') || document;
    const bodyEl = pickReadableElement([
      '.RichContent-inner',
      '.RichContent-inner .RichText',
      '.RichText',
      'article',
      'main',
    ], answerEl);
    const body = bodyEl?.innerText?.trim() || '';
    if (body.length > 30) {
      return {
        type: 'answer',
        title: pageTitle(),
        body,
        author: answerEl.querySelector?.('.AuthorInfo-name .UserLink-link, .AuthorInfo-name a')?.innerText?.trim() || '',
        url,
        source_id: '',
        published_at: answerEl.querySelector?.('.ContentItem-time time, time')?.getAttribute('datetime') || '',
      };
    }
  }

  if (/\/pin\/\d+/.test(url)) {
    const bodyEl = pickReadableElement([
      '.PinItem-content .RichText',
      '.PinItem .RichText',
      '.RichText',
      'article',
      'main',
    ]);
    const body = bodyEl?.innerText?.trim() || '';
    if (body.length > 10) {
      return {
        type: 'pin',
        title: body.slice(0, 30) + (body.length > 30 ? '…' : ''),
        body,
        author: document.querySelector('.AuthorInfo-name a')?.innerText?.trim() || '',
        url,
        source_id: '',
        published_at: document.querySelector('time')?.getAttribute('datetime') || '',
      };
    }
  }

  const blocks = [
    ...document.querySelectorAll('.AnswerItem'),
    ...document.querySelectorAll('.ArticleItem'),
    ...document.querySelectorAll('.PinItem'),
    ...document.querySelectorAll('.List-item'),
    ...document.querySelectorAll('.ContentItem'),
  ].filter(el => (el.innerText?.trim().length || 0) > 80);

  let best = null;
  let bestScore = -Infinity;
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    const score = visible + Math.min(el.innerText?.trim().length || 0, 1500) / 100;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (!best) best = pickReadableElement(['article', 'main', '.RichText', '.RichContent-inner', '#root', 'body']);
  const body = best?.innerText?.trim() || '';
  if (body.length <= 30) return null;

  let type = 'answer';
  const cls = best.className || '';
  if (cls.includes('PinItem')) type = 'pin';
  else if (cls.includes('ArticleItem')) type = 'article';

  const title = type === 'pin'
    ? body.slice(0, 30) + (body.length > 30 ? '…' : '')
    : best.querySelector?.('.ContentItem-title a, .QuestionItem-title a, h2 a, .ContentItem-title')?.innerText?.trim()
      || pageTitle();
  const link = best.querySelector?.('a[href*="/answer/"], a[href*="/p/"], a[href*="/pin/"], .ContentItem-title a, h2 a');

  return {
    type,
    title,
    body,
    author: best.querySelector?.('.AuthorInfo-name a, .AuthorInfo-name .UserLink-link')?.innerText?.trim() || '',
    url: link?.href || url,
    source_id: '',
    published_at: best.querySelector?.('.ContentItem-time time, time')?.getAttribute('datetime') || '',
  };
}

async function getCurrentZhihuTabForCapture() {
  if (!chrome.tabs?.query) return null;
  for (const query of [{ active: true, currentWindow: true }, { active: true, lastFocusedWindow: true }]) {
    try {
      const [tab] = await chrome.tabs.query(query);
      if (tab?.id && isZhihuCaptureUrl(tab.url)) return tab;
    } catch (e) {
      debugLog('[知识图鉴 panel] 查询当前知乎标签失败:', e.message);
    }
  }
  try {
    const tabs = await chrome.tabs.query({ url: ['https://www.zhihu.com/*', 'https://zhuanlan.zhihu.com/*'] });
    return pickBestZhihuCaptureTab(tabs);
  } catch (e) {
    debugLog('[知识图鉴 panel] 查询全部知乎标签失败:', e.message);
  }
  return null;
}

function isZhihuCaptureUrl(url) {
  return typeof url === 'string' && /^https:\/\/([^/]+\.)?zhihu\.com(\/|$)/.test(url);
}

function pickBestZhihuCaptureTab(tabs = []) {
  return tabs
    .filter(tab => tab?.id && isZhihuCaptureUrl(tab.url))
    .sort((a, b) => {
      if (!!b.active !== !!a.active) return Number(b.active) - Number(a.active);
      if (!!b.highlighted !== !!a.highlighted) return Number(b.highlighted) - Number(a.highlighted);
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    })[0] || null;
}

function extractZhihuEnvironmentQuery(articleSnapshot = {}, text = '') {
  const title = String(articleSnapshot?.title || '').replace(/[-_]?知乎.*$/i, '').trim();
  if (title && title.length >= 4) return title.slice(0, 60);
  const firstLine = String(text || '').split(/\n+/).map(line => line.trim()).find(line => line.length >= 8) || '';
  return firstLine.slice(0, 40);
}

async function buildZhihuEnvironmentApiContext(articleSnapshot, text) {
  if (typeof zhihuContentApiReady !== 'function' || typeof zhihuSearchContent !== 'function') return null;
  if (!await zhihuContentApiReady()) return null;
  const query = extractZhihuEnvironmentQuery(articleSnapshot, text);
  if (!query) return null;
  try {
    const data = await zhihuSearchContent(query, { limit: 5 });
    if (!data?.results?.length) return { source: 'zhihu_search', query, results: [] };
    return {
      source: 'zhihu_search',
      query,
      results: data.results,
    };
  } catch (e) {
    debugLog('[知识图鉴 panel] 知乎环境参考获取失败:', e.message);
    return null;
  }
}

function switchToManual() {
  capturedText = '';
  setDemoAnalyzeButtonReady(false);
  document.getElementById('detectedCard').style.display = 'none';
  document.getElementById('toggleManual').style.display = 'none';
  document.getElementById('waitingSection').style.display = 'block';
  document.getElementById('analyzeBtn').style.display = 'block';
}

function manualAnalyze() {
  const text = document.getElementById('articleInput').value.trim();
  if (!text || text.length < 30) { showError('请先粘贴内容'); return; }
  capturedText = text;
  document.getElementById('waitingSection').style.display = 'none';
  document.getElementById('analyzeBtn').style.display = 'block';
  analyze();
}

// callLLM / buildToken / SYSTEM / makeUserPrompt / parseAndValidate 均由 analyzer.js 提供

// ── 主流程 ───────────────────────────────────────────────
async function analyze() {
  if (isAnalyzing) return;
  const text = capturedText || document.getElementById('articleInput').value.trim();
  if (!text || text.length < 50) { showError('请先粘贴文章内容，或在知乎文章页打开侧边栏'); return; }
  if (packagedDemoArticleLoaded) {
    await runPackagedDemoAnalysis();
    return;
  }
  isAnalyzing = true;

  const [settings, apiKeys] = await Promise.all([
    chrome.storage.sync.get(['provider', 'model']),
    getStoredApiKeys(),
  ]);
  const { provider, model } = resolveProviderModel(settings);
  const apiKey = getApiKeyForProvider(provider, apiKeys);
  if (!apiKey) {
    showError('请先在扩展设置中填入 API Key（右键扩展图标 → 选项）');
    isAnalyzing = false;
    return;
  }

  // AI 请求前先快照当前文章元数据，避免请求期间用户跳页导致 lastArticle 被覆盖
  const isAutoCapture = document.getElementById('detectedCard').style.display !== 'none';
  let articleSnapshot = null;
  if (isAutoCapture) {
    const { lastArticle } = await chrome.storage.local.get('lastArticle');
    articleSnapshot = lastArticle || null;
  }

  setLoading(true);
  document.getElementById('result').style.display = 'none';
  document.getElementById('errorBox').style.display = 'none';

  try {
    const zhihuEnvironmentContext = await buildZhihuEnvironmentApiContext(articleSnapshot, text);
    const messages = [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: makeUserPrompt(text, zhihuEnvironmentContext) }
    ];
    const raw = await callLLM(apiKey, provider, model, messages, 3500);
    const { result, jsonStr } = parseAndValidate(raw);
    renderResult(result, jsonStr, 'result', {
      articleText: text,
      articleTitle: articleSnapshot?.title || '',
      articleUrl: articleSnapshot?.url || '',
    });
    const savedRecord = await saveToLibrary(text, result, articleSnapshot);
    hydrateChatContext('result', { record: savedRecord });

  } catch (e) {
    showError(e.message);
  } finally {
    isAnalyzing = false;
    setLoading(false);
    showResetBtn();
  }
}

// ── 入库 ─────────────────────────────────────────────────
async function saveToLibrary(articleText, analysis, articleSnapshot, opts = {}) {
  try {
    const record = {
      id:         Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt:    new Date().toISOString(),
      url:        '',
      project_id: activeProject,
      article:    { title: '', author: '', body: articleText, url: '', type: 'manual' },
      analysis,
    };

    if (articleSnapshot) {
      record.article.title  = articleSnapshot.title  || '';
      record.article.author = articleSnapshot.author || '';
      record.article.url    = articleSnapshot.url    || '';
      record.article.type   = articleSnapshot.type   || 'unknown';
      record.url            = articleSnapshot.url    || '';
    }
    if (!record.article.title) {
      record.article.title = articleText.slice(0, 30) + (articleText.length > 30 ? '…' : '');
    }

    await dbSaveArticle(record);
    await dbReplaceArticleNodes(analysis.nodes_hit || [], record.id);
    await saveAnalysisClips(record);
    writeArticleToLocalFolder(record); // 不 await，失败不影响主流程
    updateAssetCount();
    showSavedBanner();
    if (opts.advanceOnboarding !== false) maybeShowAnalyzeSavedOnboardingStep();
    return record;
  } catch (e) {
    console.warn('[知识图鉴] 入库失败:', e.message);
    return null;
  }
}

function makeClipId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function clipsFromAnalysis(record) {
  const analysis = record.analysis || {};
  const base = {
    source_article_id: record.id,
    source_article_title: record.article?.title || '（无标题）',
    project_id: record.project_id || 'default',
  };
  const materialClips = (analysis.reusable_clips || [])
    .filter(c => String(c?.content || '').trim())
    .map(c => ({
      ...base,
      id: makeClipId('c'),
      type: '素材',
      content: c.content,
      why_reusable: c.why_reusable || '',
      savedAt: new Date().toISOString(),
    }));
  const insightClips = (analysis.essence_insights || [])
    .filter(i => String(i?.viewpoint || '').trim())
    .map(i => ({
      ...base,
      id: makeClipId('i'),
      type: '立意',
      content: i.viewpoint,
      why_reusable: i.why_essential || '',
      savedAt: new Date().toISOString(),
    }));
  return [...materialClips, ...insightClips];
}

async function saveAnalysisClips(record) {
  const clips = clipsFromAnalysis(record);
  await dbReplaceClipsBySource(record.id, clips);
}

async function saveQuickIdea() {
  const titleEl  = document.getElementById('quickTitleInput');
  const bodyEl   = document.getElementById('quickBodyInput');
  const statusEl = document.getElementById('quickStatus');
  const btn      = document.getElementById('quickSaveBtn');
  const body     = bodyEl.value.trim();
  const title    = titleEl.value.trim() || body.slice(0, 24) + (body.length > 24 ? '…' : '');

  if (!body) {
    statusEl.textContent = '先写一点内容';
    statusEl.style.color = '#bb5555';
    statusEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    const record = {
      id:         Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt:    new Date().toISOString(),
      url:        '',
      project_id: activeProject,
      article:    { title, author: '', body, url: '', type: 'idea' },
      analysis:   {},
    };
    await dbSaveArticle(record);
    writeArticleToLocalFolder(record); // 不 await，未绑定文件夹时自动跳过
    titleEl.value = '';
    bodyEl.value = '';
    statusEl.textContent = '已保存到资产库';
    statusEl.style.color = '#40c080';
    statusEl.style.display = 'block';
    updateAssetCount();
    const active = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (active === 'assets') loadCurrentAssetMode();
  } catch (e) {
    statusEl.textContent = `保存失败：${e.message}`;
    statusEl.style.color = '#bb5555';
    statusEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '保存速记';
  }
}

function showSavedBanner() {
  if (document.getElementById('savedBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'savedBanner';
  banner.className = 'saved-banner';
  banner.innerHTML = `<span>✓ 已保存到资产库</span>
    <button class="saved-banner-btn" id="goAssetsBtn">在资产库查看 →</button>`;
  const resultEl = document.getElementById('result');
  resultEl.insertBefore(banner, resultEl.firstChild);
  document.getElementById('goAssetsBtn').addEventListener('click', () => switchTab('assets'));
}

async function showLastAnalysisHint() {
  try {
    const articles = await dbGetAllArticles();
    if (!articles.length) return;
    const last  = articles[0];
    const title = last.article?.title || '最近分析的文章';
    const hint  = document.createElement('div');
    hint.className = 'last-hint';
    hint.innerHTML = `<span>上次分析</span>
      <span class="last-hint-title">${esc(title.slice(0, 28))}${title.length > 28 ? '…' : ''}</span>
      <button class="last-hint-btn" id="lastHintBtn">在资产库查看 →</button>`;
    document.getElementById('waitingSection').appendChild(hint);
    document.getElementById('lastHintBtn').addEventListener('click', () => switchTab('assets'));
  } catch {}
}

// ── 渲染卡片（各返回 HTML 字符串）──────────────────────────
const ROLE_MAP  = { primary: '主节点', secondary: '次节点', background: '背景节点', linked: '链接' };
const TYPE_META = {
  person:  { label: '人物', color: '#5858c0' },
  concept: { label: '概念', color: '#28a060' },
  theory:  { label: '理论', color: '#8848b0' },
  event:   { label: '事件', color: '#b07828' },
};
const tags = arr => (arr || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
const ASSET_CARD_TYPE_LABELS = {
  core_viewpoint: '核心观点',
  core_claim: '核心观点',
  viewpoint: '核心观点',
  opinion: '核心观点',
  knowledge_node: '知识节点',
  node: '知识节点',
  reusable_material: '可复用素材',
  material: '可复用素材',
  extension_direction: '延展方向',
  direction: '延展方向',
  writing_fingerprint: '写作指纹证据',
  fingerprint: '写作指纹证据',
  creator_strength: '创作者优势判断',
  strength: '创作者优势判断',
};
const HIDDEN_RESULT_ASSET_CARD_TYPES = new Set(['知识节点', '可复用素材', '延展方向', '写作指纹证据', '创作者优势判断']);

function compactTextList(list = []) {
  return list.map(value => String(value || '').trim()).filter(Boolean);
}

function shortText(text, limit = 80) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > limit ? value.slice(0, Math.max(0, limit - 1)) + '…' : value;
}

function normalizeReuseScore(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 4;
}

function reuseStars(value) {
  const score = normalizeReuseScore(value);
  return '★★★★★'.slice(0, score) + '☆☆☆☆☆'.slice(0, 5 - score);
}

function assetCardPayload(card) {
  return {
    type: card.type || '作品资产',
    title: card.title || '',
    summary: card.summary || '',
    source: card.source || '',
    keywords: card.keywords || [],
    whyReusable: card.whyReusable || '',
    reuseScore: normalizeReuseScore(card.reuseScore),
  };
}

function assetCardPayloadAttr(card) {
  return esc(JSON.stringify(assetCardPayload(card)));
}

function shouldShowResultAssetCard(card) {
  return !HIDDEN_RESULT_ASSET_CARD_TYPES.has(String(card?.type || '').trim());
}

function assetCardTypeLabel(card) {
  const raw = String(card?.asset_type || card?.type || '').trim();
  return ASSET_CARD_TYPE_LABELS[raw] || raw || '作品资产';
}

function assetCardKeywords(card, fallback = []) {
  const fromCard = Array.isArray(card?.keywords) ? card.keywords : String(card?.keywords || '').split(/[、,，\s]+/);
  return compactTextList([...fromCard, ...fallback]).slice(0, 5);
}

function fallbackAssetCards(r = {}, sourceTitle = '当前作品', tagsHint = []) {
  const primaryNode = (r.nodes_hit || []).find(n => n.role === 'primary') || (r.nodes_hit || [])[0] || {};
  const firstClip = (r.reusable_clips || []).find(c => String(c?.content || '').trim()) || {};
  const firstInsight = (r.essence_insights || []).find(i => String(i?.viewpoint || '').trim()) || {};
  const firstSuggestion = (r.next_suggestions || [])[0] || {};
  const strengths = (r.strengths || []).map(s => s.dimension).filter(Boolean);
  const nodeNames = (r.nodes_hit || []).map(n => n.name).filter(Boolean);

  return [
    {
      type: '核心观点',
      title: r.core_claim || '这篇作品的核心判断',
      summary: [r.domain, r.sub_domain, r.perspective].filter(Boolean).join(' · ') || '从作品中提炼出的主要判断。',
      source: sourceTitle,
      keywords: tagsHint,
      whyReusable: '可以作为下一篇文章的主判断或开头立论继续展开。',
      reuseScore: 5,
    },
    {
      type: '知识节点',
      title: primaryNode.name || nodeNames.join(' / ') || '本篇命中的知识节点',
      summary: primaryNode.contribution || r.map_position || '这篇作品已经进入你的知识宇宙节点。',
      source: sourceTitle,
      keywords: nodeNames,
      whyReusable: '节点会把相近旧文连起来，方便后续围绕同一主题继续深挖。',
      reuseScore: 4,
    },
    {
      type: '可复用素材',
      title: firstClip.content || '本篇可迁移素材',
      summary: firstClip.why_reusable || '可以迁移到相邻话题、开篇例子或论证段落中。',
      source: sourceTitle,
      keywords: compactTextList([firstClip.type, ...tagsHint]),
      whyReusable: firstClip.why_reusable || '素材脱离原文后仍能支撑相近观点。',
      reuseScore: 4,
    },
    {
      type: '延展方向',
      title: firstSuggestion.suggestion || '下一篇可以继续写的方向',
      summary: firstSuggestion.reason || '这篇作品已经留下了可以继续放大的问题。',
      source: sourceTitle,
      keywords: compactTextList([firstSuggestion.type, firstSuggestion.theory_ref, ...tagsHint]),
      whyReusable: '它把旧文章变成下一篇选题的入口。',
      reuseScore: 5,
    },
    {
      type: '写作指纹证据',
      title: firstInsight.viewpoint || r.insight || '作品识别到的思考习惯',
      summary: firstInsight.why_essential || r.insight || '这条线索能帮助创作者看见自己反复在意的问题。',
      source: sourceTitle,
      keywords: compactTextList([...strengths, ...tagsHint]),
      whyReusable: '它会进入长期写作指纹，用来识别创作者真正擅长的方向。',
      reuseScore: 4,
    },
    {
      type: '创作者优势判断',
      title: '这篇作品显示出的优势',
      summary: r.creator_strength || '继续分析更多作品后，知识图鉴会更准确地判断你的稳定优势。',
      source: sourceTitle,
      keywords: compactTextList([...strengths, r.perspective]),
      whyReusable: '优势判断可以帮助创作者选择更适合继续深耕的表达路线。',
      reuseScore: 4,
    },
  ].filter(card => String(card.title || card.summary || '').trim());
}

function normalizeAssetCards(r = {}, context = {}) {
  const sourceTitle = context.articleTitle || context.record?.article?.title || r.source_title || '当前作品';
  const tagsHint = compactTextList([...(r.tags || []), r.domain, r.sub_domain, r.perspective]);
  const fallbackCards = fallbackAssetCards(r, sourceTitle, tagsHint);

  if (!Array.isArray(r.asset_cards) || !r.asset_cards.length) return fallbackCards;

  const explicitCards = r.asset_cards
    .filter(card => String(card?.title || card?.content || card?.summary || '').trim())
    .map(card => ({
      type: assetCardTypeLabel(card),
      title: String(card.title || card.content || card.summary || '').trim(),
      summary: String(card.summary || card.explanation || card.content || '').trim(),
      source: String(card.source_article || card.source_title || sourceTitle).trim(),
      keywords: assetCardKeywords(card, tagsHint),
      whyReusable: String(card.why_reusable || card.reuse_reason || card.value || '').trim(),
      reuseScore: normalizeReuseScore(card.reuseScore || card.reuse_score || card.score),
    }));
  const used = new Set(explicitCards.map(card => card.type));
  const completed = fallbackCards.filter(card => !used.has(card.type));
  return [...explicitCards, ...completed].slice(0, 6);
}

function cardAssetCards(r, context = {}) {
  const items = normalizeAssetCards(r, context).filter(shouldShowResultAssetCard).slice(0, 4).map(card => `
    <div class="card">
      <div class="card-label">${esc(card.type)}</div>
      <div class="core-claim">${esc(card.title)}</div>
      ${card.summary ? `<div class="field"><div class="field-label">一句话解释</div><div class="field-value">${esc(card.summary)}</div></div>` : ''}
      <button class="chat-template-btn" type="button" data-asset-remix="${assetCardPayloadAttr(card)}">用于新文章</button>
    </div>`).join('');
  return items || cardPosition(r);
}

function cardPosition(r) {
  return `<div class="card">
    <div class="card-label">核心观点资产</div>
    <div class="field">
      <div class="field-label">主领域 / 分支</div>
      <div class="field-value">${esc(r.domain)}${r.sub_domain ? ' · ' + esc(r.sub_domain) : ''}</div>
    </div>
    <div class="field">
      <div class="field-label">分析视角</div>
      <div class="field-value">${esc(r.perspective)}</div>
    </div>
    <div class="core-claim">${esc(r.core_claim)}</div>
  </div>`;
}

function cardStrengths(r) {
  const items = (r.strengths || []).map(s => `
    <div class="strength-item">
      <div class="strength-dim">${esc(s.dimension)}</div>
      <div class="strength-evidence">${esc(s.evidence)}</div>
    </div>`).join('');
  return items ? `<div class="card"><div class="card-label">文章优势（可验证）</div>${items}</div>` : '';
}

function cardCreatorStrength(r) {
  const text = String(r.creator_strength || '').trim();
  return text
    ? `<div class="card"><div class="card-label">写作指纹证据</div><div class="insight">${esc(shortText(text, 90))}</div></div>`
    : '';
}

function cardCraftReview(r) {
  const review = r.craft_review || {};
  const legacyPraise = [
    review.structure,
    review.diction,
    review.rhythm,
    review.elegance,
  ].filter(value => String(value || '').trim()).join(' ');
  const praise = String(review.praise || legacyPraise || '').trim();
  const quote = String(review.praise_quote || '').trim();
  const summary = String(review.summary || '').trim();

  if (!praise && !quote && !summary) return '';
  return `<div class="card craft-review-card"><div class="card-label">写作技法</div>
    ${praise ? `<div class="teacher-praise"><div class="craft-subtitle">知识图鉴夸你</div>${esc(praise)}</div>` : ''}
    ${quote ? `<div class="teacher-quote">${esc(quote)}</div>` : ''}
    ${summary ? `<div class="craft-summary"><span>整体气质</span>${esc(summary)}</div>` : ''}
  </div>`;
}

function cardNodes(r) {
  const items = (r.nodes_hit || []).map(n => `
    <div class="node-item is-clickable" data-role="${esc(n.role)}" data-node-name="${esc(n.name)}" title="查看反链">
      <div class="node-header">
        <span class="node-name">${esc(n.name)}</span>
        <span class="badge badge-type">${TYPE_META[n.type]?.label || esc(n.type)}</span>
        <span class="badge badge-${esc(n.role)}">${ROLE_MAP[n.role] || esc(n.role)}</span>
      </div>
      <div class="node-contribution">${esc(n.contribution)}</div>
    </div>`).join('');
  return `<div class="card"><div class="card-label">知识节点资产 · ${(r.nodes_hit||[]).length} 个</div>${items}</div>`;
}

function cardConcepts(r) {
  return (r.new_concepts||[]).length
    ? `<div class="card"><div class="card-label">新引入概念</div><div class="tag-row">${tags(r.new_concepts)}</div></div>`
    : '';
}

function cardMapPosition(r) {
  return `<div class="card"><div class="card-label">进入知识宇宙的位置</div>
    <div style="font-size:12px;line-height:1.7;color:#909090">${esc(r.map_position)}</div></div>`;
}

function cardSuggestions(r) {
  const items = collectZhihuQuestionTopics(r).map(s => `
    <div class="sug-item">
      <div class="sug-header">
        <span class="sug-badge sug-延伸">问题</span>
        <span class="sug-title">${esc(s.title)}</span>
      </div>
      ${s.body ? `<div class="sug-reason">切入角度：${esc(shortText(s.body, 64))}</div>` : ''}
    </div>`).join('');
  return items ? `<div class="card"><div class="card-label">下一篇知乎选题</div>${items}</div>` : '';
}

function normalizeZhihuAdviceList(list = [], titleKeys = [], bodyKeys = [], limit = 5) {
  return (Array.isArray(list) ? list : [])
    .map(item => {
      if (typeof item === 'string') return { title: item, body: '' };
      const title = titleKeys.map(key => item?.[key]).find(value => String(value || '').trim()) || '';
      const body = bodyKeys.map(key => item?.[key]).find(value => String(value || '').trim()) || '';
      return { title: String(title || '').trim(), body: String(body || '').trim() };
    })
    .filter(item => item.title || item.body)
    .slice(0, limit);
}

function isQuestionLike(text) {
  return /[？?]\s*$/.test(String(text || '').trim()) || /(为什么|为何|如何|怎样|怎么|是否|能否|能不能|该不该|有没有|什么|哪|谁|如果|当)/.test(String(text || '').trim());
}

function ensureZhihuQuestionTitle(text) {
  const raw = String(text || '').replace(/[。.!！]+$/g, '').trim();
  if (!raw) return '';
  if (isQuestionLike(raw)) return /[？?]\s*$/.test(raw) ? raw.replace(/\?$/, '？') : `${raw}？`;
  if (raw.includes('是') || raw.includes('成为') || raw.includes('衰败') || raw.includes('必然')) {
    return `为什么说${raw}？`;
  }
  return `如何从「${raw}」继续写出一篇知乎回答？`;
}

function collectZhihuQuestionTopics(r = {}) {
  const raw = r.zhihu_environment_advice || r.zhihu_context_advice || {};
  const subject = shortText(r.core_claim || r.perspective || r.sub_domain || r.domain || '这个问题', 28);
  const items = [
    ...normalizeZhihuAdviceList(raw.next_zhihu_topics, ['title', 'topic', 'suggestion'], ['angle', 'reason', 'body'], 8),
    ...normalizeZhihuAdviceList(raw.question_contexts, ['question_type', 'question', 'title'], ['why_fit', 'reason', 'body'], 6),
    ...(Array.isArray(r.next_suggestions) ? r.next_suggestions.map(s => ({
      title: s?.suggestion || '',
      body: s?.reason || s?.theory_ref || '',
    })) : []),
    { title: `为什么说${subject}不是单一现象，而是结构性结果？`, body: '可以从结构性原因分析。' },
    { title: `普通人如何理解${subject}背后的机制？`, body: '适合把原文判断转成解释型回答。' },
    { title: `如果把${subject}放到现实生活中，会出现哪些相似处境？`, body: '适合做现实迁移。' },
    { title: `讨论${subject}时，最容易被忽略的前提是什么？`, body: '适合补充边界条件。' },
    { title: `从${subject}继续写，下一篇应该补上哪个反例或边界？`, body: '适合避免重复旧观点。' },
  ];
  const seen = new Set();
  return items
    .map(item => ({
      title: ensureZhihuQuestionTitle(item.title),
      body: String(item.body || '').trim(),
    }))
    .filter(item => item.title)
    .filter(item => {
      const key = item.title.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function normalizeZhihuEnvironmentAdvice(r = {}) {
  const raw = r.zhihu_environment_advice || r.zhihu_context_advice || {};
  const nodeKeywords = compactTextList((r.nodes_hit || []).map(n => n.name));
  const assetKeywords = compactTextList((r.asset_cards || []).flatMap(card => card.keywords || []));
  const fallbackKeywords = compactTextList([...(r.tags || []), r.domain, r.sub_domain, r.perspective, ...nodeKeywords, ...assetKeywords]).slice(0, 6);
  const questionContexts = normalizeZhihuAdviceList(
    raw.question_contexts,
    ['question_type', 'question', 'title'],
    ['why_fit', 'reason', 'body'],
    5
  );
  const nextTopics = normalizeZhihuAdviceList(
    raw.next_zhihu_topics,
    ['title', 'topic', 'suggestion'],
    ['angle', 'reason', 'body'],
    5
  );
  const hotspotHooks = normalizeZhihuAdviceList(
    raw.hotspot_hooks,
    ['theme', 'title', 'topic'],
    ['hook', 'reason', 'body'],
    3
  );
  const keywords = compactTextList([
    ...(Array.isArray(raw.search_keywords) ? raw.search_keywords : []),
    ...fallbackKeywords,
  ]).slice(0, 6);
  const communityDifference = String(raw.community_difference || raw.difference || '').trim();

  if (questionContexts.length || nextTopics.length || hotspotHooks.length || communityDifference || (r.next_suggestions || []).length) {
    return {
      questionContexts: questionContexts.length ? questionContexts : (r.next_suggestions || []).slice(0, 2).map(s => ({
        title: s.suggestion || '这篇文章适合进入相关知乎问题语境',
        body: s.reason || '可以把文章中的旧观点迁移到新的讨论场景。',
      })),
      communityDifference: communityDifference || (r.creator_strength ? `你的差异点在于：${r.creator_strength}` : ''),
      keywords,
      nextTopics: (nextTopics.length ? nextTopics : (r.next_suggestions || []).slice(0, 5).map(s => ({
        title: s.suggestion || '下一篇知乎选题',
        body: s.reason || s.theory_ref || '让旧文章继续为下一篇创作工作。',
      }))).map(item => ({ ...item, title: ensureZhihuQuestionTitle(item.title), body: shortText(item.body, 64) })).slice(0, 5),
      hotspotHooks,
    };
  }
  return null;
}

function cardZhihuEnvironment(r) {
  const advice = normalizeZhihuEnvironmentAdvice(r);
  if (!advice) return '';
  const hookItems = advice.hotspotHooks.map(item => `
    <div class="sug-item">
      <div class="sug-header"><span class="sug-badge sug-跨域">切口</span><span class="sug-title">${esc(item.title)}</span></div>
      ${item.body ? `<div class="sug-reason">${esc(item.body)}</div>` : ''}
    </div>`).join('');

  return `<div class="card">
    <div class="card-label">知乎环境建议</div>
    <div class="field"><div class="field-label">社区参照原则</div><div class="field-value">知乎 API 提供的是社区语境参照，不替代创作者自己的观点资产。</div></div>
    ${advice.communityDifference ? `<div class="field"><div class="field-label">和常见讨论的差异点</div><div class="field-value">${esc(advice.communityDifference)}</div></div>` : ''}
    ${hookItems ? `<div class="field"><div class="field-label">现实切口</div>${hookItems}</div>` : ''}
  </div>`;
}

function cardConnections(r) {
  const connections = compactTextList(r.connections || []);
  const books = normalizeRecommendedBooks(r);
  return (connections.length || books.length)
    ? `<div class="card"><div class="card-label">专业推荐</div>
      ${connections.length ? `<div class="field"><div class="field-label">相邻领域</div><div class="tag-row">${tags(connections)}</div></div>` : ''}
      ${books.length ? `<div class="field"><div class="field-label">可以顺手补的书</div>${books.map(book => `<div class="sug-item"><div class="sug-header"><span class="sug-badge">书</span><span class="sug-title">${esc(book.title)}</span></div>${book.body ? `<div class="sug-reason">${esc(shortText(book.body, 58))}</div>` : ''}</div>`).join('')}</div>` : ''}
    </div>`
    : '';
}

function normalizeRecommendedBooks(r = {}) {
  const raw = Array.isArray(r.recommended_books) ? r.recommended_books : [];
  const fromBooks = raw.map(item => {
    if (typeof item === 'string') return { title: item, body: '' };
    return {
      title: String(item?.title || item?.name || item?.book || '').trim(),
      body: String(item?.why || item?.reason || item?.body || '').trim(),
    };
  });
  const fromRefs = (r.next_suggestions || [])
    .map(item => String(item?.theory_ref || '').trim())
    .filter(Boolean)
    .map(title => ({ title, body: '可作为下一篇的理论或阅读补充。' }));
  const seen = new Set();
  return [...fromBooks, ...fromRefs]
    .filter(item => item.title)
    .filter(item => {
      const key = item.title.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function cardClips(r) {
  const items = (r.reusable_clips || []).filter(c => c?.content).map(c => `
    <div class="clip-item">
      <div class="clip-top">
        <span class="clip-type">${esc(c.type || '素材')}</span>
        <span class="clip-content">${esc(c.content)}</span>
      </div>
    </div>`).join('');
  return items ? `<div class="card"><div class="card-label">可复用素材</div>${items}</div>` : '';
}

function cardEssenceInsights(r) {
  const items = (r.essence_insights || []).filter(i => i?.viewpoint).map(i => `
    <div class="essence-item">
      <div class="essence-view">${esc(i.viewpoint)}</div>
      ${i.why_essential ? `<div class="essence-why">${esc(i.why_essential)}</div>` : ''}
    </div>`).join('');
  return items ? `<div class="card"><div class="card-label">立意精华</div>${items}</div>` : '';
}

function cardTags(r) {
  return '';
}

function cardInsight(r) {
  return `<div class="card"><div class="card-label">作品识别到的你</div><div class="insight">${esc(r.insight)}</div></div>`;
}

function cardRaw(rawJson) {
  return DEBUG
    ? `<div class="raw-toggle"><button class="raw-toggle-btn">查看原始 JSON ↓</button></div>
      <pre class="raw-json">${esc(rawJson)}</pre>`
    : '';
}

const CHAT_TEMPLATES = {
  praise: {
    label: '我这篇最好的地方是什么？',
    prompt: '请只围绕这篇文章本身，指出我作为创作者最值得保留的一个优势。要具体引用文章里的表达或结构，不要泛泛鼓励。',
    autoSaveType: '立意',
  },
  optimize: {
    label: '这篇还能往哪个方向优化？',
    prompt: '请从选题、结构、材料和表达四个角度，给出这篇文章最值得优化的方向。要求建议能直接指导下一次改稿。',
  },
  craft: {
    label: '用头部创作者视角看我的结构和用词怎么样？',
    prompt: '请用知乎头部创作者的视角评价这篇文章的结构、用词、节奏和表达稳定性。请指出最值得保留的优点和最该修改的一处。',
  },
  reuse: {
    label: '这篇里哪些素材未来可以怎么复用？',
    prompt: '请从这篇文章中拆出可以在未来复用的素材。每条用短标题开头，并说明适合换到什么题材或论证场景里。',
    autoSaveType: '素材',
    splitMaterials: true,
  },
  next: {
    label: '如果换素材写第二篇，可以怎么写？',
    prompt: '如果保留这篇文章的核心立意，但换一组素材写第二篇，请给我三个可执行的新选题方向，每个方向说明切入角度。',
  },
  style: {
    label: '我开始有什么写作风格了吗？',
    prompt: '请根据这篇文章判断我正在形成的写作风格。不要贴标签，要说明这种风格由哪些句法、材料选择和论证习惯构成。',
  },
};

function cardChat(chatId, options = {}) {
  const templates = options.templates || CHAT_TEMPLATES;
  const templateAttr = options.templateAttr || 'data-chat-template';
  const buttons = Object.entries(templates).map(([key, tpl]) =>
    `<button class="chat-template-btn" type="button" ${templateAttr}="${esc(key)}">${esc(tpl.label)}</button>`
  ).join('');
  return `<div class="card chat-card" data-chat-id="${esc(chatId)}">
    <div class="card-label">${esc(options.label || '问问这篇作品')}</div>
    <div class="chat-templates">${buttons}</div>
    <div class="chat-history" aria-live="polite"></div>
    <div class="chat-status" role="status"></div>
    <div class="chat-input-row">
      <input class="chat-input" type="text" placeholder="${esc(options.placeholder || '自定义问题…')}">
      <button class="chat-send-btn" type="button">发送</button>
    </div>
  </div>`;
}

function createChatSession(analysis, rawJson, containerId, context = {}) {
  const record = context.record || null;
  const id = `chat_${containerId}_${Date.now().toString(36)}_${chatSessionSeq++}`;
  chatSessions[id] = {
    id,
    containerId,
    analysis: analysis || {},
    rawJson: rawJson || '',
    articleText: context.articleText || record?.article?.body || '',
    sourceTitle: context.articleTitle || record?.article?.title || '未命名作品',
    sourceUrl: context.articleUrl || record?.article?.url || record?.url || '',
    recordId: record?.id || '',
    projectId: context.projectId || record?.project_id || activeProject,
    agentMode: context.agentMode || 'article',
    authorContext: context.authorContext || null,
    history: [],
  };
  return id;
}

function hydrateChatContext(containerId, patch = {}) {
  const host = document.getElementById(containerId);
  const card = host?.querySelector('.chat-card[data-chat-id]');
  const session = card ? chatSessions[card.dataset.chatId] : null;
  if (!session) return;
  if (patch.record) {
    const rec = patch.record;
    session.recordId = rec.id || session.recordId;
    session.projectId = rec.project_id || session.projectId;
    session.sourceTitle = rec.article?.title || session.sourceTitle;
    session.sourceUrl = rec.article?.url || rec.url || session.sourceUrl;
    session.articleText = session.articleText || rec.article?.body || '';
  }
  Object.assign(session, Object.fromEntries(
    Object.entries(patch).filter(([key]) => key !== 'record')
  ));
}

function truncateText(text, limit) {
  const value = String(text || '');
  if (value.length <= limit) return value;
  return value.slice(0, limit) + `\n\n[上下文已截断，剩余 ${value.length - limit} 字未发送]`;
}

function analysisChatSummary(analysis) {
  const a = analysis || {};
  const summary = {
    domain: [a.domain, a.sub_domain].filter(Boolean).join(' · '),
    perspective: a.perspective || '',
    core_claim: a.core_claim || '',
    asset_cards: (a.asset_cards || []).slice(0, 6),
    creator_strength: a.creator_strength || '',
    craft_review: a.craft_review || {},
    reusable_clips: (a.reusable_clips || []).slice(0, 5),
    essence_insights: (a.essence_insights || []).slice(0, 5),
    nodes_hit: (a.nodes_hit || []).slice(0, 8).map(n => ({
      name: n.name,
      type: n.type,
      role: n.role,
      contribution: n.contribution,
    })),
    next_suggestions: (a.next_suggestions || []).slice(0, 4),
    zhihu_environment_advice: a.zhihu_environment_advice || null,
    insight: a.insight || '',
  };
  return truncateText(JSON.stringify(summary, null, 2), CHAT_ANALYSIS_LIMIT);
}

function buildAuthorAgentMessages(session, question) {
  const history = (session?.history || []).slice(-CHAT_HISTORY_LIMIT).map(item => ({
    role: item.role,
    content: truncateText(item.prompt || item.content, item.role === 'assistant' ? 1200 : 700),
  }));
  const contextText = truncateText(JSON.stringify(session?.authorContext || {}, null, 2), 12000);
  return [
    {
      role: 'system',
      content: '你是某位知乎创作者的 AI 分身。你只能基于该创作者历史文章中抽取出的作品资产回答问题。如果历史资产中没有相关内容，请明确说没有找到，不要编造。回答时必须引用相关旧文、观点卡、素材卡或知识节点。',
    },
    {
      role: 'user',
      content: `以下是这位创作者的历史作品资产库。请把它作为唯一依据，不要使用外部常识替作者表态。\n\n${contextText}`,
    },
    ...history,
    {
      role: 'user',
      content: `${question}\n\n请按这个格式回答：\n1. 你的核心判断是……\n2. 你曾经用过的素材是……\n3. 可以复用的金句或节点是……\n4. 相关旧文是……\n5. 可以继续扩写的新方向是……`,
    },
  ];
}

function buildChatMessages(session, question) {
  if (session?.agentMode === 'author') return buildAuthorAgentMessages(session, question);
  const history = (session?.history || []).slice(-CHAT_HISTORY_LIMIT).map(item => ({
    role: item.role,
    content: truncateText(item.prompt || item.content, item.role === 'assistant' ? 1200 : 700),
  }));
  return [
    {
      role: 'system',
      content: '你是创作者的写作伙伴。你的任务不是夸张评价，而是帮助作者把刚写完的作品变成可复用的经验、素材和下一步写作判断。',
    },
    {
      role: 'user',
      content: `我刚写完这篇文章，请把它作为本轮追问的主要上下文。\n\n标题：${session?.sourceTitle || '未命名作品'}\n\n正文：\n${truncateText(session?.articleText || '', CHAT_ARTICLE_LIMIT)}`,
    },
    {
      role: 'assistant',
      content: `这是上一轮结构化分析摘要，后续回答必须与它保持一致：\n${analysisChatSummary(session?.analysis)}`,
    },
    ...history,
    { role: 'user', content: question },
  ];
}

function handleResultClick(e) {
  if (e.target.matches('.raw-toggle-btn')) {
    toggleRaw(e.target);
    return;
  }
  const remixBtn = e.target.closest('[data-asset-remix]');
  if (remixBtn) {
    useAssetCardForNewArticle(remixBtn);
    return;
  }
  const templateBtn = e.target.closest('[data-chat-template]');
  if (templateBtn) {
    sendTemplateChat(templateBtn.closest('.chat-card'), templateBtn.dataset.chatTemplate);
    return;
  }
  const sendBtn = e.target.closest('.chat-send-btn');
  if (sendBtn) {
    sendCustomChat(sendBtn.closest('.chat-card'));
    return;
  }
  const saveBtn = e.target.closest('[data-chat-save]');
  if (saveBtn) {
    saveChatTurn(saveBtn.closest('.chat-card'), saveBtn);
    return;
  }
  const nodeEl = e.target.closest('.node-item[data-node-name]');
  if (nodeEl) showNodeDetail(nodeEl.dataset.nodeName);
}

function parseAssetRemixPayload(btn) {
  try {
    return JSON.parse(btn?.dataset?.assetRemix || '{}');
  } catch {
    return {};
  }
}

function resultHostForElement(el) {
  return el?.closest?.('#result, #assetDetailResult') || el?.closest?.('.analysis-group')?.parentElement || document;
}

function buildAssetRemixPrompt(asset = {}) {
  const keywords = Array.isArray(asset.keywords) ? asset.keywords.filter(Boolean).join('、') : String(asset.keywords || '');
  return `请把下面这张旧作品资产卡，用来生成一篇新的知乎文章方向。

资产类型：${asset.type || '作品资产'}
资产标题：${asset.title || '未命名资产'}
一句话解释：${asset.summary || '无'}
来源文章：${asset.source || '当前作品'}
关键词：${keywords || '无'}
为什么可复用：${asset.whyReusable || '无'}
可复用指数：${asset.reuseScore || 4}/5

请严格按以下结构输出，内容要能直接进入下一篇创作：
1. 新选题
2. 标题建议（给 3 个）
3. 文章开头（120 字以内）
4. 文章大纲（4-6 节）
5. 可复用旧素材（列出来自旧文的观点、素材或节点）
6. 可能反驳点
7. 推荐结尾

要求：不要写成营销文案，不要泛泛而谈。重点展示“旧文章如何继续为下一篇创作工作”。`;
}

function useAssetCardForNewArticle(btn) {
  const asset = parseAssetRemixPayload(btn);
  const host = resultHostForElement(btn);
  const chatCard = host?.querySelector?.('.chat-card');
  if (!chatCard) return;
  const title = asset.title || '这张资产卡';
  flashAssetRemixButton(btn);
  revealChatCard(chatCard);
  sendChatQuestion(chatCard, buildAssetRemixPrompt(asset), {
    label: `用于新文章：${title}`,
    custom: true,
  });
}

function flashAssetRemixButton(btn) {
  if (!btn) return;
  const original = btn.dataset.originalLabel || btn.textContent || '用于新文章';
  btn.dataset.originalLabel = original;
  btn.textContent = '已发送到 AI 对话框';
  btn.classList.add('asset-remix-sent');
  clearTimeout(btn._assetRemixTimer);
  btn._assetRemixTimer = setTimeout(() => {
    btn.textContent = btn.dataset.originalLabel || original;
    btn.classList.remove('asset-remix-sent');
  }, 1800);
}

function revealChatCard(card) {
  if (!card) return;
  card.classList.add('chat-card-attention');
  try {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    card.scrollIntoView();
  }
  clearTimeout(card._attentionTimer);
  card._attentionTimer = setTimeout(() => {
    card.classList.remove('chat-card-attention');
    const input = card.querySelector('.chat-input');
    try {
      input?.focus({ preventScroll: true });
    } catch {
      input?.focus();
    }
  }, 900);
}

function handleChatKeydown(e) {
  if (!e.target.matches('.chat-input') || e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  sendCustomChat(e.target.closest('.chat-card'));
}

function sendTemplateChat(card, key) {
  const tpl = CHAT_TEMPLATES[key];
  if (!tpl) return;
  sendChatQuestion(card, tpl.prompt, { templateKey: key, label: tpl.label });
}

function sendCustomChat(card) {
  const input = card?.querySelector('.chat-input');
  const question = input?.value.trim() || '';
  if (!question) {
    setChatStatus(card, '先写一个问题。');
    return;
  }
  input.value = '';
  sendChatQuestion(card, question, { label: question, custom: true });
}

function handleAuthorAgentClick(e) {
  const btn = e.target.closest('[data-author-template]');
  if (!btn) return false;
  sendAuthorAgentTemplate(btn.closest('.chat-card'), btn.dataset.authorTemplate);
  return true;
}

function sendAuthorAgentTemplate(card, key) {
  const tpl = AUTHOR_AGENT_TEMPLATES[key];
  if (!tpl) return;
  sendChatQuestion(card, tpl.prompt, { label: tpl.label, custom: true });
}

async function sendChatQuestion(card, question, source = {}) {
  const session = getChatSession(card);
  if (!session) return;
  if (isChatting) {
    setChatStatus(card, '上一条追问还在生成中，请稍等。');
    return;
  }

  isChatting = true;
  setChatBusy(card, true);
  setChatStatus(card, '正在追问 AI…');
  const messages = buildChatMessages(session, question);
  session.history.push({
    id: makeClipId('chatq'),
    role: 'user',
    content: source.label || question,
    prompt: question,
  });
  renderChatHistory(card, session);

  try {
    const [settings, apiKeys] = await Promise.all([
      chrome.storage.sync.get(['provider', 'model']),
      getStoredApiKeys(),
    ]);
    const { provider, model } = resolveProviderModel(settings);
    const apiKey = getApiKeyForProvider(provider, apiKeys);
    if (!apiKey) throw new Error('请先在设置页填写 API Key。');

    const answer = String(await callLLM(apiKey, provider, model, messages, 1800) || '').trim();
    const entry = {
      id: makeClipId('chata'),
      role: 'assistant',
      content: answer || 'AI 没有返回可用内容。',
      templateKey: source.templateKey || '',
      templateLabel: source.templateKey ? CHAT_TEMPLATES[source.templateKey]?.label : '',
      saveMode: source.custom ? 'custom' : 'manual',
      savedAs: '',
    };
    session.history.push(entry);
    renderChatHistory(card, session);

    const tpl = source.templateKey ? CHAT_TEMPLATES[source.templateKey] : null;
    if (tpl?.autoSaveType) {
      await saveAutoChatReply(session, entry, tpl);
      renderChatHistory(card, session);
      setChatStatus(card, entry.savedAs || '已自动入库。');
    } else {
      setChatStatus(card, source.custom ? '这条对话可以选择是否入库。' : '回答已生成，可以按需保存到素材库或立意库。');
    }
  } catch (err) {
    setChatStatus(card, err.message || '追问失败，请稍后再试。', true);
  } finally {
    isChatting = false;
    setChatBusy(card, false);
  }
}

function getChatSession(card) {
  return card?.dataset?.chatId ? chatSessions[card.dataset.chatId] : null;
}

function setChatBusy(card, busy) {
  if (!card) return;
  card.classList.toggle('is-chatting', busy);
  card.querySelectorAll('button, input').forEach(el => {
    if (el.matches('[data-chat-save]')) return;
    el.disabled = busy;
  });
}

function setChatStatus(card, text, isError = false) {
  const status = card?.querySelector('.chat-status');
  if (!status) return;
  status.textContent = text || '';
  status.classList.toggle('error', Boolean(isError));
}

function renderChatHistory(card, session) {
  const historyEl = card?.querySelector('.chat-history');
  if (!historyEl || !session) return;
  historyEl.innerHTML = session.history.map(item => {
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    const label = role === 'assistant' ? 'AI' : '我';
    return `<div class="chat-message ${role}" data-turn-id="${esc(item.id)}">
      <div class="chat-message-label">${label}</div>
      <div class="chat-message-body">${esc(item.content)}</div>
      ${role === 'assistant' ? chatSaveActions(item) : ''}
    </div>`;
  }).join('');
  historyEl.scrollTop = historyEl.scrollHeight;
}

function chatSaveActions(item) {
  if (item.savedAs) return `<div class="chat-save-note">${esc(item.savedAs)}</div>`;
  if (item.saveMode === 'custom') {
    return `<div class="chat-save-actions">
      <span>这条对话要不要存到资产库？</span>
      <button type="button" data-chat-save="素材" data-turn-id="${esc(item.id)}">存为素材</button>
      <button type="button" data-chat-save="立意" data-turn-id="${esc(item.id)}">存为立意</button>
      <button type="button" data-chat-save="none" data-turn-id="${esc(item.id)}">不存</button>
    </div>`;
  }
  if (item.saveMode === 'manual') {
    return `<div class="chat-save-actions">
      <button type="button" data-chat-save="素材" data-turn-id="${esc(item.id)}">保存到素材库 ↓</button>
      <button type="button" data-chat-save="立意" data-turn-id="${esc(item.id)}">保存到立意库 ↓</button>
    </div>`;
  }
  return '';
}

async function saveChatTurn(card, btn) {
  const session = getChatSession(card);
  const entry = session?.history.find(item => item.id === btn?.dataset?.turnId);
  if (!session || !entry) return;
  const type = btn.dataset.chatSave;
  if (type === 'none') {
    entry.savedAs = '未入库';
    entry.saveMode = '';
    renderChatHistory(card, session);
    setChatStatus(card, '已跳过入库。');
    return;
  }
  try {
    await saveChatReplyAsClip(session, type, entry.content, {
      question: entry.templateLabel || '自定义追问',
      why: `来自追问：${entry.templateLabel || '自定义追问'}`,
    });
    entry.savedAs = `已保存到${type}库`;
    entry.saveMode = '';
    renderChatHistory(card, session);
    setChatStatus(card, `已保存到${type}库。`);
  } catch (err) {
    setChatStatus(card, `保存失败：${err.message}`, true);
  }
}

function sanitizeClipKey(value) {
  return String(value || 'x').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'x';
}

function buildChatClip(session, type, content, opts = {}) {
  const base = sanitizeClipKey(session.recordId || session.id);
  const id = opts.dedupeKey
    ? `chat_${base}_${sanitizeClipKey(opts.dedupeKey)}`
    : makeClipId('chat');
  return {
    id,
    type,
    content: truncateText(content, CHAT_REPLY_LIMIT),
    why_reusable: opts.why || `来自追问：${opts.question || '自定义追问'}`,
    source_article_id: session.recordId || '',
    source_article_title: session.sourceTitle || '未命名作品',
    project_id: session.projectId || activeProject,
    savedAt: new Date().toISOString(),
  };
}

async function saveChatReplyAsClip(session, type, content, opts = {}) {
  const clip = buildChatClip(session, type, content, opts);
  await dbSaveClip(clip);
  return clip;
}

async function deleteExistingChatAutoClips(session, templateKey) {
  const base = sanitizeClipKey(session.recordId || session.id);
  const prefix = `chat_${base}_${sanitizeClipKey(templateKey)}_`;
  const existing = await dbGetClips({ project: session.projectId || activeProject }).catch(() => []);
  const stale = existing.filter(clip => String(clip.id || '').startsWith(prefix));
  await Promise.all(stale.map(clip => dbDeleteClip(clip.id)));
}

function parseMaterialReply(reply) {
  const lines = String(reply || '').split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[\.、])\s*/, '').trim())
    .filter(line => line.length >= 6);
  const unique = [];
  for (const line of lines) {
    if (!unique.includes(line)) unique.push(line);
  }
  return (unique.length ? unique : [String(reply || '').trim()].filter(Boolean)).slice(0, 6);
}

async function saveAutoChatReply(session, entry, tpl) {
  if (tpl.splitMaterials) {
    const pieces = parseMaterialReply(entry.content);
    await deleteExistingChatAutoClips(session, entry.templateKey);
    await Promise.all(pieces.map((piece, index) =>
      saveChatReplyAsClip(session, '素材', piece, {
        dedupeKey: `${entry.templateKey}_${index}`,
        question: tpl.label,
        why: `来自追问模板：${tpl.label}`,
      })
    ));
    entry.savedAs = `已自动更新素材库 ${pieces.length} 条`;
    entry.saveMode = '';
    return;
  }
  await saveChatReplyAsClip(session, tpl.autoSaveType, entry.content, {
    dedupeKey: entry.templateKey,
    question: tpl.label,
    why: `来自追问模板：${tpl.label}`,
  });
  entry.savedAs = `已自动更新${tpl.autoSaveType}库`;
  entry.saveMode = '';
}

function analysisGroup(title, content) {
  const body = Array.isArray(content) ? content.filter(Boolean).join('') : String(content || '');
  return body
    ? `<section class="analysis-group">
      <div class="analysis-group-title">${esc(title)}</div>
      <div class="analysis-group-body">${body}</div>
    </section>`
    : '';
}

function groupReusableReview(r, context = {}) {
  return analysisGroup('可复用素材与立意', [
    cardAssetCards(r, context),
    cardClips(r),
    cardEssenceInsights(r),
    cardStrengths(r),
  ]);
}

function groupCreatorFeedback(r) {
  return analysisGroup('写作指纹证据', [
    cardCreatorStrength(r),
    cardCraftReview(r),
    cardStrengths(r),
  ]);
}

function groupMaterials(r) {
  return analysisGroup('素材资产', [
    cardClips(r),
    cardEssenceInsights(r),
    cardConcepts(r),
    cardConnections(r),
  ]);
}

function groupZhihuEnvironment(r) {
  return analysisGroup('知乎环境建议', cardZhihuEnvironment(r));
}

function groupAdjacentRecommendations(r) {
  return analysisGroup('相邻领域与专业推荐', [
    cardConnections(r),
    cardZhihuEnvironment(r),
  ]);
}

function groupExtension(r) {
  return analysisGroup('旧文章复利', cardSuggestions(r));
}

function groupQA(r, chatId) {
  return analysisGroup('问问这篇作品', cardChat(chatId));
}

function renderResult(r, rawJson, containerId = 'result', context = {}) {
  const chatId = createChatSession(r, rawJson, containerId, context);
  document.getElementById(containerId).innerHTML = [
    groupReusableReview(r, context),
    groupAdjacentRecommendations(r),
    groupExtension(r),
    groupQA(r, chatId),
    cardRaw(rawJson),
  ].join('');
  document.getElementById(containerId).style.display = 'block';
}

// ── Tab 导航 ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, { userTriggered: true }))
  );
}

function stopMapSimulation() {
  stopEarthSphere();
  stopUniverseScene();
}

function switchTab(name, opts = {}) {
  if (document.body) document.body.dataset.activeTab = name;
  if (name !== 'map') stopMapSimulation();
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name)
  );
  document.getElementById('analyzeTab').style.display = name === 'analyze' ? '' : 'none';
  document.getElementById('assetsTab').style.display  = name === 'assets'  ? '' : 'none';
  document.getElementById('reviewTab').style.display  = name === 'review'  ? '' : 'none';
  document.getElementById('mapTab').style.display     = name === 'map'     ? '' : 'none';
  document.getElementById('fingerprintTab').style.display = name === 'fingerprint' ? '' : 'none';
  const authorTab = document.getElementById('authorTab');
  if (authorTab) authorTab.style.display = name === 'author' ? '' : 'none';
  if (name === 'assets' && !opts.skipLoad) {
    resetAssetSelection('clips-material');
    assetListMode = 'clips-material';
    loadCurrentAssetMode();
  }
  if (name === 'review') loadReview();
  if (name === 'map')    loadMap({ resetToOverview: true });
  if (name === 'fingerprint') loadFingerprint();
  if (name === 'author') loadAuthorAgent();
  if (opts.userTriggered && !opts.skipOnboarding) {
    setTimeout(() => {
      maybeStartPanelOnboardingForSection(name).catch(e => debugLog('[知识图鉴 panel] 分区引导启动失败:', e.message));
    }, 220);
  }
}

async function updateAssetCount() {
  const count = await dbGetArticleCount({ project: activeProject });
  const badge = document.getElementById('assetCount');
  if (badge) {
    badge.textContent = count ? String(count) : '';
    badge.style.display = count ? 'inline-block' : 'none';
  }
  updateTopMetrics().catch(e => debugLog('[知识图鉴 panel] top metrics 更新失败:', e));
}

function formatMetricNumber(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return String(n);
}

const DEFAULT_WEEK_METRIC_GOAL = 3;
const WEEK_GOAL_QUICK_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 30];

function normalizeWeekGoal(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_WEEK_METRIC_GOAL;
  return Math.min(99, Math.max(1, n));
}

async function getWeekGoal() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_WEEK_METRIC_GOAL;
  const { weekGoal } = await chrome.storage.local.get('weekGoal');
  return normalizeWeekGoal(weekGoal);
}

function ensureWeekGoalOption(select, weekGoal) {
  if (!select) return;
  const value = String(weekGoal);
  if (!select.querySelector(`option[value="${value}"]`)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${weekGoal}篇`;
    select.appendChild(option);
  }
}

function syncWeekGoalSelect(weekGoal) {
  const select = document.getElementById('weekGoalSelect');
  if (!select) return;
  ensureWeekGoalOption(select, weekGoal);
  select.value = String(weekGoal);
  select.title = `每周 ${weekGoal} 篇达标`;
}

function bindWeekGoalQuickSelect() {
  const select = document.getElementById('weekGoalSelect');
  if (!select || select.dataset.bound === '1') return;
  if (!select.options.length) {
    select.innerHTML = WEEK_GOAL_QUICK_OPTIONS
      .map(n => `<option value="${n}">${n}篇</option>`)
      .join('');
  }
  select.dataset.bound = '1';
  select.addEventListener('change', async () => {
    const weekGoal = normalizeWeekGoal(select.value);
    syncWeekGoalSelect(weekGoal);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ weekGoal });
    }
    await updateTopMetrics();
  });
}

function metricCharCount(rec) {
  return (rec.article?.body || '').length;
}

function summarizeMetricRecords(records) {
  return {
    count: records.length,
    chars: records.reduce((sum, rec) => sum + metricCharCount(rec), 0),
  };
}

function localPeriodStarts(now = new Date()) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const week = new Date(day);
  week.setDate(day.getDate() - ((day.getDay() || 7) - 1));

  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = new Date(now.getFullYear(), 0, 1);
  return { year, month, week, day };
}

function recordsSince(records, start, end) {
  return records.filter(rec => {
    const d = new Date(rec.savedAt || '');
    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  });
}

function summarizeTopMetricBuckets(records, now = new Date()) {
  const starts = localPeriodStarts(now);
  return {
    total: summarizeMetricRecords(records),
    year: summarizeMetricRecords(recordsSince(records, starts.year, now)),
    month: summarizeMetricRecords(recordsSince(records, starts.month, now)),
    week: summarizeMetricRecords(recordsSince(records, starts.week, now)),
    day: summarizeMetricRecords(recordsSince(records, starts.day, now)),
  };
}

function formatMetricSummary(summary) {
  return `${formatMetricNumber(summary.count)}篇 · ${formatMetricNumber(summary.chars)}字`;
}

function setMetricSummary(id, summary) {
  const el = document.getElementById(id);
  if (el) el.textContent = formatMetricSummary(summary);
}

function setTopPeriodHint(day, month) {
  const el = document.getElementById('topPeriodHint');
  if (el) el.textContent = `通过作品，看见创作者自己 · 今日 ${day.count} 篇 · 本月 ${month.count} 篇`;
}

async function updateTopMetrics() {
  const fillEl = document.getElementById('weekProgFill');
  const pctEl = document.getElementById('weekProgPct');
  const labelEl = document.getElementById('weekProgLabel');
  if (!fillEl || !pctEl || !labelEl) return;

  const records = await dbGetAllArticles();
  const buckets = summarizeTopMetricBuckets(records);
  const weekGoal = await getWeekGoal();
  const pct = Math.min(100, Math.round(buckets.week.count / weekGoal * 100));
  const achieved = buckets.week.count >= weekGoal;

  labelEl.textContent = achieved ? '本周目标达成 ✓' : `本周 ${buckets.week.count}/${weekGoal} 篇`;
  fillEl.style.width = `${pct}%`;
  pctEl.textContent = `${pct}%`;
  document.getElementById('weekProgWrap')?.classList.toggle('achieved', achieved);
  setTopPeriodHint(buckets.day, buckets.month);
  bindWeekGoalQuickSelect();
  syncWeekGoalSelect(weekGoal);
}

// ── 资产工具栏（本地扫描）────────────────────────────────
function resetAssetSelection(mode = assetListMode) {
  assetSelectionState = { mode, ids: new Set(), items: [], lastIndex: null };
  updateAssetSelectionUI();
}

function syncAssetSelectionScope(mode, items = []) {
  if (assetSelectionState.mode !== mode) {
    assetSelectionState = { mode, ids: new Set(), items: [], lastIndex: null };
  }
  assetSelectionState.items = items;
  const visibleIds = new Set(items.map(item => item.id));
  assetSelectionState.ids = new Set([...assetSelectionState.ids].filter(id => visibleIds.has(id)));
  if (assetSelectionState.lastIndex !== null && assetSelectionState.lastIndex >= items.length) {
    assetSelectionState.lastIndex = null;
  }
}

function selectedAssetItems() {
  return assetSelectionState.items.filter(item => assetSelectionState.ids.has(item.id));
}

function isAssetSelected(id) {
  return assetSelectionState.ids.has(String(id || ''));
}

function assetSelectButtonHtml(id, index) {
  const selected = isAssetSelected(id);
  return `<button class="asset-select-btn${selected ? ' selected' : ''}" type="button"
    data-asset-select-id="${esc(id)}" data-asset-select-index="${index}"
    aria-pressed="${selected ? 'true' : 'false'}" title="选择这条资产"><span>✓</span></button>`;
}

function updateAssetSelectionUI() {
  const total = assetSelectionState.items.length;
  const selected = assetSelectionState.ids.size;
  const selectAllBtn = document.getElementById('assetSelectAllBtn');
  const deleteBtn = document.getElementById('assetBatchDeleteBtn');
  const exportBtn = document.getElementById('assetBatchExportBtn');
  const status = document.getElementById('assetSelectionStatus');

  if (selectAllBtn) {
    selectAllBtn.disabled = total === 0;
    selectAllBtn.textContent = selected && selected === total ? '取消全选' : '全选';
  }
  if (deleteBtn) {
    deleteBtn.hidden = selected === 0;
    deleteBtn.disabled = selected === 0;
    deleteBtn.textContent = selected ? `删除 ${selected} 项` : '删除';
  }
  if (exportBtn) {
    exportBtn.hidden = selected === 0;
    exportBtn.disabled = selected === 0;
    exportBtn.textContent = selected ? `导出 ${selected} 项` : '导出';
  }
  if (status) {
    status.textContent = selected ? `已选 ${selected}/${total}` : (total ? `共 ${total} 项` : '');
  }

  document.querySelectorAll('[data-selectable-card]').forEach(card => {
    const selectedCard = assetSelectionState.ids.has(card.dataset.assetId);
    card.classList.toggle('selected', selectedCard);
    const btn = card.querySelector('.asset-select-btn');
    if (btn) {
      btn.classList.toggle('selected', selectedCard);
      btn.setAttribute('aria-pressed', selectedCard ? 'true' : 'false');
    }
  });
}

function bindAssetSelection(container) {
  container?.querySelectorAll('[data-asset-select-id]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const id = String(btn.dataset.assetSelectId || '');
      const index = Number(btn.dataset.assetSelectIndex || 0);
      if (!id) return;

      if (event.shiftKey && assetSelectionState.lastIndex !== null) {
        const start = Math.min(assetSelectionState.lastIndex, index);
        const end = Math.max(assetSelectionState.lastIndex, index);
        for (let i = start; i <= end; i++) {
          const item = assetSelectionState.items[i];
          if (item) assetSelectionState.ids.add(item.id);
        }
      } else if (assetSelectionState.ids.has(id)) {
        assetSelectionState.ids.delete(id);
      } else {
        assetSelectionState.ids.add(id);
      }
      assetSelectionState.lastIndex = index;
      updateAssetSelectionUI();
    });
  });
  updateAssetSelectionUI();
}

function bindAssetBatchControls() {
  const selectAllBtn = document.getElementById('assetSelectAllBtn');
  const deleteBtn = document.getElementById('assetBatchDeleteBtn');
  const exportBtn = document.getElementById('assetBatchExportBtn');

  if (selectAllBtn && selectAllBtn.dataset.bound !== '1') {
    selectAllBtn.dataset.bound = '1';
    selectAllBtn.addEventListener('click', () => {
      const allSelected = assetSelectionState.items.length > 0
        && assetSelectionState.ids.size === assetSelectionState.items.length;
      assetSelectionState.ids = allSelected
        ? new Set()
        : new Set(assetSelectionState.items.map(item => item.id));
      assetSelectionState.lastIndex = allSelected ? null : Math.max(0, assetSelectionState.items.length - 1);
      updateAssetSelectionUI();
    });
  }

  if (deleteBtn && deleteBtn.dataset.bound !== '1') {
    deleteBtn.dataset.bound = '1';
    deleteBtn.addEventListener('click', deleteSelectedAssets);
  }
  if (exportBtn && exportBtn.dataset.bound !== '1') {
    exportBtn.dataset.bound = '1';
    exportBtn.addEventListener('click', exportSelectedAssets);
  }
  updateAssetSelectionUI();
}

function assetDateSelectHtml() {
  return `<div id="assetDateFilter" class="asset-date-filter" aria-label="按录入日期筛选">
    <select id="assetYearFilter" class="asset-date-select" aria-label="选择年份"><option value="">年</option></select>
    <select id="assetMonthFilter" class="asset-date-select" aria-label="选择月份"><option value="">月</option></select>
    <select id="assetDayFilter" class="asset-date-select" aria-label="选择日期"><option value="">日</option></select>
  </div>`;
}

function getAssetDateFilterParts() {
  return {
    year: document.getElementById('assetYearFilter')?.value || '',
    month: document.getElementById('assetMonthFilter')?.value || '',
    day: document.getElementById('assetDayFilter')?.value || '',
  };
}

function hasAssetDateFilter(parts = getAssetDateFilterParts()) {
  return Boolean(parts.year || parts.month || parts.day);
}

function assetDateFilterLabel(parts = getAssetDateFilterParts()) {
  const labels = [];
  if (parts.year) labels.push(`${parts.year}年`);
  if (parts.month) labels.push(`${Number(parts.month)}月`);
  if (parts.day) labels.push(`${Number(parts.day)}日`);
  return labels.join('');
}

function matchesAssetDateFilter(savedAt, parts = getAssetDateFilterParts()) {
  if (!hasAssetDateFilter(parts)) return true;
  const d = String(savedAt || '').slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  return (!parts.year || m[1] === parts.year)
    && (!parts.month || m[2] === parts.month)
    && (!parts.day || m[3] === parts.day);
}

function setAssetDateSelectOptions(select, values, placeholder, current) {
  if (!select) return '';
  const allowed = new Set(values);
  const nextValue = allowed.has(current) ? current : '';
  select.innerHTML = [
    `<option value="">${placeholder}</option>`,
    ...values.map(value => `<option value="${esc(value)}">${Number(value)}</option>`),
  ].join('');
  select.value = nextValue;
  return nextValue;
}

function updateAssetDateFilterOptions(records = [], getDate = rec => rec.savedAt) {
  const yearSelect = document.getElementById('assetYearFilter');
  const monthSelect = document.getElementById('assetMonthFilter');
  const daySelect = document.getElementById('assetDayFilter');
  if (!yearSelect || !monthSelect || !daySelect) return getAssetDateFilterParts();

  const current = getAssetDateFilterParts();
  const dates = (records || [])
    .map(item => String(getDate(item) || '').slice(0, 10))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const pick = (index, filter = () => true) => [...new Set(
    dates.filter(filter).map(d => d.split('-')[index])
  )];

  const years = pick(0).sort((a, b) => b.localeCompare(a));
  const year = setAssetDateSelectOptions(yearSelect, years, '年', current.year);
  const months = pick(1, d => !year || d.startsWith(`${year}-`)).sort((a, b) => a.localeCompare(b));
  const month = setAssetDateSelectOptions(monthSelect, months, '月', current.month);
  const days = pick(2, d => {
    const [y, m] = d.split('-');
    return (!year || y === year) && (!month || m === month);
  }).sort((a, b) => a.localeCompare(b));
  const day = setAssetDateSelectOptions(daySelect, days, '日', current.day);
  return { year, month, day };
}

function buildSelectedAssetsExportPayload(items = [], linkedClips = []) {
  const articles = items
    .filter(item => item.kind === 'article' && item.data)
    .map(item => item.data);
  const directClips = items
    .filter(item => item.kind === 'clip' && item.data)
    .map(item => item.data);
  const selectedArticleIds = new Set(articles.map(rec => rec.id).filter(Boolean));
  const clipById = {};
  for (const clip of directClips) {
    if (clip?.id) clipById[clip.id] = clip;
  }
  for (const clip of linkedClips || []) {
    if (clip?.id && selectedArticleIds.has(clip.source_article_id)) clipById[clip.id] = clip;
  }
  return {
    export_format: 'zhijing_selected_assets_v1',
    exported_at: new Date().toISOString(),
    project_id: activeProject,
    mode: assetSelectionState.mode,
    selection_count: items.length,
    articles,
    clips: Object.values(clipById),
  };
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function exportSelectedAssets() {
  const items = selectedAssetItems();
  if (!items.length) return;
  const exportBtn = document.getElementById('assetBatchExportBtn');
  const oldText = exportBtn?.textContent;
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.textContent = '导出中…';
  }
  try {
    const selectedArticleIds = new Set(items.filter(item => item.kind === 'article').map(item => item.id));
    const linkedClips = selectedArticleIds.size
      ? (await dbGetClips({ project: activeProject }).catch(() => []))
          .filter(clip => selectedArticleIds.has(clip.source_article_id))
      : [];
    const payload = buildSelectedAssetsExportPayload(items, linkedClips);
    downloadJsonFile(`知识图鉴_已选资产_${new Date().toISOString().slice(0, 10)}.json`, payload);
  } catch (e) {
    alert(`导出失败：${e.message}`);
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.textContent = oldText || `导出 ${items.length} 项`;
    }
    updateAssetSelectionUI();
  }
}

async function deleteSelectedAssets() {
  const items = selectedAssetItems();
  if (!items.length) return;
  const articleCount = items.filter(item => item.kind === 'article').length;
  const clipCount = items.filter(item => item.kind === 'clip').length;
  const parts = [
    articleCount ? `${articleCount} 条作品/速记` : '',
    clipCount ? `${clipCount} 条素材/立意` : '',
  ].filter(Boolean).join('、');
  const suffix = articleCount ? '作品/速记关联的素材和立意也会一并清除。' : '删除后不可恢复。';
  if (!confirm(`确定删除已选的 ${parts} 吗？${suffix}`)) return;

  const deleteBtn = document.getElementById('assetBatchDeleteBtn');
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = '删除中…';
  }

  try {
    for (const item of items) {
      if (item.kind === 'clip') await dbDeleteClip(item.id);
      else if (item.kind === 'article') await dbDeleteArticle(item.id);
    }
    resetAssetSelection(assetListMode);
    await updateAssetCount();
    await loadCurrentAssetMode();
  } catch (e) {
    alert(`批量删除失败：${e.message}`);
    updateAssetSelectionUI();
  }
}

async function initAssetsToolbar() {
  const handle  = await dbGetConfig('local_folder').catch(() => null);
  const toolbar = document.getElementById('assetsToolbar');
  const syncHtml = handle
    ? `<button class="assets-toolbar-btn" id="syncFolderBtn">重新扫描</button>
       <span class="sync-status" id="syncStatus"></span>`
    : '';
  toolbar.innerHTML = `
    <div class="asset-mode-row">
      <button class="asset-mode" type="button" data-asset-mode="clips-material">素材</button>
      <button class="asset-mode" type="button" data-asset-mode="clips-insight">立意</button>
      <button class="asset-mode" type="button" data-asset-mode="assets">作品</button>
    </div>
    <div class="assets-toolbar">
      <input type="text" id="assetSearch" class="asset-search" placeholder="搜索你过去写过的观点、素材、人物、金句或主题">
      ${assetDateSelectHtml()}
      ${syncHtml}
      <div class="asset-batch-actions">
        <span class="asset-selection-status" id="assetSelectionStatus"></span>
        <button class="assets-toolbar-btn" id="assetSelectAllBtn" type="button">全选</button>
        <button class="assets-toolbar-btn asset-batch-delete" id="assetBatchDeleteBtn" type="button" hidden>删除</button>
        <button class="assets-toolbar-btn asset-batch-export" id="assetBatchExportBtn" type="button" hidden>导出</button>
      </div>
    </div>`;
  toolbar.querySelectorAll('[data-asset-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.assetMode;
      if (assetListMode !== nextMode) resetAssetSelection(nextMode);
      assetListMode = nextMode;
      loadCurrentAssetMode();
    });
  });
  document.getElementById('assetSearch').addEventListener('input', () => {
    loadCurrentAssetMode();
  });
  document.getElementById('assetDateFilter').addEventListener('change', () => {
    loadCurrentAssetMode();
  });
  if (handle) document.getElementById('syncFolderBtn').addEventListener('click', syncLocalFolder);
  bindAssetBatchControls();
  setAssetListMode(assetListMode);
}

function setAssetListMode(mode) {
  if (assetSelectionState.mode !== mode) resetAssetSelection(mode);
  assetListMode = mode;
  document.querySelectorAll('[data-asset-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.assetMode === mode);
  });
  const search = document.getElementById('assetSearch');
  if (search) {
    search.placeholder = mode === 'nodes'
      ? '搜索节点、类型、项目…'
      : mode === 'assets'
        ? '搜索作品正文、作者、领域…'
        : '搜索你过去写过的观点、素材、人物、金句或主题';
  }
}

function loadCurrentAssetMode() {
  const query = document.getElementById('assetSearch')?.value.trim() || '';
  if (query) return loadAssetSearchResults(query);
  if (assetListMode === 'assets') return loadAssets();
  if (assetListMode === 'nodes') return loadNodeIndex();
  if (assetListMode === 'clips-insight') return loadClips('立意');
  return loadClips('素材');
}

async function syncLocalFolder() {
  const btn    = document.getElementById('syncFolderBtn');
  const status = document.getElementById('syncStatus');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '扫描中…';
  if (status) status.textContent = '';

  const { synced, error } = await syncFromLocalFolder();

  btn.disabled = false;
  btn.textContent = '重新扫描';
  if (status) {
    if (error) {
      status.textContent = error;
      status.style.color = '#bb5555';
    } else {
      status.textContent = synced ? `已同步 ${synced} 条` : '无更新';
      status.style.color = synced ? '#40c080' : '#484860';
    }
  }
  if (synced) {
    loadCurrentAssetMode();
  }
}

async function loadClips(type = '素材') {
  setAssetListMode(type === '立意' ? 'clips-insight' : 'clips-material');
  const query = document.getElementById('assetSearch')?.value.trim().toLowerCase() || '';
  let clips = await dbGetClips({ type, project: activeProject });
  const dateParts = updateAssetDateFilterOptions(clips, clip => clip.savedAt);
  const hasDate = hasAssetDateFilter(dateParts);
  const dateLabel = assetDateFilterLabel(dateParts);

  if (query) {
    clips = clips.filter(clip =>
      [clip.content, clip.why_reusable, clip.source_article_title]
        .some(s => String(s || '').toLowerCase().includes(query))
    );
  }
  if (hasDate) {
    clips = clips.filter(clip => matchesAssetDateFilter(clip.savedAt, dateParts));
  }

  const container = document.getElementById('assetsList');
  const selectionItems = clips.map(clip => ({
    id: String(clip.id),
    kind: 'clip',
    label: String(clip.content || ''),
    data: clip,
  }));
  syncAssetSelectionScope(assetListMode, selectionItems);
  if (!clips.length) {
    container.innerHTML = query || hasDate
      ? `<div class="asset-empty">没有找到${dateLabel ? ` ${esc(dateLabel)} ` : ''}${query ? `「${esc(query)}」相关的` : ''}${type}</div>`
      : `<div class="asset-empty">还没有${type}<br>分析文章后，AI 会自动沉淀可复用的${type}</div>`;
    updateAssetSelectionUI();
    return;
  }

  container.innerHTML = clips.map((clip, i) => `
    <div class="clip-card selectable-asset-card${isAssetSelected(clip.id) ? ' selected' : ''}" data-idx="${i}" data-selectable-card data-asset-id="${esc(clip.id)}">
      <div class="clip-card-type">${esc(clip.type)}</div>
      <div class="clip-card-content">${esc(clip.content)}</div>
      ${clip.why_reusable ? `<div class="clip-card-why">${esc(clip.why_reusable)}</div>` : ''}
      <button class="clip-source" type="button" data-article-id="${esc(clip.source_article_id)}">
        来自《${esc(clip.source_article_title || '未知作品')}》
      </button>
      ${assetSelectButtonHtml(clip.id, i)}
    </div>`).join('');

  container.querySelectorAll('.clip-source').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.stopPropagation();
      const rec = await dbGetArticle(btn.dataset.articleId);
      if (rec) showAssetDetail(rec);
    });
  });
  bindAssetSelection(container);
}

function assetSearchMatches(query, values = []) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return false;
  return values.some(value => String(value || '').toLowerCase().includes(q));
}

function assetSearchPush(groups, seen, groupKey, item) {
  if (!item?.title && !item?.summary) return;
  const key = [
    groupKey,
    item.sourceArticleId || '',
    item.type || '',
    item.title || '',
    item.summary || '',
  ].join('\x00').toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  groups[groupKey].push(item);
}

function assetSearchGroupKey(cardType = '') {
  const type = String(cardType || '');
  if (/知识节点|节点/.test(type)) return 'nodes';
  if (/素材/.test(type)) return 'materials';
  if (/金句/.test(type)) return 'quotes';
  if (/延展|方向|二创|下一篇/.test(type)) return 'directions';
  if (/写作指纹|创作者优势|优势/.test(type)) return 'fingerprints';
  return 'opinions';
}

function assetSearchArticleFields(rec = {}) {
  const a = rec.analysis || {};
  return [
    rec.article?.title,
    rec.article?.body,
    rec.article?.author,
    a.domain,
    a.sub_domain,
    a.perspective,
    a.core_claim,
    a.creator_strength,
    a.insight,
    ...(a.tags || []),
  ];
}

function collectAssetSearchResults(query, articles = [], clips = []) {
  const groups = {
    opinions: [],
    materials: [],
    nodes: [],
    fingerprints: [],
    quotes: [],
    directions: [],
  };
  const seen = new Set();

  for (const rec of articles) {
    const a = rec.analysis || {};
    const source = rec.article?.title || '（无标题）';
    const articleFields = assetSearchArticleFields(rec);
    const cards = normalizeAssetCards(a, { record: rec });

    for (const card of cards) {
      if (!assetSearchMatches(query, [
        ...articleFields,
        card.type,
        card.title,
        card.summary,
        card.source,
        card.whyReusable,
        ...(card.keywords || []),
      ])) continue;
      assetSearchPush(groups, seen, assetSearchGroupKey(card.type), {
        type: card.type,
        title: card.title,
        summary: card.summary,
        whyReusable: card.whyReusable,
        keywords: card.keywords || [],
        reuseScore: card.reuseScore,
        source,
        sourceArticleId: rec.id,
      });
    }

    for (const insight of a.essence_insights || []) {
      if (!assetSearchMatches(query, [...articleFields, insight.viewpoint, insight.why_essential])) continue;
      assetSearchPush(groups, seen, 'opinions', {
        type: '相关观点',
        title: insight.viewpoint || '作品立意',
        summary: insight.why_essential || a.core_claim || '',
        whyReusable: insight.why_essential || '这条立意可以作为下一篇文章的主判断继续展开。',
        keywords: compactTextList([a.domain, a.sub_domain, ...(a.tags || [])]),
        reuseScore: 5,
        source,
        sourceArticleId: rec.id,
      });
    }

    for (const clip of a.reusable_clips || []) {
      const isQuote = /金句|句子|表达/.test(String(clip.type || ''));
      if (!assetSearchMatches(query, [...articleFields, clip.type, clip.content, clip.why_reusable])) continue;
      assetSearchPush(groups, seen, isQuote ? 'quotes' : 'materials', {
        type: isQuote ? '可复用金句' : '相关素材',
        title: clip.content || '可复用素材',
        summary: clip.why_reusable || '',
        whyReusable: clip.why_reusable || '这条素材脱离原文后仍能支撑相近论证。',
        keywords: compactTextList([clip.type, a.domain, a.sub_domain, ...(a.tags || [])]),
        reuseScore: isQuote ? 4 : 5,
        source,
        sourceArticleId: rec.id,
      });
    }

    for (const node of recordNodeMentions(rec)) {
      if (!assetSearchMatches(query, [...articleFields, node.name, node.type, node.role, node.contribution])) continue;
      assetSearchPush(groups, seen, 'nodes', {
        type: '相关知识节点',
        title: node.name || '知识节点',
        summary: node.contribution || a.core_claim || '',
        whyReusable: '节点会把相近旧文连起来，适合继续围绕同一主题深挖。',
        keywords: compactTextList([TYPE_META[node.type]?.label || node.type, ROLE_MAP[node.role] || node.role]),
        reuseScore: node.role === 'primary' ? 5 : 4,
        source,
        sourceArticleId: rec.id,
      });
    }

    for (const suggestion of a.next_suggestions || []) {
      if (!assetSearchMatches(query, [...articleFields, suggestion.type, suggestion.suggestion, suggestion.reason, suggestion.theory_ref])) continue;
      assetSearchPush(groups, seen, 'directions', {
        type: '可延展方向',
        title: suggestion.suggestion || '下一篇方向',
        summary: suggestion.reason || '',
        whyReusable: '它把旧文章变成下一篇选题的入口。',
        keywords: compactTextList([suggestion.type, suggestion.theory_ref, a.domain, a.sub_domain]),
        reuseScore: 5,
        source,
        sourceArticleId: rec.id,
      });
    }

    if (assetSearchMatches(query, [...articleFields, a.creator_strength, a.insight])) {
      assetSearchPush(groups, seen, 'fingerprints', {
        type: '写作指纹',
        title: a.creator_strength || a.insight || '作品识别到的创作者优势',
        summary: a.insight || '这条线索会进入长期写作指纹，帮助创作者看见自己擅长什么。',
        whyReusable: '写作指纹可以帮助你选择更适合继续深耕的表达路线。',
        keywords: compactTextList([a.perspective, a.domain, a.sub_domain, ...(a.tags || [])]),
        reuseScore: 4,
        source,
        sourceArticleId: rec.id,
      });
    }
  }

  for (const clip of clips) {
    if (!assetSearchMatches(query, [clip.type, clip.content, clip.why_reusable, clip.source_article_title])) continue;
    assetSearchPush(groups, seen, clip.type === '立意' ? 'opinions' : 'materials', {
      type: clip.type === '立意' ? '相关观点' : '相关素材',
      title: clip.content || '资产片段',
      summary: clip.why_reusable || '',
      whyReusable: clip.why_reusable || '这条旧资产可以被带入下一篇文章。',
      keywords: compactTextList([clip.type]),
      reuseScore: clip.type === '立意' ? 5 : 4,
      source: clip.source_article_title || '未知作品',
      sourceArticleId: clip.source_article_id,
    });
  }

  return groups;
}

function assetSearchResultCard(item) {
  const keywords = compactTextList(item.keywords || []).slice(0, 5);
  const payload = assetCardPayload({
    type: item.type,
    title: item.title,
    summary: item.summary,
    source: item.source,
    keywords,
    whyReusable: item.whyReusable,
    reuseScore: item.reuseScore,
  });
  return `<div class="card">
    <div class="card-label">${esc(item.type || '旧资产')}</div>
    <div class="core-claim">${esc(item.title || '未命名资产')}</div>
    ${item.summary ? `<div class="field"><div class="field-label">AI 解释</div><div class="field-value">${esc(item.summary)}</div></div>` : ''}
    ${keywords.length ? `<div class="field"><div class="field-label">关键词</div><div class="tag-row">${tags(keywords)}</div></div>` : ''}
    ${item.whyReusable ? `<div class="field"><div class="field-label">为什么可复用</div><div class="field-value">${esc(item.whyReusable)}</div></div>` : ''}
    <div class="field"><div class="field-label">可复用指数</div><div class="field-value">${reuseStars(item.reuseScore)}</div></div>
    <div class="chat-templates">
      ${item.sourceArticleId ? `<button class="clip-source" type="button" data-search-source-article="${esc(item.sourceArticleId)}">来自《${esc(item.source || '未知作品')}》</button>` : ''}
      <button class="chat-template-btn" type="button" data-asset-remix="${esc(JSON.stringify(payload))}">用于新文章</button>
    </div>
  </div>`;
}

function assetSearchGroup(title, items = []) {
  const html = items.slice(0, 6).map(assetSearchResultCard).join('');
  return analysisGroup(`${title} · ${items.length}`, html);
}

function assetSearchChatText(groups) {
  return Object.values(groups).flat().slice(0, 12)
    .map(item => `${item.type}：${item.title}\n来源：${item.source || '未知作品'}\n可复用原因：${item.whyReusable || item.summary || '无'}`)
    .join('\n\n');
}

function assetSearchChatAnalysis(query, groups) {
  const allResults = Object.values(groups).flat();
  const all = allResults.slice(0, 10);
  return {
    domain: '旧文章复利',
    sub_domain: '资产搜索',
    core_claim: `搜索「${query}」找到 ${allResults.length} 条可复用旧资产。`,
    asset_cards: all.slice(0, 6).map(item => ({
      type: item.type,
      title: item.title,
      summary: item.summary,
      keywords: item.keywords,
      why_reusable: item.whyReusable,
      reuse_score: item.reuseScore,
      source_article: item.source,
    })),
    creator_strength: '你可以从过去写过的观点、素材和节点里继续生成下一篇文章，而不是重新从空白页开始。',
    reusable_clips: groups.materials.slice(0, 5).map(item => ({
      type: item.type,
      content: item.title,
      why_reusable: item.whyReusable || item.summary,
    })),
    essence_insights: groups.opinions.slice(0, 5).map(item => ({
      viewpoint: item.title,
      why_essential: item.whyReusable || item.summary,
    })),
    nodes_hit: groups.nodes.slice(0, 8).map(item => ({
      name: item.title,
      type: 'concept',
      role: 'secondary',
      contribution: item.summary || item.whyReusable,
    })),
    next_suggestions: groups.directions.slice(0, 4).map(item => ({
      type: item.type,
      suggestion: item.title,
      reason: item.summary || item.whyReusable,
    })),
    insight: `这次搜索说明「${query}」已经在你的作品资产中形成了可被再次调用的线索。`,
  };
}

async function loadAssetSearchResults(query) {
  const container = document.getElementById('assetsList');
  const q = String(query || '').trim();
  if (!container) return;
  if (!q) return loadCurrentAssetMode();
  container.innerHTML = `<div class="asset-empty">正在找回「${esc(q)}」相关旧资产…</div>`;

  const [allArticles, allClips] = await Promise.all([
    dbGetAllArticles({ project: activeProject }),
    dbGetClips({ project: activeProject }),
  ]);
  const dateParts = updateAssetDateFilterOptions([...allArticles, ...allClips], item => item.savedAt);
  const hasDate = hasAssetDateFilter(dateParts);
  const dateLabel = assetDateFilterLabel(dateParts);
  const articles = hasDate
    ? allArticles.filter(rec => matchesAssetDateFilter(rec.savedAt, dateParts))
    : allArticles;
  const clips = hasDate
    ? allClips.filter(clip => matchesAssetDateFilter(clip.savedAt, dateParts))
    : allClips;
  const groups = collectAssetSearchResults(q, articles, clips);
  const groupDefs = [
    ['opinions', '相关观点'],
    ['materials', '相关素材'],
    ['nodes', '相关知识节点'],
    ['fingerprints', '相关写作指纹'],
    ['quotes', '可复用金句'],
    ['directions', '可延展方向'],
  ];
  const total = groupDefs.reduce((sum, [key]) => sum + groups[key].length, 0);
  syncAssetSelectionScope('asset-search', []);

  if (!total) {
    container.innerHTML = `<div class="asset-empty">没有找到${dateLabel ? ` ${esc(dateLabel)} ` : ''}「${esc(q)}」相关旧资产<br>可以换一个观点、人物、素材或主题词再试</div>`;
    updateAssetSelectionUI();
    return;
  }

  const chatAnalysis = assetSearchChatAnalysis(q, groups);
  const chatId = createChatSession(chatAnalysis, JSON.stringify(chatAnalysis, null, 2), 'assetsList', {
    articleTitle: `旧资产搜索：${q}`,
    articleText: assetSearchChatText(groups),
    projectId: activeProject,
  });
  const summaryCard = `<div class="card">
    <div class="card-label">旧素材搜索</div>
    <div class="core-claim">你搜索了：${esc(q)}</div>
    <div class="field"><div class="field-label">找回结果</div><div class="field-value">找到 ${total} 个相关资产${dateLabel ? ` · ${esc(dateLabel)}` : ''}，可以继续复制、查看来源，或直接用于新文章。</div></div>
  </div>`;

  container.innerHTML = [
    analysisGroup('找回旧资产', summaryCard),
    ...groupDefs.map(([key, title]) => assetSearchGroup(title, groups[key])),
    analysisGroup('用这些旧资产继续写', cardChat(chatId)),
  ].join('');

  container.querySelectorAll('[data-search-source-article]').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.stopPropagation();
      const rec = await dbGetArticle(btn.dataset.searchSourceArticle);
      if (rec) showAssetDetail(rec);
    });
  });
  updateAssetSelectionUI();
}

// ── 我的资产列表 ─────────────────────────────────────────
async function loadAssets() {
  setAssetListMode('assets');
  const query    = document.getElementById('assetSearch')?.value.trim().toLowerCase() || '';
  let   articles = await dbGetAllArticles({ project: activeProject });
  const dateParts = updateAssetDateFilterOptions(articles, rec => rec.savedAt);
  const hasDate = hasAssetDateFilter(dateParts);
  const dateLabel = assetDateFilterLabel(dateParts);

  if (query) {
    articles = articles.filter(rec => {
      const a = rec.analysis || {};
      return [rec.article?.title, rec.article?.body, a.core_claim, a.domain, a.sub_domain, rec.article?.author, a.insight,
              ...(a.tags || [])]
        .some(s => s?.toLowerCase().includes(query));
    });
  }
  if (hasDate) {
    articles = articles.filter(rec => matchesAssetDateFilter(rec.savedAt, dateParts));
  }

  const container = document.getElementById('assetsList');
  const selectionItems = articles.map(rec => ({
    id: String(rec.id),
    kind: 'article',
    label: String(rec.article?.title || '（无标题）'),
    data: rec,
  }));
  syncAssetSelectionScope(assetListMode, selectionItems);

  if (!articles.length) {
    container.innerHTML = query || hasDate
      ? `<div class="asset-empty">没有找到${dateLabel ? ` ${esc(dateLabel)} ` : ''}${query ? `「${esc(query)}」相关的` : ''}记录</div>`
      : `<div class="asset-empty">还没有资产<br>切换到「分析」Tab，先分析文章或保存速记吧</div>`;
    updateAssetSelectionUI();
    return;
  }

  const typeLabel = { article: '专栏', answer: '回答', pin: '想法', manual: '手动', idea: '速记', zhihu_story: '知乎故事' };
  container.innerHTML = articles.map((rec, i) => {
    const a      = rec.analysis || {};
    const date   = (rec.savedAt || '').slice(0, 10);
    const domain = rec.article?.type === 'idea'
      ? '速记'
      : [a.domain, a.sub_domain].filter(Boolean).join(' · ');
    const type   = typeLabel[rec.article?.type] || '';
    const claim  = a.core_claim || (rec.article?.type === 'idea' ? rec.article?.body?.slice(0, 90) : '');
    return `
      <div class="asset-card selectable-asset-card${isAssetSelected(rec.id) ? ' selected' : ''}" data-idx="${i}" data-selectable-card data-asset-id="${esc(rec.id)}">
        <div class="asset-card-top">
          <span class="asset-domain">${esc(domain)}</span>
          <span class="asset-date">${esc(date)}${type ? ' · ' + type : ''}</span>
        </div>
        <div class="asset-title">${esc(rec.article?.title || '（无标题）')}</div>
        <div class="asset-claim">${esc(claim || '')}</div>
        ${assetSelectButtonHtml(rec.id, i)}
      </div>`;
  }).join('');

  container.querySelectorAll('.asset-card').forEach(card => {
    card.addEventListener('click', () => {
      showAssetDetail(articles[parseInt(card.dataset.idx)]);
    });
  });
  bindAssetSelection(container);
}

function buildNodeIndex(articles, projectNameById) {
  const byKey = {};
  for (const rec of articles) {
    for (const n of recordNodeMentions(rec)) {
      const key = String(n.name || '').trim().toLowerCase();
      if (!key) continue;
      if (!byKey[key]) {
        byKey[key] = {
          key,
          name: n.name,
          type: n.type,
          mentions: 0,
          articles: new Set(),
          projects: new Set(),
          roleCounts: {},
          lastSavedAt: '',
        };
      }
      const entry = byKey[key];
      entry.mentions++;
      entry.articles.add(rec.id);
      entry.projects.add(projectNameById[rec.project_id || 'default'] || rec.project_id || '默认项目');
      const role = n.role || 'background';
      entry.roleCounts[role] = (entry.roleCounts[role] || 0) + 1;
      if ((rec.savedAt || '') > entry.lastSavedAt) entry.lastSavedAt = rec.savedAt || '';
    }
  }
  return Object.values(byKey)
    .map(n => ({ ...n, articleCount: n.articles.size, projectNames: [...n.projects] }))
    .sort((a, b) =>
      b.projectNames.length - a.projectNames.length ||
      b.articleCount - a.articleCount ||
      b.mentions - a.mentions ||
      a.name.localeCompare(b.name, 'zh-Hans-CN')
    );
}

function recordNodeMentions(rec) {
  const analysis = rec.analysis || {};
  const direct = (analysis.nodes_hit || []).filter(n => n?.name);
  const directKeys = new Set(direct.map(n => String(n.name || '').trim().toLowerCase()));
  const linked = (analysis.wikilinks || [])
    .map(name => String(name || '').trim())
    .filter(Boolean)
    .filter(name => !directKeys.has(name.toLowerCase()))
    .map(name => ({ name, type: 'concept', role: 'linked', contribution: 'Markdown 链接' }));
  return [...direct, ...linked];
}

async function loadNodeIndex() {
  setAssetListMode('nodes');
  const query = document.getElementById('assetSearch')?.value.trim().toLowerCase() || '';
  const container = document.getElementById('assetsList');
  container.innerHTML = `<div class="asset-empty">正在读取节点库…</div>`;

  const [articles, projects] = await Promise.all([dbGetAllArticles(), dbGetProjects()]);
  const projectNameById = {};
  for (const p of projects) projectNameById[p.id] = p.name;

  let nodes = buildNodeIndex(articles, projectNameById);
  if (query) {
    nodes = nodes.filter(n => {
      const typeLabel = TYPE_META[n.type]?.label || n.type || '';
      return [n.name, typeLabel, ...n.projectNames]
        .some(s => String(s || '').toLowerCase().includes(query));
    });
  }

  if (!nodes.length) {
    container.innerHTML = query
      ? `<div class="asset-empty">没有找到「${esc(query)}」相关的节点</div>`
      : `<div class="asset-empty">还没有知识节点<br>分析文章后节点库会自动生成</div>`;
    return;
  }

  container.innerHTML = nodes.map((n, i) => {
    const roleHtml = Object.entries(n.roleCounts).map(([role, count]) =>
      `<span class="badge badge-${esc(role)}">${ROLE_MAP[role] || esc(role)} ×${count}</span>`
    ).join('');
    const projectHtml = n.projectNames.slice(0, 4)
      .map(name => `<span class="node-project-pill">${esc(name)}</span>`)
      .join('');
    const more = n.projectNames.length > 4 ? `<span class="node-project-pill">+${n.projectNames.length - 4}</span>` : '';
    return `
      <div class="asset-card node-index-card" data-idx="${i}">
        <div class="asset-card-top">
          <span class="asset-domain">节点库</span>
          <span class="asset-date">${n.articleCount} 篇 · ${n.projectNames.length} 项目</span>
        </div>
        <div class="asset-title">${esc(n.name)}</div>
        <div class="node-index-meta">
          <span class="badge badge-type">${TYPE_META[n.type]?.label || esc(n.type || '未知')}</span>
          ${roleHtml}
        </div>
        <div class="node-project-row">${projectHtml}${more}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.node-index-card').forEach(card => {
    card.addEventListener('click', () => {
      showNodeDetail(nodes[parseInt(card.dataset.idx)].name, 'nodes');
    });
  });
}

// ── 知识地图（数据准备 / 渲染 / 入口分离）────────────────
function dominantNodeRole(roleCounts = {}) {
  const order = ['primary', 'secondary', 'background'];
  return order.find(role => roleCounts[role]) || 'background';
}

function prepareMapData(articles, nodesArr) {
  const articleIds = new Set(articles.map(a => a.id));
  const roleByNode = {};

  for (const rec of articles) {
    for (const n of rec.analysis?.nodes_hit || []) {
      const key = n.name?.trim().toLowerCase();
      if (!key) continue;
      if (!roleByNode[key]) roleByNode[key] = {};
      const role = n.role || 'background';
      roleByNode[key][role] = (roleByNode[key][role] || 0) + 1;
    }
  }

  const nodes = nodesArr.map(n => ({
    id: n.id, name: n.name, type: n.type,
    count: n.articles.filter(id => articleIds.has(id)).length,
    role: dominantNodeRole(roleByNode[n.id]),
    roleCounts: roleByNode[n.id] || {},
  }));
  const linkMap = {};
  for (const rec of articles) {
    const names = (rec.analysis?.nodes_hit || []).map(n => n.name.trim().toLowerCase());
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join('\x00');
        linkMap[key] = (linkMap[key] || 0) + 1;
      }
    }
  }
  const links = Object.entries(linkMap).map(([key, value]) => {
    const [source, target] = key.split('\x00');
    return { source, target, value };
  });
  return { nodes, links };
}

function renderMapView(nodes, links, container, articles = []) {
  stopMapSimulation();
  renderEarthSphere(nodes, links, container, articles);
}

const EARTH_SPHERE_VIEW = { width: 720, height: 476, cx: 360, cy: 238, radius: 188 };
const EARTH_SPHERE_INITIAL_ZOOM = 0.84;
const EARTH_SPHERE_MIN_ZOOM = 0.62;
const EARTH_SPHERE_MAX_ZOOM = 2.35;
const EARTH_SPHERE_WHEEL_ZOOM_STEP = 0.11;
const EARTH_SPHERE_BUTTON_ZOOM_STEP = 0.16;
const EARTH_SPHERE_DEMO_POINT_COUNT = 180;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function earthNodeFill(node) {
  const lv = node?.lv || 1;
  if (lv >= 5) return '#fff6cf';
  if (lv >= 4) return '#f0cf76';
  if (lv >= 3) return '#c8a44a';
  if (lv >= 2) return '#7d735d';
  return '#4c4a42';
}

function earthNodeStrokeColor(node) {
  return 'none';
}

function earthNodeStrokeWidth(node) {
  return 0;
}

function earthNodeOpacity(node) {
  const lv = node?.lv || 1;
  return [0, 0.42, 0.58, 0.76, 0.9, 1][lv] || 0.42;
}

function earthNodeGlowFilter(node) {
  const lv = node?.lv || 1;
  if (lv >= 5) return 'url(#node-glow-strong)';
  if (lv >= 4) return 'url(#node-glow-mid)';
  if (lv >= 3) return 'url(#node-glow-soft)';
  return 'url(#node-glow-dim)';
}

function linkClass(link) {
  if (link?.kind === 'wikilink') return 'weak';
  if ((link?.value || 0) >= 3) return 'strong';
  if ((link?.value || 0) >= 1) return 'mid';
  return 'weak';
}

function earthLegendHtml() {
  return `
    <div class="map-legend-item">
      <svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--link-strong)" stroke-width="1.5"/></svg>
      <span>强连接（多次共现）</span>
    </div>
    <div class="map-legend-item">
      <svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--link-mid)" stroke-width="1.0"/></svg>
      <span>弱连接（共现 1 次）</span>
    </div>
    <div class="map-legend-item">
      <svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--link-weak)" stroke-width="0.8" stroke-dasharray="4,3"/></svg>
      <span>待点亮（仅 wikilink 引用）</span>
    </div>`;
}

function earthSphereDefsHtml() {
  return `
    <radialGradient id="rg-active" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="var(--node-active-inner)"/>
      <stop offset="100%" stop-color="var(--node-active-outer)"/>
    </radialGradient>
    <radialGradient id="rg-locked" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="var(--node-locked-inner)"/>
      <stop offset="100%" stop-color="var(--node-locked-outer)"/>
    </radialGradient>
    <radialGradient id="rg-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="var(--gold)" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="var(--gold)" stop-opacity="0"/>
    </radialGradient>
    <filter id="node-glow-dim" x="-260%" y="-260%" width="620%" height="620%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.4" flood-color="#7d735d" flood-opacity="0.22"/>
    </filter>
    <filter id="node-glow-soft" x="-260%" y="-260%" width="620%" height="620%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#c8a44a" flood-opacity="0.42"/>
    </filter>
    <filter id="node-glow-mid" x="-300%" y="-300%" width="700%" height="700%">
      <feDropShadow dx="0" dy="0" stdDeviation="3.4" flood-color="#e6c46a" flood-opacity="0.58"/>
      <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#c8a44a" flood-opacity="0.20"/>
    </filter>
    <filter id="node-glow-strong" x="-340%" y="-340%" width="780%" height="780%">
      <feDropShadow dx="0" dy="0" stdDeviation="3.8" flood-color="#fff6cf" flood-opacity="0.78"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#e6c46a" flood-opacity="0.34"/>
    </filter>`;
}

function universeDefsHtml() {
  return `${earthSphereDefsHtml()}
    <radialGradient id="universeBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#16223a"/>
      <stop offset="36%" stop-color="#09091b"/>
      <stop offset="100%" stop-color="#030206"/>
    </radialGradient>
    <radialGradient id="nebulaPurple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6e5fd6" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#783cb4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nebulaGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f0d58a" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#c8a44a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="galaxyCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6dc" stop-opacity="0.96"/>
      <stop offset="20%" stop-color="#f2d8a8" stop-opacity="0.54"/>
      <stop offset="58%" stop-color="#79a8dd" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#10263f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="galaxyBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8fc6ff" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#24415f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="galaxyArmGold" x1="110" y1="380" x2="610" y2="92" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#9ccfff" stop-opacity="0"/>
      <stop offset="32%" stop-color="#d7b967" stop-opacity="0.16"/>
      <stop offset="50%" stop-color="#fff2bd" stop-opacity="0.34"/>
      <stop offset="72%" stop-color="#d7b967" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#7ea6d8" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="galaxyArmBlue" x1="110" y1="110" x2="620" y2="390" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#5a66c8" stop-opacity="0"/>
      <stop offset="38%" stop-color="#8cc9ff" stop-opacity="0.14"/>
      <stop offset="58%" stop-color="#d8efff" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#5a66c8" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="planetAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f4d784" stop-opacity="0.58"/>
      <stop offset="42%" stop-color="#e4b95a" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#c8a44a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="planetCore" cx="42%" cy="36%" r="70%">
      <stop offset="0%" stop-color="#fffbe9"/>
      <stop offset="30%" stop-color="#f5d877"/>
      <stop offset="72%" stop-color="#ba842a"/>
      <stop offset="100%" stop-color="#6f4211"/>
    </radialGradient>
    <radialGradient id="planetLockedCore" cx="42%" cy="36%" r="64%">
      <stop offset="0%" stop-color="#fffdf1"/>
      <stop offset="28%" stop-color="#ffe38a"/>
      <stop offset="72%" stop-color="#9f6e22"/>
      <stop offset="100%" stop-color="#241606"/>
    </radialGradient>
    <filter id="galaxySoftBlur"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="ballGlowFilter"><feGaussianBlur stdDeviation="2.6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

function normalizeUniverseDomain(domain) {
  return String(domain || '').trim() || '未分类';
}

function prepareUniverseBalls(articles, mode = 'domain', projectNameById = {}) {
  const groups = {};
  for (const rec of articles || []) {
    const key = mode === 'project'
      ? (rec.project_id || 'default')
      : normalizeUniverseDomain(rec.analysis?.domain);
    const name = mode === 'project'
      ? (projectNameById[key] || key)
      : key;
    if (!groups[key]) {
      groups[key] = { ballId: key, name, articles: [], nodeNames: new Set() };
    }
    groups[key].articles.push(rec);
    for (const n of recordNodeMentions(rec)) {
      const name = String(n.name || '').trim();
      if (name) groups[key].nodeNames.add(name);
    }
  }
  return Object.values(groups)
    .map(g => ({
      ballId: g.ballId,
      name: g.name,
      articleCount: g.articles.length,
      nodeCount: g.nodeNames.size,
      nodeNames: g.nodeNames,
      articles: g.articles,
    }))
    .sort((a, b) => b.articleCount - a.articleCount || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function findCrossBallLinks(balls) {
  const links = [];
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const shared = [...balls[i].nodeNames].filter(name => balls[j].nodeNames.has(name));
      if (shared.length) {
        links.push({
          source: balls[i].ballId,
          target: balls[j].ballId,
          count: shared.length,
          shared,
        });
      }
    }
  }
  return links;
}

function articlesForUniverseBall(articles, mode, ballId) {
  return (articles || []).filter(rec => {
    if (mode === 'project') return (rec.project_id || 'default') === ballId;
    return normalizeUniverseDomain(rec.analysis?.domain) === ballId;
  });
}

function normalizeMapState(state = {}) {
  return {
    mapView: state.mapView === 'universe' ? 'universe' : 'single',
    universeMode: state.universeMode === 'project' ? 'project' : 'domain',
    activeBallId: state.activeBallId || null,
  };
}

async function loadMapState() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
  const data = await chrome.storage.local.get(MAP_STATE_KEY);
  if (!data?.[MAP_STATE_KEY]) return false;
  const normalized = normalizeMapState(data[MAP_STATE_KEY]);
  mapView = normalized.mapView;
  universeMode = normalized.universeMode;
  activeBallId = normalized.activeBallId;
  return true;
}

async function saveMapState() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({
    [MAP_STATE_KEY]: normalizeMapState({ mapView, universeMode, activeBallId }),
  });
}

function hashUnit(seed) {
  let h = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function hashSigned(seed) {
  return hashUnit(seed) * 2 - 1;
}

function hashNormal(seed, spread = 1) {
  const u = Math.max(0.0001, hashUnit(`${seed}-u`));
  const v = hashUnit(`${seed}-v`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v) * spread;
}

function normalizeUniverseAngle(value) {
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(value) <= UNIVERSE_FULL_ROTATION) return value;
  return ((((value + Math.PI) % UNIVERSE_FULL_ROTATION) + UNIVERSE_FULL_ROTATION) % UNIVERSE_FULL_ROTATION) - Math.PI;
}

function smoothUniverseAngle(current, target, amount) {
  return normalizeUniverseAngle(current + normalizeUniverseAngle(target - current) * amount);
}

function universePoint(index, total) {
  const t = (index + 0.5) / Math.max(1, total);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const arm = index % 4;
  const angle = index * golden * 0.88 + arm * Math.PI / 2;
  const r = 54 + Math.sqrt(t) * (total > 12 ? 286 : 252);
  const wobble = (hashUnit(`planet-wobble-${index}-${total}`) - 0.5) * 28;
  const galaxyTilt = -24 * Math.PI / 180;
  const x0 = (r + wobble) * Math.cos(angle);
  const y0 = (r * 0.36 + wobble * 0.22) * Math.sin(angle);
  const depth = 0.38 + hashUnit(`planet-depth-${index}-${total}`) * 0.62;
  return {
    x: 360 + x0 * Math.cos(galaxyTilt) - y0 * Math.sin(galaxyTilt),
    y: 238 + x0 * Math.sin(galaxyTilt) + y0 * Math.cos(galaxyTilt),
    depth,
  };
}

function renderStars(layer, count = 560) {
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const x = hashUnit(`star-x-${i}`) * EARTH_SPHERE_VIEW.width;
    const y = hashUnit(`star-y-${i}`) * EARTH_SPHERE_VIEW.height;
    const bright = hashUnit(`star-bright-${i}`);
    layer.appendChild(svgEl('circle', {
      class: bright > 0.82 ? 'universe-star bright' : 'universe-star',
      cx: x.toFixed(2),
      cy: y.toFixed(2),
      r: (0.25 + hashUnit(`star-size-${i}`) * (bright > 0.92 ? 1.8 : 0.95)).toFixed(2),
      fill: bright > 0.86 ? '#ffffff' : (bright > 0.66 ? '#e8f3ff' : 'var(--gold-light)'),
      opacity: (0.18 + bright * 0.62).toFixed(2),
    }));
  }
}

function galaxyArmPath(turnSeed = 0, radiusStart = 18, radiusEnd = 360, direction = 1) {
  const tilt = -24 * Math.PI / 180;
  const points = [];
  for (let i = 0; i <= 88; i++) {
    const t = i / 88;
    const angle = direction * (turnSeed + 0.5 + t * 5.8);
    const r = radiusStart + radiusEnd * Math.pow(t, 0.76);
    const wave = Math.sin(t * Math.PI * 3 + turnSeed) * 12 * (1 - t * 0.35);
    const x0 = (r + wave) * Math.cos(angle);
    const y0 = (r * 0.30 + wave * 0.15) * Math.sin(angle);
    const x = 360 + x0 * Math.cos(tilt) - y0 * Math.sin(tilt);
    const y = 238 + x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
    points.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

function renderGalaxyArms(layer) {
  if (!layer) return;
  layer.innerHTML = '';
  const arms = [
    { className: 'galaxy-arm galaxy-arm-gold soft', d: galaxyArmPath(0.08, 10, 338, 1), width: 34 },
    { className: 'galaxy-arm galaxy-arm-blue soft', d: galaxyArmPath(3.16, 12, 330, 1), width: 30 },
    { className: 'galaxy-arm galaxy-arm-gold crisp', d: galaxyArmPath(1.78, 16, 318, -1), width: 13 },
    { className: 'galaxy-arm galaxy-arm-blue crisp', d: galaxyArmPath(4.62, 20, 300, -1), width: 11 },
  ];
  arms.forEach(arm => {
    layer.appendChild(svgEl('path', {
      class: arm.className,
      d: arm.d,
      'stroke-width': arm.width,
    }));
  });
}

function renderGalaxyDust(layer, count = 520) {
  if (!layer) return;
  layer.innerHTML = '';
  const tilt = -24 * Math.PI / 180;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const arm = i % 2 ? 1 : -1;
    const t = (i + 0.5) / count;
    const angle = arm * (0.58 + t * 5.9) + i * golden * 0.08;
    const r = 28 + t * 332 + (hashUnit(`dust-r-${i}`) - 0.5) * 30;
    const x0 = r * Math.cos(angle);
    const y0 = r * 0.30 * Math.sin(angle);
    const cx = 360 + x0 * Math.cos(tilt) - y0 * Math.sin(tilt);
    const cy = 238 + x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
    layer.appendChild(svgEl('circle', {
      class: 'galaxy-dust-star',
      cx: cx.toFixed(2),
      cy: cy.toFixed(2),
      r: (0.28 + hashUnit(`dust-size-${i}`) * 1.55).toFixed(2),
      fill: hashUnit(`dust-color-${i}`) > 0.70 ? '#fff4c9' : '#9ccfff',
      opacity: (0.12 + hashUnit(`dust-opacity-${i}`) * 0.52).toFixed(2),
    }));
  }
}

function universeBallVisual(ball, maxArticleCount = 1) {
  const ratio = Math.min(1, Math.sqrt((ball.articleCount || 0) / Math.max(1, maxArticleCount)));
  return {
    radius: Number((1.9 + ratio * 4.6).toFixed(1)),
    glowRadius: Math.round(10 + ratio * 25),
    glowOpacity: Number((0.26 + ratio * 0.62).toFixed(2)),
    strokeWidth: Number((0.16 + ratio * 0.42).toFixed(2)),
    labelSize: Math.round(6.5 + ratio * 2),
    intensity: ratio,
  };
}

function resolveUniverseLockBallId(articles, balls, mode, projectId = activeProject) {
  if (activeBallId && balls.some(ball => ball.ballId === activeBallId)) return activeBallId;
  return null;
}

function renderUniverseBalls(balls, layer, onBallClick = lockUniverseBall, lockedBallId = null) {
  if (!layer) return;
  layer.innerHTML = '';
  const maxArticleCount = Math.max(1, ...balls.map(ball => ball.articleCount || 0));
  const ordered = balls
    .map((ball, index) => ({ ball, index }))
    .sort((a, b) => (a.ball.ballId === lockedBallId ? 1 : 0) - (b.ball.ballId === lockedBallId ? 1 : 0));
  ordered.forEach(({ ball, index }) => {
    const point = universePoint(index, balls.length);
    const visual = universeBallVisual(ball, maxArticleCount);
    const size = visual.radius;
    const locked = ball.ballId === lockedBallId;
    ball._x = point.x;
    ball._y = point.y;
    ball._depth = point.depth;
    ball._size = size;
    ball._visual = visual;

    const group = svgEl('g', {
      class: `universe-ball${locked ? ' locked' : ''}`,
      tabindex: '0',
      'data-ball-id': ball.ballId,
      transform: `translate(${point.x},${point.y}) scale(1)`,
    });
    const titleEl = svgEl('title');
    titleEl.textContent = `${ball.name}：${ball.articleCount} 篇，${ball.nodeCount} 节点`;
    group.appendChild(titleEl);

    group.appendChild(svgEl('circle', {
      class: 'universe-ball-glow',
      cx: 0,
      cy: 0,
      r: visual.glowRadius,
      fill: 'url(#planetAura)',
      opacity: visual.glowOpacity,
      'pointer-events': 'none',
    }));
    group.appendChild(svgEl('circle', {
      class: 'universe-ball-atmosphere',
      cx: 0,
      cy: 0,
      r: (size + 1.7).toFixed(2),
      opacity: (0.20 + visual.intensity * 0.32).toFixed(2),
      'pointer-events': 'none',
    }));
    const core = svgEl('circle', {
      class: 'universe-ball-core',
      cx: 0,
      cy: 0,
      r: size,
      fill: locked ? 'url(#planetLockedCore)' : 'url(#planetCore)',
      stroke: locked ? 'var(--gold-light)' : 'var(--gold)',
      'stroke-width': locked ? visual.strokeWidth + 0.55 : visual.strokeWidth,
      filter: 'url(#ballGlowFilter)',
    });
    group.appendChild(core);
    group.appendChild(svgEl('circle', {
      class: 'universe-ball-spark',
      cx: -size * 0.28,
      cy: -size * 0.32,
      r: Math.max(1.1, size * 0.22).toFixed(2),
      fill: '#fffdf0',
      opacity: (0.46 + visual.intensity * 0.38).toFixed(2),
      'pointer-events': 'none',
    }));

    const title = svgEl('text', {
      class: 'universe-ball-label',
      x: 0,
      y: size + 18,
      'font-size': visual.labelSize,
    });
    title.textContent = ball.name;
    group.appendChild(title);

    const meta = svgEl('text', {
      class: 'universe-ball-meta',
      x: 0,
      y: size + 32,
      'font-size': Math.max(5.5, visual.labelSize - 1.5).toFixed(1),
    });
    meta.textContent = `${ball.articleCount} 篇 · ${ball.nodeCount} 节点`;
    group.appendChild(meta);

    const focus = () => {
      group.setAttribute('transform', `translate(${point.x},${point.y}) scale(${locked ? 2.18 : 1.72})`);
      core.setAttribute('stroke', 'var(--gold-light)');
      core.setAttribute('stroke-width', String(visual.strokeWidth + 0.65));
    };
    const blur = () => {
      group.setAttribute('transform', `translate(${point.x},${point.y}) scale(${locked ? 2.06 : 1})`);
      core.setAttribute('stroke', locked ? 'var(--gold-light)' : 'var(--gold)');
      core.setAttribute('stroke-width', String(locked ? visual.strokeWidth + 0.55 : visual.strokeWidth));
    };
    group.addEventListener('pointerenter', focus);
    group.addEventListener('pointerleave', blur);
    group.addEventListener('focus', focus);
    group.addEventListener('blur', blur);
    group.addEventListener('click', () => onBallClick(ball));
    group.addEventListener('dblclick', () => enterUniverseBall(ball));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onBallClick(ball);
      }
    });

    layer.appendChild(group);
    if (locked) blur();
  });
}

function renderBallLinks(links, balls, layer) {
  if (!layer) return;
  layer.innerHTML = '';
  const byId = Object.fromEntries(balls.map(ball => [ball.ballId, ball]));
  links.forEach(link => {
    const source = byId[link.source];
    const target = byId[link.target];
    if (!source || !target) return;
    layer.appendChild(svgEl('line', {
      class: 'universe-link',
      x1: source._x,
      y1: source._y,
      x2: target._x,
      y2: target._y,
      'stroke-width': Math.min(2, 0.6 + link.count * 0.2).toFixed(2),
    }));
  });
}

function projectSpherePoint(rotated, zoom = 1) {
  const depth = (rotated.z + 1) / 2;
  const perspective = 0.7 + depth * 0.34;
  const r = EARTH_SPHERE_VIEW.radius * zoom;
  return {
    x: EARTH_SPHERE_VIEW.cx + rotated.x * r * perspective,
    y: EARTH_SPHERE_VIEW.cy + rotated.y * r * perspective,
    z: rotated.z,
    depth,
    scale: (0.42 + depth * 0.72) * zoom,
    opacity: (rotated.z < 0 ? 0.5 : 1) * (0.35 + depth * 0.65),
  };
}

function renderSphereShell(layer) {
  if (!layer) return;
  layer.innerHTML = '';
}

function buildEarthSphereNodes(nodes) {
  const ordered = [...nodes].sort((a, b) => String(a.id || a.name).localeCompare(String(b.id || b.name)));
  return ordered.map((node, slot) => {
    const base = sphereVectorForSeed(node.name, ordered.length, slot);
    const lv = nodeBrightnessLevel(node);
    const visual = nodeBrightnessVisual(lv);
    return {
      ...node,
      base,
      view: base,
      slot,
      lv,
      visual,
      projected: projectSpherePoint(base),
    };
  });
}

function buildEarthSphereDemoPoints(count = EARTH_SPHERE_DEMO_POINT_COUNT) {
  return Array.from({ length: count }, (_, slot) => {
    const base = sphereVectorForSeed(`demo-sphere-${slot}`, count, slot);
    const bright = hashUnit(`demo-sphere-bright-${slot}`);
    return {
      id: `demo-${slot}`,
      base,
      view: base,
      slot,
      radius: 1.05 + bright * 2.35 + (slot % 23 === 0 ? 0.9 : 0),
      opacity: 0.24 + bright * 0.62,
      color: bright > 0.82 ? '#fff7cf' : bright > 0.52 ? '#e6c46a' : bright > 0.28 ? '#9a8350' : '#5d594d',
      filter: bright > 0.82 ? 'url(#node-glow-strong)' : bright > 0.52 ? 'url(#node-glow-mid)' : bright > 0.28 ? 'url(#node-glow-soft)' : 'url(#node-glow-dim)',
      projected: projectSpherePoint(base),
    };
  });
}

function syncEarthSphereDemoVisibility(state) {
  if (!state) return;
  if (state.linkLayer) state.linkLayer.style.display = state.demoEnabled ? 'none' : '';
  if (state.nodeLayer) state.nodeLayer.style.display = state.demoEnabled ? 'none' : '';
}

function renderEarthSphereDemoFill(state) {
  if (!state?.demoLayer) return;
  syncEarthSphereDemoVisibility(state);
  state.demoLayer.innerHTML = '';
  state.demoElements = {};
  if (!state.demoEnabled) return;

  state.demoPoints.forEach(point => {
    const group = svgEl('g', {
      class: 'sphere-demo-node',
      'aria-hidden': 'true',
      'data-demo-id': point.id,
    });
    group.appendChild(svgEl('circle', {
      class: 'sphere-demo-core',
      cx: 0,
      cy: 0,
      r: point.radius.toFixed(2),
      fill: point.color,
      opacity: point.opacity.toFixed(2),
      filter: point.filter,
    }));
    state.demoLayer.appendChild(group);
    state.demoElements[point.id] = group;
  });
}

function renderEarthSphere(nodes, links, container, articles = []) {
  const earthNodes = buildEarthSphereNodes(nodes);
  const demoPoints = buildEarthSphereDemoPoints();
  const nodeById = Object.fromEntries(earthNodes.map(n => [n.id, n]));
  const staticLinks = links.map(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return { source: nodeById[sourceId], target: nodeById[targetId], value: l.value };
  }).filter(l => l.source && l.target);

  container.innerHTML = `
    <div class="graph-area">
      <div class="map-tools" aria-label="地图工具">
        <button class="map-tool" id="earthZoomOutBtn" type="button">缩小</button>
        <button class="map-tool" id="earthZoomInBtn" type="button">放大</button>
        <button class="map-tool" id="earthResetBtn" type="button">回到中心</button>
        <button class="map-tool ${earthSphereDemoFillEnabled ? 'active' : ''}" id="earthDemoFillBtn" type="button">${earthSphereDemoFillEnabled ? '关闭演示' : '演示星球'}</button>
        <button class="map-tool" id="enterUniverseBtn" type="button">进入宇宙</button>
      </div>
      <button class="map-node-fab" id="mapNodeIndexBtn" type="button">全局节点</button>
      <div class="map-hint" id="mapHint">在节点上停留 1 秒查看关联文章；点击节点聚焦；按住空白处拖动可旋转球</div>
      <div class="node-hover-card" id="nodeHoverCard"></div>
      <svg id="earthSphere" viewBox="0 0 ${EARTH_SPHERE_VIEW.width} ${EARTH_SPHERE_VIEW.height}" aria-label="3D 认知地球">
        <defs>
          ${earthSphereDefsHtml()}
        </defs>
        <g id="sphereShell"></g>
        <ellipse id="mapGlow" cx="${EARTH_SPHERE_VIEW.cx}" cy="${EARTH_SPHERE_VIEW.cy}" rx="120" ry="90" fill="url(#rg-glow)" opacity="0.5"/>
        <g id="sphereDemoNodes"></g>
        <g id="sphereLinks"></g>
        <g id="sphereNodes"></g>
      </svg>
    </div>
    <div class="earth-status">
      <span>3D 认知地球 · Fibonacci 均匀排布</span>
      <span>${earthNodes.length} 个节点 / ${staticLinks.length} 条连接</span>
    </div>
    <div class="map-legend">${earthLegendHtml()}</div>
  `;

  const svg = container.querySelector('#earthSphere');
  const shellLayer = container.querySelector('#sphereShell');
  const demoLayer = container.querySelector('#sphereDemoNodes');
  const linkLayer = container.querySelector('#sphereLinks');
  const nodeLayer = container.querySelector('#sphereNodes');
  const linkElements = [];
  const nodeElements = {};
  renderSphereShell(shellLayer);

  staticLinks.forEach((link, index) => {
    const line = svgEl('line', {
      class: `sphere-link sphere-link-${linkClass(link)}`,
      'data-source': link.source.id,
      'data-target': link.target.id,
    });
    line.id = `earth-link-${index}`;
    linkLayer.appendChild(line);
    linkElements[index] = line;
  });

  earthNodes.forEach(node => {
    const group = svgEl('g', { class: 'sphere-node', tabindex: '0' });
    group.dataset.id = node.id;
    group.dataset.name = node.name;
    const { radius } = node.visual;

    group.appendChild(svgEl('circle', {
      class: 'sphere-node-core',
      cx: 0,
      cy: 0,
      r: radius,
      fill: earthNodeFill(node),
      stroke: earthNodeStrokeColor(node),
      'stroke-width': earthNodeStrokeWidth(node),
      opacity: earthNodeOpacity(node),
      filter: earthNodeGlowFilter(node),
    }));

    const showLabel = earthNodes.length <= 35
      || (earthNodes.length <= 70 && (node.lv >= 4 || node.role === 'primary'))
      || node.lv >= 5;
    if (showLabel) {
      const label = svgEl('text', {
        class: 'sphere-node-label',
        x: 0,
        y: radius + 13,
      });
      label.textContent = node.name;
      group.appendChild(label);
    }

    group.addEventListener('pointerenter', event => scheduleShowNodeHoverCard(node.name, event));
    group.addEventListener('pointermove', event => trackNodeHoverCard(node.name, event));
    group.addEventListener('pointerleave', () => scheduleHideNodeHoverCard(180));
    group.addEventListener('click', event => {
      event.stopPropagation();
      hideNodeHoverCard();
      openNodeDetailFromMap(node.name);
    });
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        hideNodeHoverCard();
        openNodeDetailFromMap(node.name);
      }
    });
    nodeLayer.appendChild(group);
    nodeElements[node.id] = group;
  });

  earthSphereState = {
    svg, earthNodes, demoPoints, nodeById, demoLayer, demoElements: {}, linkLayer, nodeLayer, nodeElements, linkElements,
    staticLinks, articles, hoverArticles: [], zoom: EARTH_SPHERE_INITIAL_ZOOM, drag: null,
    demoEnabled: earthSphereDemoFillEnabled,
    autoFrame: null, lastAutoRotateTs: 0, autoPausedUntil: 0,
  };
  renderEarthSphereDemoFill(earthSphereState);

  const updatePositions = () => updateEarthSpherePositions(earthSphereState, staticLinks);
  updatePositions();
  bindNodeHoverCard();

  svg.addEventListener('pointerdown', event => startEarthSphereDrag(event, updatePositions));
  svg.addEventListener('wheel', event => {
    event.preventDefault();
    hideNodeHoverCard();
    setEarthSphereZoom(event.deltaY > 0 ? -EARTH_SPHERE_WHEEL_ZOOM_STEP : EARTH_SPHERE_WHEEL_ZOOM_STEP);
  }, { passive: false });
  container.querySelector('#earthZoomOutBtn')?.addEventListener('click', () => setEarthSphereZoom(-EARTH_SPHERE_BUTTON_ZOOM_STEP));
  container.querySelector('#earthZoomInBtn')?.addEventListener('click', () => setEarthSphereZoom(EARTH_SPHERE_BUTTON_ZOOM_STEP));
  container.querySelector('#earthResetBtn')?.addEventListener('click', resetEarthSphereView);
  container.querySelector('#earthDemoFillBtn')?.addEventListener('click', () => setEarthSphereDemoFill(!earthSphereDemoFillEnabled));
  container.querySelector('#enterUniverseBtn')?.addEventListener('click', enterUniverseView);
  container.querySelector('#mapNodeIndexBtn')?.addEventListener('click', () => {
    switchTab('assets', { skipLoad: true });
    loadNodeIndex();
  });
  startEarthSphereAutoRotate();
}

async function enterUniverseView() {
  mapView = 'universe';
  activeBallId = null;
  await saveMapState();
  loadMap();
}

async function lockUniverseBall(ball) {
  if (activeBallId === ball.ballId) {
    await enterUniverseBall(ball);
    return;
  }
  activeBallId = ball.ballId;
  await saveMapState();
  loadMap();
  maybeShowMapLightModeHint();
}

async function enterUniverseBall(ball) {
  activeBallId = ball.ballId;
  mapView = 'single';
  await saveMapState();
  loadMap();
}

async function setUniverseMode(mode) {
  universeMode = mode === 'project' ? 'project' : 'domain';
  activeBallId = null;
  await saveMapState();
  loadMap();
}

function stopUniverseScene() {
  const state = universeSceneState;
  if (!state) return;
  if (state.frame) cancelAnimationFrame(state.frame);
  if (state.resizeHandler) window.removeEventListener('resize', state.resizeHandler);
  if (state.renderer) {
    state.renderer.dispose();
    state.renderer.domElement?.remove();
  }
  universeSceneState = null;
}

function universeTexture(kind = 'star') {
  const size = kind === 'core' ? 384 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  if (kind === 'core') {
    gradient.addColorStop(0, 'rgba(255,252,232,0.98)');
    gradient.addColorStop(0.16, 'rgba(255,232,150,0.82)');
    gradient.addColorStop(0.36, 'rgba(126,72,168,0.20)');
    gradient.addColorStop(1, 'rgba(28,10,48,0)');
  } else {
    gradient.addColorStop(0, 'rgba(255,255,245,1)');
    gradient.addColorStop(0.18, 'rgba(255,222,116,.95)');
    gradient.addColorStop(0.42, 'rgba(230,181,70,.38)');
    gradient.addColorStop(1, 'rgba(230,181,70,0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function universePlanetTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const r = size * 0.39;

  const atmosphere = ctx.createRadialGradient(center, center, r * 0.78, center, center, r * 1.38);
  atmosphere.addColorStop(0, 'rgba(255,218,126,0.34)');
  atmosphere.addColorStop(0.42, 'rgba(128,64,172,0.18)');
  atmosphere.addColorStop(1, 'rgba(18,8,32,0)');
  ctx.fillStyle = atmosphere;
  ctx.beginPath();
  ctx.arc(center, center, r * 1.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, r, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(center - r * 0.40, center - r * 0.42, r * 0.04, center + r * 0.22, center + r * 0.18, r * 1.24);
  body.addColorStop(0, 'rgba(255,238,177,1)');
  body.addColorStop(0.24, 'rgba(245,178,82,1)');
  body.addColorStop(0.52, 'rgba(185,88,138,1)');
  body.addColorStop(0.82, 'rgba(86,38,112,0.99)');
  body.addColorStop(1, 'rgba(14,7,28,1)');
  ctx.fillStyle = body;
  ctx.fillRect(center - r, center - r, r * 2, r * 2);

  for (let i = 0; i < 34; i++) {
    const y = center - r * 0.62 + hashUnit(`planet-band-y-${i}`) * r * 1.25;
    const width = r * (1.10 + hashUnit(`planet-band-w-${i}`) * 0.78);
    const alpha = 0.035 + hashUnit(`planet-band-a-${i}`) * 0.07;
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(255,207,103,${alpha})`
      : `rgba(111,56,144,${alpha})`;
    ctx.lineWidth = 1 + hashUnit(`planet-band-l-${i}`) * 2.1;
    ctx.beginPath();
    ctx.ellipse(center + hashNormal(`planet-band-x-${i}`, r * 0.10), y, width, r * (0.05 + hashUnit(`planet-band-h-${i}`) * 0.06), hashNormal(`planet-band-rot-${i}`, 0.18), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 90; i++) {
    const angle = hashUnit(`planet-speck-angle-${i}`) * Math.PI * 2;
    const rr = Math.sqrt(hashUnit(`planet-speck-r-${i}`)) * r * 0.86;
    const x = center + Math.cos(angle) * rr;
    const y = center + Math.sin(angle) * rr;
    const alpha = 0.035 + hashUnit(`planet-speck-a-${i}`) * 0.10;
    ctx.fillStyle = i % 4 === 0 ? `rgba(255,224,150,${alpha})` : `rgba(88,42,118,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + hashUnit(`planet-speck-s-${i}`) * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  const shade = ctx.createRadialGradient(center + r * 0.46, center + r * 0.42, r * 0.10, center + r * 0.18, center + r * 0.20, r * 1.18);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.52, 'rgba(0,0,0,0.16)');
  shade.addColorStop(1, 'rgba(0,0,0,0.74)');
  ctx.fillStyle = shade;
  ctx.fillRect(center - r, center - r, r * 2, r * 2);
  ctx.restore();

  const limb = ctx.createRadialGradient(center - r * 0.10, center - r * 0.12, r * 0.72, center, center, r * 1.02);
  limb.addColorStop(0, 'rgba(255,255,255,0)');
  limb.addColorStop(0.72, 'rgba(255,226,142,0.04)');
  limb.addColorStop(0.92, 'rgba(255,213,111,0.34)');
  limb.addColorStop(1, 'rgba(255,213,111,0)');
  ctx.fillStyle = limb;
  ctx.beginPath();
  ctx.arc(center, center, r * 1.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,219,136,0.46)';
  ctx.lineWidth = size * 0.006;
  ctx.beginPath();
  ctx.arc(center, center, r * 0.995, 0, Math.PI * 2);
  ctx.stroke();

  const edge = ctx.createRadialGradient(center, center, r * 0.82, center, center, r * 1.04);
  edge.addColorStop(0, 'rgba(255,255,255,0)');
  edge.addColorStop(0.72, 'rgba(255,206,108,0.30)');
  edge.addColorStop(1, 'rgba(255,206,108,0)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(center, center, r * 1.04, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.userData = { kind: 'planet', palette: 'purple-black-gold' };
  texture.needsUpdate = true;
  return texture;
}

function collectUniversePreviewNodes(ball) {
  const byName = {};
  const addNode = (name, type = 'concept', role = 'linked', weight = 1) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!byName[key]) {
      byName[key] = {
        id: key,
        name: clean,
        type,
        role,
        count: 0,
      };
    }
    byName[key].count += weight;
    if (role === 'primary') byName[key].role = 'primary';
  };
  for (const rec of ball?.articles || []) {
    for (const n of recordNodeMentions(rec)) {
      addNode(n.name, n.type || 'concept', n.role || 'linked', 1);
    }
    for (const name of rec.analysis?.new_concepts || []) addNode(name, 'concept', 'linked', 0.65);
    for (const name of rec.analysis?.tags || []) addNode(name, 'tag', 'linked', 0.45);
  }
  return Object.values(byName)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function paintPreviewDot(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.2);
  gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
  gradient.addColorStop(0.34, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.38})`);
  gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${Math.min(255, color[0] + 22)},${Math.min(255, color[1] + 20)},${Math.min(255, color[2] + 12)},${Math.min(1, alpha * 1.12)})`;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.8, radius * 0.72), 0, Math.PI * 2);
  ctx.fill();
}

function universeKnowledgePreviewTexture(ball) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const r = size * 0.36;
  const nodes = collectUniversePreviewNodes(ball);
  const maxCount = Math.max(1, ...nodes.map(n => n.count || 0));
  const labelNodes = nodes.slice(0, Math.min(10, nodes.length));

  const aura = ctx.createRadialGradient(center, center, r * 0.14, center, center, r * 1.52);
  aura.addColorStop(0, 'rgba(255,226,142,0.012)');
  aura.addColorStop(0.50, 'rgba(98,48,140,0.036)');
  aura.addColorStop(0.82, 'rgba(255,205,101,0.058)');
  aura.addColorStop(1, 'rgba(255,205,101,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(center, center, r * 1.52, 0, Math.PI * 2);
  ctx.fill();

  const surface = ctx.createRadialGradient(center - r * 0.14, center - r * 0.20, r * 0.16, center, center, r * 1.02);
  surface.addColorStop(0, 'rgba(255,232,164,0.020)');
  surface.addColorStop(0.50, 'rgba(55,34,72,0.030)');
  surface.addColorStop(1, 'rgba(4,3,8,0)');
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(center, center, r, 0, Math.PI * 2);
  ctx.fill();

  const viewAxisY = { x: 0, y: 1, z: 0 };
  const viewAxisX = { x: 1, y: 0, z: 0 };
  const rotatePreview = point => rotateAroundAxis(
    rotateAroundAxis(point, viewAxisY, 0.58),
    viewAxisX,
    -0.20
  );

  const ghostCount = Math.max(96, Math.min(220, nodes.length * 7 || 120));
  const dots = [];
  for (let i = 0; i < ghostCount; i++) {
    const base = rotatePreview(sphereVectorForSeed(`${ball?.ballId || 'preview'}-ghost-${i}`, ghostCount, i));
    dots.push({
      base,
      kind: 'ghost',
      seed: `preview-ghost-${ball?.ballId || 'ball'}-${i}`,
      radius: 0.95 + hashUnit(`preview-ghost-r-${ball?.ballId || 'ball'}-${i}`) * 1.35,
      alpha: 0.15 + hashUnit(`preview-ghost-a-${ball?.ballId || 'ball'}-${i}`) * 0.22,
      color: hashUnit(`preview-ghost-warm-${ball?.ballId || 'ball'}-${i}`) > 0.42 ? [226, 180, 86] : [144, 82, 188],
    });
  }

  const networkItems = labelNodes.map((node, slot) => {
    if (slot === 0) {
      return {
        node,
        base: { x: 0.10, y: -0.02, z: 0.84 },
        ratio: Math.min(1, (node.count || 1) / maxCount),
      };
    }
    const angle = -0.72 + (slot - 1) / Math.max(1, labelNodes.length - 1) * Math.PI * 2.08;
    const radius = slot % 3 === 0 ? 0.78 : slot % 2 === 0 ? 0.66 : 0.56;
    return {
      node,
      base: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.70,
        z: 0.18 + hashUnit(`preview-network-z-${ball?.ballId || 'ball'}-${node.name}`) * 0.62,
      },
      ratio: Math.min(1, (node.count || 1) / maxCount),
    };
  });

  networkItems.forEach(({ node, base, ratio }) => {
    const lv = nodeBrightnessLevel({ ...node, count: node.count, role: node.role });
    const visual = nodeBrightnessVisual(lv);
    dots.push({
      base,
      kind: 'node',
      seed: `preview-node-${ball?.ballId || 'ball'}-${node.name}`,
      radius: 2.6 + visual.radius * 0.42 + ratio * 3.2,
      alpha: 0.62 + visual.opacity * 0.36,
      color: node.role === 'primary' || ratio > 0.72 ? [255, 230, 152] : [222, 176, 78],
    });
  });

  for (let i = 0; i < 92; i++) {
    const angle = i / 92 * Math.PI * 2;
    const jitter = hashSigned(`preview-limb-${ball?.ballId || 'ball'}-${i}`) * 2.6;
    dots.push({
      base: { x: Math.cos(angle), y: Math.sin(angle), z: -0.02 + hashSigned(`preview-limb-z-${i}`) * 0.08 },
      kind: 'limb',
      seed: `preview-limb-${i}`,
      radius: 0.65 + hashUnit(`preview-limb-r-${i}`) * 0.8,
      alpha: 0.13 + hashUnit(`preview-limb-a-${i}`) * 0.16,
      color: [232, 190, 92],
      jitter,
    });
  }

  const projectPreview = base => {
    const depth = (base.z + 1) / 2;
    const perspective = 0.72 + depth * 0.30;
    return {
      x: center + base.x * r * perspective,
      y: center + base.y * r * perspective,
      depth,
    };
  };

  const networkPositions = networkItems.map(item => ({
    ...item,
    projected: projectPreview(item.base),
  }));

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < networkPositions.length; i++) {
    const source = networkPositions[0]?.projected;
    const target = networkPositions[i].projected;
    if (!source || !target) continue;
    ctx.strokeStyle = `rgba(210,166,74,${0.12 + networkPositions[i].ratio * 0.12})`;
    ctx.lineWidth = 1.2 + networkPositions[i].ratio * 1.2;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }
  for (let i = 1; i < networkPositions.length - 1; i++) {
    const a = networkPositions[i].projected;
    const b = networkPositions[i + 1].projected;
    ctx.strokeStyle = 'rgba(210,166,74,0.075)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();

  dots
    .sort((a, b) => a.base.z - b.base.z)
    .forEach(dot => {
      const projected = projectPreview(dot.base);
      const x = projected.x + (dot.jitter || 0);
      const y = projected.y + (dot.jitter ? dot.jitter * 0.28 : 0);
      const backFade = dot.base.z < 0 ? 0.42 : 1;
      const alpha = dot.alpha * backFade * (0.50 + projected.depth * 0.58);
      const radius = dot.radius * (0.72 + projected.depth * 0.72);
      paintPreviewDot(ctx, x, y, radius, dot.color, alpha);
    });

  ctx.save();
  ctx.textBaseline = 'middle';
  networkPositions.forEach(({ node, projected, ratio }, index) => {
    const name = String(node.name || '').trim();
    if (!name) return;
    const isCore = index === 0;
    const offsetX = isCore ? 18 : (projected.x < center ? -18 : 18);
    const offsetY = isCore ? 16 : (projected.y < center ? -18 : 18);
    const fontSize = Math.round(isCore ? 34 : 20 + ratio * 7);
    ctx.font = `${isCore ? 700 : 500} ${fontSize}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
    ctx.textAlign = projected.x < center && !isCore ? 'right' : 'left';
    const label = name.length > 8 ? `${name.slice(0, 8)}…` : name;
    const x = projected.x + offsetX;
    const y = projected.y + offsetY;
    ctx.lineWidth = isCore ? 7 : 5;
    ctx.strokeStyle = `rgba(0,0,0,${isCore ? 0.78 : 0.58})`;
    ctx.strokeText(label, x, y);
    ctx.fillStyle = isCore ? 'rgba(238,222,180,0.96)' : 'rgba(190,178,146,0.74)';
    ctx.fillText(label, x, y);
  });
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.userData = {
    kind: 'knowledge-preview',
    palette: 'purple-black-gold',
    nodeCount: nodes.length,
    labelCount: labelNodes.length,
  };
  texture.needsUpdate = true;
  return texture;
}

function ensureUniversePreviewTexture(sprite) {
  if (!sprite?.userData) return null;
  if (!sprite.userData.previewTexture) {
    sprite.userData.previewTexture = universeKnowledgePreviewTexture(sprite.userData.ball);
  }
  return sprite.userData.previewTexture;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(value) {
  const t = clamp01(value);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function rgbaFromRgb(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function paintGalaxyParticle(ctx, x, y, radius, rgb, alpha, core = 0.42) {
  if (radius <= 0 || alpha <= 0) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgbaFromRgb(rgb, alpha));
  gradient.addColorStop(core, rgbaFromRgb(rgb, alpha * 0.34));
  gradient.addColorStop(1, rgbaFromRgb(rgb, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function universeGalaxyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.globalCompositeOperation = 'lighter';
  let particleCount = 0;

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
  core.addColorStop(0, 'rgba(255,248,221,.92)');
  core.addColorStop(0.16, 'rgba(239,198,105,.46)');
  core.addColorStop(0.42, 'rgba(145,82,215,.22)');
  core.addColorStop(1, 'rgba(18,8,42,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rot = -0.25;
  for (let i = 0; i < 5600; i++) {
    const t = hashUnit(`galaxy-haze-t-${i}`);
    const arm = i % 5;
    const theta = arm * Math.PI * 0.4 + 0.62 + Math.pow(t, 0.68) * 7.4 + hashNormal(`galaxy-haze-theta-${i}`, 0.08 + t * 0.13);
    const r = 34 + Math.pow(t, 0.70) * 710 + hashNormal(`galaxy-haze-r-${i}`, 26 + t * 50);
    const x0 = r * Math.cos(theta) + hashNormal(`galaxy-haze-x-${i}`, 12 + t * 22);
    const y0 = r * 0.62 * Math.sin(theta) + hashNormal(`galaxy-haze-y-${i}`, 24 + t * 52);
    const x = cx + x0 * Math.cos(rot) - y0 * Math.sin(rot);
    const y = cy + x0 * Math.sin(rot) + y0 * Math.cos(rot);
    const warm = hashUnit(`galaxy-haze-warm-${i}`);
    const bright = hashUnit(`galaxy-haze-bright-${i}`);
    const rgb = warm > 0.66
      ? [214 + Math.round(bright * 41), 162 + Math.round(bright * 64), 76 + Math.round(bright * 58)]
      : [78 + Math.round(bright * 38), 36 + Math.round(bright * 28), 130 + Math.round(bright * 60)];
    const radius = 9 + Math.pow(bright, 1.45) * 30;
    const alpha = 0.040 + bright * 0.115;
    paintGalaxyParticle(ctx, x, y, radius, rgb, alpha, 0.20);
    particleCount++;
  }

  for (let i = 0; i < 11600; i++) {
    const t = hashUnit(`galaxy-particle-t-${i}`);
    const arm = i % 5;
    const baseTheta = arm * Math.PI * 0.4 + 0.56 + Math.pow(t, 0.69) * 7.6;
    const theta = baseTheta + hashNormal(`galaxy-particle-theta-${i}`, 0.038 + t * 0.070);
    const r = 30 + Math.pow(t, 0.70) * 730 + hashNormal(`galaxy-particle-r-${i}`, 16 + t * 30);
    const armWidth = 0.56 + t * 0.18;
    const x0 = r * Math.cos(theta) + hashNormal(`galaxy-particle-x-${i}`, 9 + t * 16);
    const y0 = r * armWidth * Math.sin(theta) + hashNormal(`galaxy-particle-y-${i}`, 9 + t * 22);
    const x = cx + x0 * Math.cos(rot) - y0 * Math.sin(rot);
    const y = cy + x0 * Math.sin(rot) + y0 * Math.cos(rot);
    const warm = hashUnit(`galaxy-particle-warm-${i}`);
    const bright = hashUnit(`galaxy-particle-bright-${i}`);
    const rgb = warm > 0.62
      ? [255, 215 + Math.round(bright * 32), 112 + Math.round(bright * 72)]
      : [108 + Math.round(bright * 38), 48 + Math.round(bright * 34), 168 + Math.round(bright * 58)];
    const radius = 0.65 + Math.pow(bright, 1.8) * 4.6 + (i % 83 === 0 ? 5.8 : 0);
    const alpha = 0.095 + Math.pow(bright, 1.32) * 0.62 + (i % 127 === 0 ? 0.38 : 0);
    paintGalaxyParticle(ctx, x, y, radius, rgb, alpha, 0.25);
    particleCount++;
  }

  for (let i = 0; i < 2600; i++) {
    const angle = hashUnit(`galaxy-core-angle-${i}`) * Math.PI * 2;
    const r = Math.pow(hashUnit(`galaxy-core-r-${i}`), 0.42) * 170;
    const x0 = r * Math.cos(angle);
    const y0 = r * 0.34 * Math.sin(angle);
    const x = cx + x0 * Math.cos(rot) - y0 * Math.sin(rot);
    const y = cy + x0 * Math.sin(rot) + y0 * Math.cos(rot);
    const bright = hashUnit(`galaxy-core-bright-${i}`);
    const rgb = bright > 0.36 ? [255, 239, 188] : [156, 86, 210];
    const radius = 1.1 + Math.pow(bright, 1.45) * 8.8;
    const alpha = 0.095 + Math.pow(bright, 1.18) * 0.56;
    paintGalaxyParticle(ctx, x, y, radius, rgb, alpha, 0.22);
    particleCount++;
  }

  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 560; i++) {
    const t = hashUnit(`galaxy-lane-t-${i}`);
    const x0 = (t - 0.5) * 720;
    const y0 = hashNormal(`galaxy-lane-y-${i}`, 9 + t * 4);
    const x = cx + x0 * Math.cos(rot) - y0 * Math.sin(rot);
    const y = cy + x0 * Math.sin(rot) + y0 * Math.cos(rot);
    paintGalaxyParticle(ctx, x, y, 2.5 + hashUnit(`galaxy-lane-s-${i}`) * 8.5, [2, 2, 8], 0.035, 0.12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.userData = { particleCount, width: canvas.width, height: canvas.height, palette: 'purple-black-gold' };
  texture.needsUpdate = true;
  return texture;
}

function universe3DPoint(index, total) {
  const armCount = Math.min(5, Math.max(1, total));
  const arm = index % armCount;
  const ring = Math.floor(index / armCount);
  const ringCount = Math.max(1, Math.ceil(total / armCount));
  const t = (ring + 0.5) / ringCount;
  const angle = arm * (Math.PI * 2 / armCount)
    + 0.42
    + Math.pow(t, 0.72) * 8.1
    + (hashUnit(`planet-angle-3d-${index}-${total}`) - 0.5) * 0.15;
  const r = 84 + Math.pow(t, 0.72) * (total > 12 ? 406 : 360);
  const wobble = (hashUnit(`planet-wobble-3d-${index}-${total}`) - 0.5) * 48;
  return new THREE.Vector3(
    (r + wobble) * Math.cos(angle),
    (r * 0.58 + wobble * 0.20) * Math.sin(angle),
    (hashUnit(`planet-z-3d-${index}-${total}`) - 0.5) * 320
  );
}

function createUniversePointCloud(count, mode = 'dust', texture = null) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    let x;
    let y;
    let z;
    let color;
    if (mode === 'far') {
      x = (hashUnit(`far-x-${i}`) - 0.5) * 720;
      y = (hashUnit(`far-y-${i}`) - 0.5) * 420;
      z = -260 - hashUnit(`far-z-${i}`) * 360;
      const warm = hashUnit(`far-warm-${i}`);
      const bright = 0.38 + Math.pow(hashUnit(`far-bright-${i}`), 2.1) * 0.62;
      color = warm > 0.72 ? new THREE.Color(1, 0.78, 0.34) : new THREE.Color(0.48, 0.24, 0.72);
      color.multiplyScalar(bright);
    } else if (mode === 'halo') {
      const theta = hashUnit(`halo-theta-${i}`) * Math.PI * 2;
      const vertical = hashSigned(`halo-vertical-${i}`);
      const ring = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const radius = 115 + Math.pow(hashUnit(`halo-radius-${i}`), 0.72) * 575;
      x = Math.cos(theta) * ring * radius + hashNormal(`halo-x-${i}`, 18);
      y = vertical * radius * 0.60 + hashNormal(`halo-y-${i}`, 24);
      z = Math.sin(theta) * ring * radius * 0.82 + hashNormal(`halo-z-${i}`, 36);
      const warm = hashUnit(`halo-warm-${i}`);
      const brightness = 0.20 + Math.pow(hashUnit(`halo-bright-${i}`), 1.9) * 0.44;
      color = warm > 0.68 ? new THREE.Color(0.95, 0.66, 0.24) : new THREE.Color(0.48, 0.26, 0.72);
      color.multiplyScalar(brightness);
    } else {
      const armCount = 4;
      const arm = i % armCount;
      const direction = arm % 2 ? -1 : 1;
      const spread = mode === 'haze' ? 56 : mode === 'bright' ? 24 : 34;
      const radialJitter = mode === 'haze' ? 44 : mode === 'bright' ? 18 : 30;
      const angle = direction * (0.38 + Math.pow(t, 0.78) * 6.9)
        + arm * Math.PI / 2
        + i * golden * (mode === 'bright' ? 0.025 : 0.045)
        + hashNormal(`${mode}-angle-3d-${i}`, mode === 'haze' ? 0.11 : 0.055);
      const rBase = mode === 'haze' ? 20 : 12;
      const rLimit = mode === 'haze' ? 350 : mode === 'bright' ? 315 : 340;
      const r = rBase + Math.pow(t, mode === 'bright' ? 0.62 : 0.70) * rLimit + hashNormal(`${mode}-r-3d-${i}`, radialJitter);
      x = r * Math.cos(angle);
      y = r * (mode === 'haze' ? 0.70 : 0.58) * Math.sin(angle) + hashNormal(`${mode}-y-3d-${i}`, spread);
      z = hashNormal(`${mode}-z-3d-${i}`, mode === 'haze' ? 92 + t * 118 : 58 + t * 110)
        + Math.sin(angle * 1.6) * (mode === 'bright' ? 18 + t * 38 : 28 + t * 76);
      const warm = hashUnit(`${mode}-warm-3d-${i}`);
      const brightness = mode === 'bright'
        ? 0.84 + Math.pow(hashUnit(`${mode}-bright-3d-${i}`), 1.35) * 0.72
        : mode === 'haze'
          ? 0.20 + hashUnit(`${mode}-bright-3d-${i}`) * 0.28
          : 0.34 + Math.pow(hashUnit(`${mode}-bright-3d-${i}`), 1.6) * 0.48;
      color = warm > 0.60 ? new THREE.Color(1, 0.70, 0.28) : new THREE.Color(0.54, 0.26, 0.84);
      color.multiplyScalar(brightness);
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sizeTable = { far: 1.45, halo: 1.85, haze: 6.2, dust: 2.25, bright: 3.4 };
  const opacityTable = { far: 0.68, halo: 0.24, haze: 0.44, dust: 0.96, bright: 1.0 };
  const material = new THREE.PointsMaterial({
    size: sizeTable[mode] || 1.7,
    map: texture,
    alphaTest: texture ? 0.025 : 0,
    vertexColors: true,
    transparent: true,
    opacity: opacityTable[mode] || 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: mode !== 'bright',
  });
  material.userData.baseOpacity = material.opacity;
  const points = new THREE.Points(geometry, material);
  points.userData = { mode, particleCount: count };
  return points;
}

function createUniverseSpiralArmCloud(count, texture = null) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const armCount = 2;
  const rot = -0.25;
  for (let i = 0; i < count; i++) {
    const arm = i % armCount;
    const ringIndex = Math.floor(i / armCount);
    const t = (ringIndex + 0.5) / Math.ceil(count / armCount);
    const theta = arm * (Math.PI * 2 / armCount)
      + 0.34
      + Math.pow(t, 0.73) * 9.8
      + hashNormal(`spiral-theta-${i}`, 0.007 + t * 0.026);
    const radius = 34 + Math.pow(t, 0.66) * 540 + hashNormal(`spiral-r-${i}`, 5 + t * 12);
    const side = hashNormal(`spiral-side-${i}`, 9 + t * 34);
    const armX = radius * Math.cos(theta) - side * Math.sin(theta);
    const armY = radius * 0.58 * Math.sin(theta) + side * 0.62 * Math.cos(theta);
    const x = armX * Math.cos(rot) - armY * Math.sin(rot);
    const y = armX * Math.sin(rot) + armY * Math.cos(rot);
    const z = hashNormal(`spiral-z-${i}`, 26 + t * 92)
      + Math.sin(theta * 1.7) * (18 + t * 42)
      + Math.sin(theta * 0.43 + arm * Math.PI) * (16 + t * 48);
    const bright = hashUnit(`spiral-bright-${i}`);
    const warm = hashUnit(`spiral-warm-${i}`);
    const color = warm > 0.54
      ? new THREE.Color(1, 0.64 + bright * 0.24, 0.24 + bright * 0.22)
      : new THREE.Color(0.50 + bright * 0.18, 0.24 + bright * 0.14, 0.78 + bright * 0.18);
    color.multiplyScalar(0.52 + Math.pow(bright, 1.42) * 0.98);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 3.7,
    map: texture,
    alphaTest: texture ? 0.018 : 0,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  material.userData.baseOpacity = material.opacity;
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData = { mode: 'spiral', particleCount: count, palette: 'purple-black-gold' };
  return points;
}

function createUniverseRibbonCloud(count, texture = null) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const armCount = 2;
  const rot = -0.25;
  for (let i = 0; i < count; i++) {
    const arm = i % armCount;
    const ringIndex = Math.floor(i / armCount);
    const t = (ringIndex + 0.5) / Math.ceil(count / armCount);
    const theta = arm * Math.PI
      + 0.48
      + Math.pow(t, 0.70) * 9.2
      + hashNormal(`ribbon-theta-${i}`, 0.012 + t * 0.026);
    const radius = 64 + Math.pow(t, 0.70) * 555 + hashNormal(`ribbon-r-${i}`, 5 + t * 14);
    const side = hashNormal(`ribbon-side-${i}`, 7 + t * 26);
    const tube = hashNormal(`ribbon-tube-${i}`, 8 + t * 32);
    const armX = radius * Math.cos(theta) - side * Math.sin(theta);
    const armY = radius * 0.50 * Math.sin(theta) + side * Math.cos(theta) * 0.52;
    const x = armX * Math.cos(rot) - armY * Math.sin(rot);
    const y = armX * Math.sin(rot) + armY * Math.cos(rot) + tube * 0.28;
    const z = Math.sin(theta * 0.64 + arm * Math.PI * 0.72) * (52 + t * 178)
      + Math.sin(theta * 1.38) * (18 + t * 62)
      + tube;
    const bright = hashUnit(`ribbon-bright-${i}`);
    const warm = hashUnit(`ribbon-warm-${i}`);
    const color = warm > 0.58
      ? new THREE.Color(1, 0.66 + bright * 0.22, 0.22 + bright * 0.26)
      : new THREE.Color(0.50 + bright * 0.18, 0.24 + bright * 0.18, 0.82 + bright * 0.16);
    color.multiplyScalar(0.38 + Math.pow(bright, 1.34) * 0.86);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 4.4,
    map: texture,
    alphaTest: texture ? 0.018 : 0,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  material.userData.baseOpacity = material.opacity;
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData = { mode: 'ribbon', particleCount: count, palette: 'purple-black-gold' };
  return points;
}

function createUniverseGalaxyPlane(texture) {
  const geometry = new THREE.PlaneGeometry(1180, 750, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  material.userData.baseOpacity = material.opacity;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -24;
  return mesh;
}

function createUniverseGlow(texture, scale, position, opacity = 0.46) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.userData.baseOpacity = material.opacity;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  sprite.position.copy(position);
  return sprite;
}

function universeCameraTargetForObject(object, zoom = 1) {
  const applyZoom = target => {
    const z = Math.max(UNIVERSE_ZOOM_MIN, Math.min(UNIVERSE_ZOOM_MAX, zoom || 1));
    return {
      camera: target.lookAt.clone().add(target.camera.clone().sub(target.lookAt).multiplyScalar(z)),
      lookAt: target.lookAt,
    };
  };
  if (!object) {
    return applyZoom({
      camera: new THREE.Vector3(0, 58, 720),
      lookAt: new THREE.Vector3(0, 0, 0),
    });
  }
  const p = object.getWorldPosition(new THREE.Vector3());
  const radial = new THREE.Vector3(p.x, p.y, 0);
  if (radial.lengthSq() < 1) radial.set(0, -1, 0);
  radial.normalize();
  const tangent = new THREE.Vector3(-radial.y, radial.x, 0).multiplyScalar(36);
  return applyZoom({
    camera: p.clone()
      .add(radial.clone().multiplyScalar(92))
      .add(tangent)
      .add(new THREE.Vector3(0, 26, 128)),
    lookAt: p.clone(),
  });
}

function startUniverseCameraTween(state, object, duration = 2200) {
  const target = universeCameraTargetForObject(object, state?.targetZoom || state?.zoom || 1);
  state.cameraTween = {
    startedAt: performance.now(),
    duration,
    fromCamera: state.camera.position.clone(),
    fromLookAt: state.lookAt.clone(),
    toCamera: target.camera,
    toLookAt: target.lookAt,
  };
}

function releaseUniverseLockToOverview(state, duration = 1700) {
  if (!state?.lockedObject && !state?.lockedBall) return;
  activeBallId = null;
  state.lockedBall = null;
  state.lockedObject = null;
  state.targetZoom = 1;
  startUniverseCameraTween(state, null, duration);
  updateUniverseLockOverlay(state, null);
  saveMapState();
}

function applyUniverseCameraTween(state, now) {
  if (!state.cameraTween) return false;
  const tween = state.cameraTween;
  const t = easeInOutCubic((now - tween.startedAt) / tween.duration);
  state.camera.position.copy(tween.fromCamera).lerp(tween.toCamera, t);
  state.lookAt.copy(tween.fromLookAt).lerp(tween.toLookAt, t);
  if (t >= 1) state.cameraTween = null;
  return true;
}

function updateUniverseLockOverlay(state, ball) {
  const { container } = state;
  const area = container.querySelector('.universe-area');
  const card = container.querySelector('#universeLockCard');
  const hint = container.querySelector('#mapHint');
  const enterBtn = container.querySelector('#universeEnterLockedBtn');
  const unlockBtn = container.querySelector('#universeUnlockBtn');
  area?.classList.toggle('locked', Boolean(ball));
  if (enterBtn) enterBtn.disabled = !ball;
  if (unlockBtn) unlockBtn.disabled = !ball;
  if (hint) {
    hint.textContent = ball
      ? `已锁定「${ball.name}」；再次点击这颗星，或点击进入星球查看内部节点`
      : '移动到亮点查看知识星球；点击亮点会丝滑推进并锁定；再次点击进入金色知识球';
  }
  if (!card) return;
  card.classList.toggle('visible', Boolean(ball));
  if (ball) {
    card.querySelector('.universe-lock-name').textContent = ball.name;
    card.querySelector('.universe-lock-meta').textContent = `${ball.articleCount} 篇作品 · ${ball.nodeCount} 个节点`;
  }
}

function projectUniverseLabel(state, object) {
  if (!object || !state.label) return;
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pos = object.getWorldPosition(new THREE.Vector3()).project(state.camera);
  state.label.style.left = `${(pos.x * 0.5 + 0.5) * rect.width}px`;
  state.label.style.top = `${(-pos.y * 0.5 + 0.5) * rect.height}px`;
}

function showUniverseStarLabel(state, object) {
  if (!state.label || !object?.userData?.ball) return;
  const ball = object.userData.ball;
  state.label.innerHTML = `${esc(ball.name)}<small>${ball.articleCount} 篇作品 · ${ball.nodeCount} 个节点</small>`;
  state.label.classList.add('visible');
  projectUniverseLabel(state, object);
}

function hideUniverseStarLabel(state) {
  state?.label?.classList.remove('visible');
}

function setUniverseHoverObject(state, object) {
  if (state.hoverObject === object) return;
  state.hoverObject = object || null;
  if (object) showUniverseStarLabel(state, object);
  else hideUniverseStarLabel(state);
}

async function focusUniverseBall3D(state, ball) {
  if (state.lockedBall?.ballId === ball.ballId) {
    await enterUniverseBall(ball);
    return;
  }
  activeBallId = ball.ballId;
  state.lockedBall = ball;
  state.lockedObject = state.ballSprites.get(ball.ballId) || null;
  state.targetZoom = Math.min(state.targetZoom || state.zoom || 1, 0.68);
  startUniverseCameraTween(state, state.lockedObject, 3000);
  updateUniverseLockOverlay(state, ball);
  await saveMapState();
  maybeShowMapLightModeHint();
}

function setUniverseTargetZoom(state, delta) {
  if (!state) return;
  if (delta > 0 && state.lockedObject) {
    releaseUniverseLockToOverview(state, 1700);
    state.userActiveUntil = performance.now() + 3600;
    hideUniverseStarLabel(state);
    return;
  }
  state.targetZoom = Math.max(UNIVERSE_ZOOM_MIN, Math.min(UNIVERSE_ZOOM_MAX, (state.targetZoom || state.zoom || 1) + delta));
  state.cameraTween = null;
  state.userActiveUntil = performance.now() + 3600;
  hideUniverseStarLabel(state);
}

function bindUniversePointerEvents(state) {
  const canvas = state.renderer.domElement;
  const pointer = new THREE.Vector2();
  const updatePointer = event => {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.clientWidth || 1;
    const height = rect.height || canvas.clientHeight || 1;
    pointer.x = ((event.clientX - rect.left) / width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / height) * 2 + 1;
    state.raycaster.setFromCamera(pointer, state.camera);
    const hits = state.raycaster.intersectObjects(state.starSprites, false);
    setUniverseHoverObject(state, hits[0]?.object || null);
  };
  const finishDrag = event => {
    if (!state.drag) return;
    try { canvas.releasePointerCapture?.(event.pointerId); } catch {}
    state.container.querySelector('.universe-area')?.classList.remove('dragging');
    state.drag = null;
  };
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    state.targetRotation.copy(state.userRotation);
    state.drag = {
      x: event.clientX,
      y: event.clientY,
      moved: 0,
    };
    state.userActiveUntil = performance.now() + 4200;
    state.container.querySelector('.universe-area')?.classList.add('dragging');
    hideUniverseStarLabel(state);
    try { canvas.setPointerCapture?.(event.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', event => {
    if (state.drag) {
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      state.drag.x = event.clientX;
      state.drag.y = event.clientY;
      state.drag.moved += Math.abs(dx) + Math.abs(dy);
      if (state.drag.moved > 2) {
        state.targetRotation.y = normalizeUniverseAngle(state.targetRotation.y + dx * UNIVERSE_DRAG_ROTATE * 1.08);
        state.targetRotation.z = normalizeUniverseAngle(state.targetRotation.z + dx * UNIVERSE_DRAG_ROTATE * 0.18);
        state.targetRotation.x = normalizeUniverseAngle(state.targetRotation.x + dy * UNIVERSE_DRAG_ROTATE * 0.86);
        state.userActiveUntil = performance.now() + 4200;
        state.cameraTween = null;
        state.suppressClickUntil = performance.now() + 260;
        setUniverseHoverObject(state, null);
      }
      return;
    }
    updatePointer(event);
  });
  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);
  canvas.addEventListener('pointerleave', event => {
    if (!state.drag) setUniverseHoverObject(state, null);
    else finishDrag(event);
  });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    setUniverseTargetZoom(state, event.deltaY > 0 ? UNIVERSE_ZOOM_STEP : -UNIVERSE_ZOOM_STEP);
  }, { passive: false });
  canvas.addEventListener('click', event => {
    if (performance.now() < (state.suppressClickUntil || 0)) return;
    updatePointer(event);
    const ball = state.hoverObject?.userData?.ball;
    if (ball) focusUniverseBall3D(state, ball);
  });
  canvas.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && state.hoverObject?.userData?.ball) {
      event.preventDefault();
      focusUniverseBall3D(state, state.hoverObject.userData.ball);
    }
  });
}

function startUniverseRenderLoop(state) {
  const baseTarget = universeCameraTargetForObject(null, state.zoom || 1);
  state.camera.position.set(0, 86, 980);
  state.lookAt.set(-44, -12, 0);
  const planeNormal = new THREE.Vector3();
  state.introStart = performance.now();
  state.cameraTween = {
    startedAt: state.introStart,
    duration: state.lockedObject ? 3200 : 2600,
    fromCamera: state.camera.position.clone(),
    fromLookAt: state.lookAt.clone(),
    toCamera: state.lockedObject ? universeCameraTargetForObject(state.lockedObject, state.zoom || 1).camera : baseTarget.camera,
    toLookAt: state.lockedObject ? universeCameraTargetForObject(state.lockedObject, state.zoom || 1).lookAt : baseTarget.lookAt,
  };
  const step = now => {
    if (universeSceneState !== state) return;
    const last = state.lastTs || now;
    const dt = Math.min(0.08, (now - last) / 1000);
    state.lastTs = now;
    const rawIntro = clamp01((now - state.introStart) / 2600);
    const intro = easeOutCubic(rawIntro);
    state.zoom += ((state.targetZoom || 1) - (state.zoom || 1)) * 0.12;

    const activeSlow = now < (state.userActiveUntil || 0) ? 0.18 : 1;
    state.autoSpin = (state.autoSpin || 0) - dt * 0.0042 * activeSlow;
    const rotationEase = state.drag ? 0.28 : now < (state.userActiveUntil || 0) ? 0.16 : 0.10;
    state.userRotation.x = smoothUniverseAngle(state.userRotation.x, state.targetRotation.x, rotationEase);
    state.userRotation.y = smoothUniverseAngle(state.userRotation.y, state.targetRotation.y, rotationEase);
    state.userRotation.z = smoothUniverseAngle(state.userRotation.z, state.targetRotation.z, rotationEase);
    state.galaxyGroup.rotation.z = state.autoSpin + (state.userRotation?.z || 0);
    state.galaxyGroup.rotation.x = -0.30 + Math.sin(now * 0.00008) * 0.018 + (state.userRotation?.x || 0);
    state.galaxyGroup.rotation.y = Math.sin(now * 0.000055) * 0.028 + (state.userRotation?.y || 0);
    state.coreGlow.scale.setScalar((0.94 + intro * 0.06) * (1 + Math.sin(now * 0.0012) * 0.028));
    if (state.galaxyPlane) {
      const closeFade = 0.34 + clamp01((state.zoom - UNIVERSE_ZOOM_MIN) / (1 - UNIVERSE_ZOOM_MIN)) * 0.66;
      planeNormal.set(0, 0, 1).applyEuler(state.galaxyGroup.rotation);
      const faceFade = 0.12 + Math.abs(planeNormal.z) * 0.88;
      state.galaxyPlane.material.opacity = state.galaxyPlane.material.userData.baseOpacity * intro * closeFade * faceFade * (state.lockedObject ? 0.28 : 1);
    }
    for (const cloud of state.particleClouds || []) {
      const breathe = cloud.userData.mode === 'haze'
        ? 0.92 + Math.sin(now * 0.00062) * 0.08
        : cloud.userData.mode === 'bright'
          ? 0.92 + Math.sin(now * 0.0011) * 0.10
          : cloud.userData.mode === 'spiral'
            ? 0.94 + Math.sin(now * 0.00072) * 0.07
            : cloud.userData.mode === 'ribbon'
              ? 0.94 + Math.sin(now * 0.00058) * 0.08
            : 1;
      const focusDim = state.lockedObject
        ? (cloud.userData.mode === 'bright' ? 0.68 : cloud.userData.mode === 'spiral' || cloud.userData.mode === 'ribbon' ? 0.54 : 0.44)
        : 1;
      cloud.material.opacity = cloud.material.userData.baseOpacity * (0.18 + intro * 0.82) * breathe * focusDim;
    }
    if (state.farStars) {
      state.farStars.material.opacity = state.farStars.material.userData.baseOpacity * (0.22 + intro * 0.78);
    }
    for (const glow of state.glowSprites || []) {
      glow.material.opacity = glow.material.userData.baseOpacity * (0.22 + intro * 0.78) * (state.lockedObject ? 0.38 : 1);
    }

    for (const sprite of state.starSprites) {
      const selected = sprite === state.lockedObject;
      const nextMap = selected ? (ensureUniversePreviewTexture(sprite) || state.planetTexture) : state.starTexture;
      const nextBlend = selected ? THREE.NormalBlending : THREE.AdditiveBlending;
      sprite.renderOrder = selected ? 30 : 8;
      if (sprite.userData.renderMap !== nextMap) {
        sprite.material.map = nextMap;
        sprite.material.blending = nextBlend;
        sprite.material.color.set(selected ? 0xffffff : sprite.userData.starColor);
        sprite.material.needsUpdate = true;
        sprite.userData.renderMap = nextMap;
      }
      const reveal = easeOutCubic(rawIntro * 1.3 - sprite.userData.revealDelay);
      const pulse = 1 + Math.sin(now * 0.001 + sprite.userData.seed) * (selected ? 0.025 : 0.05);
      const targetScale = selected
        ? Math.max(154, sprite.userData.baseScale * 3.10) * pulse
        : sprite.userData.baseScale * pulse;
      sprite.scale.set(targetScale, targetScale, 1);
      sprite.material.opacity = (selected ? 0.98 : (state.lockedObject ? 0.50 : sprite.userData.baseOpacity)) * reveal;
    }
    if (state.focusGlow) {
      if (state.lockedObject) {
        const p = state.lockedObject.getWorldPosition(new THREE.Vector3());
        state.focusGlow.position.copy(p);
        const breathe = 1 + Math.sin(now * 0.0011) * 0.05;
        state.focusGlow.scale.setScalar((70 + (state.lockedObject.userData.baseScale || 16) * 2.4) * breathe);
        state.focusGlow.material.opacity = 0.12 * intro;
      } else {
        state.focusGlow.material.opacity *= 0.9;
      }
    }

    if (!applyUniverseCameraTween(state, now)) {
      const target = universeCameraTargetForObject(state.lockedObject, state.zoom);
      state.lookAt.lerp(target.lookAt, 0.018);
      state.camera.position.lerp(target.camera, 0.018);
    }
    state.camera.lookAt(state.lookAt);
    if (state.hoverObject) projectUniverseLabel(state, state.hoverObject);
    state.renderer.render(state.scene, state.camera);
    state.frame = requestAnimationFrame(step);
  };
  state.frame = requestAnimationFrame(step);
}

function renderUniverseThreeView(articles, projects, container, mode = universeMode) {
  stopUniverseScene();
  const projectNameById = {};
  for (const p of projects || []) projectNameById[p.id] = p.name;
  const balls = prepareUniverseBalls(articles, mode, projectNameById);
  const links = findCrossBallLinks(balls);
  const lockedBallId = resolveUniverseLockBallId(articles, balls, mode);
  const lockedBall = balls.find(ball => ball.ballId === lockedBallId) || null;
  if (lockedBallId && activeBallId !== lockedBallId) {
    activeBallId = lockedBallId;
    saveMapState();
  }

  container.innerHTML = `
    <div class="graph-area universe-area${lockedBall ? ' locked' : ''}">
      <div class="map-tools universe-tools" aria-label="宇宙地图工具">
        <button class="map-tool" id="universeEnterLockedBtn" type="button"${lockedBall ? '' : ' disabled'}>进入星球</button>
        <button class="map-tool" id="universeUnlockBtn" type="button"${lockedBall ? '' : ' disabled'}>解除锁定</button>
        <button class="map-tool ${mode === 'domain' ? 'active' : ''}" id="universeDomainBtn" type="button">按领域</button>
        <button class="map-tool ${mode === 'project' ? 'active' : ''}" id="universeProjectBtn" type="button">按项目</button>
      </div>
      <button class="map-node-fab" id="mapNodeIndexBtn" type="button">全局节点</button>
      <div class="universe-canvas-wrap" id="universeCanvasWrap"></div>
      <div class="universe-star-tooltip" id="universeStarTooltip"></div>
      <div class="map-hint universe-hint" id="mapHint"></div>
      <div class="universe-lock-card${lockedBall ? ' visible' : ''}" id="universeLockCard">
        <div class="universe-lock-kicker">已锁定知识星球</div>
        <div class="universe-lock-name">${lockedBall ? esc(lockedBall.name) : ''}</div>
        <div class="universe-lock-meta">${lockedBall ? `${lockedBall.articleCount} 篇作品 · ${lockedBall.nodeCount} 个节点` : ''}</div>
      </div>
    </div>`;

  const wrap = container.querySelector('#universeCanvasWrap');
  const width = Math.max(320, Math.round(wrap.getBoundingClientRect().width || 760));
  const height = Math.max(360, Math.round(wrap.getBoundingClientRect().height || 540));
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x030206, 1);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D 星云知识宇宙');
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, width / height, 1, 1400);
  const galaxyGroup = new THREE.Group();
  const pointTexture = universeTexture('point');
  const farStars = createUniversePointCloud(1200, 'far', pointTexture);
  scene.add(farStars);
  scene.add(galaxyGroup);

  const coreTexture = universeTexture('core');
  const starTexture = universeTexture('star');
  const planetTexture = universePlanetTexture();
  const galaxyTexture = universeGalaxyTexture();
  const coreGlow = createUniverseGlow(coreTexture, 140, new THREE.Vector3(0, 0, 0), 0.66);
  const galaxyPlane = createUniverseGalaxyPlane(galaxyTexture);
  const haloCloud = createUniversePointCloud(3800, 'halo', pointTexture);
  const hazeCloud = createUniversePointCloud(3600, 'haze', pointTexture);
  const spiralCloud = createUniverseSpiralArmCloud(22000, pointTexture);
  const ribbonCloud = createUniverseRibbonCloud(9800, pointTexture);
  const dustCloud = createUniversePointCloud(6200, 'dust', pointTexture);
  const brightCloud = createUniversePointCloud(2200, 'bright', pointTexture);
  const outerGlow = createUniverseGlow(coreTexture, 340, new THREE.Vector3(0, 0, -18), 0.20);
  const innerGlow = createUniverseGlow(coreTexture, 180, new THREE.Vector3(0, 0, 10), 0.18);
  const focusGlow = createUniverseGlow(starTexture, 1, new THREE.Vector3(0, 0, 0), 0);
  galaxyGroup.add(galaxyPlane);
  galaxyGroup.add(haloCloud);
  galaxyGroup.add(ribbonCloud);
  galaxyGroup.add(spiralCloud);
  galaxyGroup.add(hazeCloud);
  galaxyGroup.add(dustCloud);
  galaxyGroup.add(brightCloud);
  galaxyGroup.add(outerGlow);
  galaxyGroup.add(innerGlow);
  galaxyGroup.add(coreGlow);
  galaxyGroup.add(focusGlow);

  const maxArticleCount = Math.max(1, ...balls.map(ball => ball.articleCount || 0));
  const ballSprites = new Map();
  const starSprites = [];
  balls.forEach((ball, index) => {
    const visual = universeBallVisual(ball, maxArticleCount);
    const ratio = visual.intensity || 0;
    const material = new THREE.SpriteMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.86 + ratio * 0.14,
      color: ratio > 0.64 ? 0xfff2b8 : 0xf0c25d,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    const size = 18 + ratio * 36;
    sprite.scale.set(size, size, 1);
    sprite.position.copy(universe3DPoint(index, balls.length));
    sprite.userData = {
      ball,
      baseScale: size,
      baseOpacity: material.opacity,
      starColor: ratio > 0.64 ? 0xfff2b8 : 0xf0c25d,
      renderMap: starTexture,
      revealDelay: index / Math.max(1, balls.length) * 0.34,
      seed: hashUnit(`star-pulse-${ball.ballId}`) * Math.PI * 2,
    };
    galaxyGroup.add(sprite);
    ballSprites.set(ball.ballId, sprite);
    starSprites.push(sprite);
    ball._x = sprite.position.x;
    ball._y = sprite.position.y;
    ball._size = size;
  });

  if (links.length) {
    const positions = [];
    const byId = Object.fromEntries(balls.map(ball => [ball.ballId, ballSprites.get(ball.ballId)]));
    links.forEach(link => {
      const s = byId[link.source];
      const t = byId[link.target];
      if (!s || !t) return;
      positions.push(s.position.x, s.position.y, s.position.z, t.position.x, t.position.y, t.position.z);
    });
    if (positions.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x8e5ac6,
        transparent: true,
        opacity: 0.004,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      galaxyGroup.add(new THREE.LineSegments(geometry, material));
    }
  }

  const state = {
    container, renderer, scene, camera, galaxyGroup, coreGlow,
    galaxyPlane, haloCloud, ribbonCloud, hazeCloud, spiralCloud, dustCloud, brightCloud, farStars, focusGlow,
    starTexture, planetTexture,
    particleClouds: [haloCloud, ribbonCloud, hazeCloud, spiralCloud, dustCloud, brightCloud],
    glowSprites: [outerGlow, innerGlow, coreGlow],
    raycaster: new THREE.Raycaster(),
    ballSprites, starSprites,
    label: container.querySelector('#universeStarTooltip'),
    lockedBall,
    lockedObject: lockedBall ? ballSprites.get(lockedBall.ballId) : null,
    hoverObject: null,
    lookAt: new THREE.Vector3(),
    userRotation: new THREE.Vector3(0, 0, 0),
    targetRotation: new THREE.Vector3(0, 0, 0),
    autoSpin: 0,
    zoom: lockedBall ? 0.68 : 1,
    targetZoom: lockedBall ? 0.68 : 1,
    drag: null,
    suppressClickUntil: 0,
    userActiveUntil: 0,
    resizeHandler: null,
    frame: null,
  };
  if (state.lockedObject) {
    const previewTexture = ensureUniversePreviewTexture(state.lockedObject) || planetTexture;
    state.lockedObject.material.map = previewTexture;
    state.lockedObject.material.blending = THREE.NormalBlending;
    state.lockedObject.material.color.set(0xffffff);
    state.lockedObject.material.needsUpdate = true;
    state.lockedObject.renderOrder = 30;
    state.lockedObject.scale.setScalar(Math.max(154, state.lockedObject.userData.baseScale * 3.10));
    state.lockedObject.userData.renderMap = previewTexture;
  }
  universeSceneState = state;
  updateUniverseLockOverlay(state, lockedBall);

  state.resizeHandler = () => {
    if (universeSceneState !== state) return;
    const rect = wrap.getBoundingClientRect();
    const nextWidth = Math.max(320, Math.round(rect.width || width));
    const nextHeight = Math.max(360, Math.round(rect.height || height));
    state.camera.aspect = nextWidth / nextHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(nextWidth, nextHeight, false);
  };
  window.addEventListener('resize', state.resizeHandler);
  bindUniversePointerEvents(state);
  startUniverseRenderLoop(state);

  container.querySelector('#universeEnterLockedBtn')?.addEventListener('click', () => {
    if (state.lockedBall) enterUniverseBall(state.lockedBall);
  });
  container.querySelector('#universeUnlockBtn')?.addEventListener('click', () => {
    releaseUniverseLockToOverview(state, 1800);
  });
  container.querySelector('#universeDomainBtn')?.addEventListener('click', () => setUniverseMode('domain'));
  container.querySelector('#universeProjectBtn')?.addEventListener('click', () => setUniverseMode('project'));
  container.querySelector('#mapNodeIndexBtn')?.addEventListener('click', () => {
    switchTab('assets', { skipLoad: true });
    loadNodeIndex();
  });
}

function renderUniverseView(articles, projects, container, mode = universeMode) {
  stopMapSimulation();
  if (typeof THREE === 'undefined') {
    renderUniverseSvgFallbackView(articles, projects, container, mode);
    return;
  }
  try {
    renderUniverseThreeView(articles, projects, container, mode);
  } catch (err) {
    console.warn('[知识图鉴] 3D 宇宙渲染失败，回退到 SVG 宇宙:', err.message);
    renderUniverseSvgFallbackView(articles, projects, container, mode);
  }
}

function renderUniverseSvgFallbackView(articles, projects, container, mode = universeMode) {
  stopMapSimulation();
  const projectNameById = {};
  for (const p of projects || []) projectNameById[p.id] = p.name;
  const balls = prepareUniverseBalls(articles, mode, projectNameById);
  const links = findCrossBallLinks(balls);
  const lockedBallId = resolveUniverseLockBallId(articles, balls, mode);
  const lockedBall = balls.find(ball => ball.ballId === lockedBallId) || null;
  if (lockedBallId && activeBallId !== lockedBallId) {
    activeBallId = lockedBallId;
    saveMapState();
  }

  container.innerHTML = `
    <div class="graph-area universe-area${lockedBall ? ' locked' : ''}">
      <div class="map-tools universe-tools" aria-label="宇宙地图工具">
        <button class="map-tool" id="universeEnterLockedBtn" type="button"${lockedBall ? '' : ' disabled'}>进入星球</button>
        <button class="map-tool" id="universeUnlockBtn" type="button"${lockedBall ? '' : ' disabled'}>解除锁定</button>
        <button class="map-tool ${mode === 'domain' ? 'active' : ''}" id="universeDomainBtn" type="button">按领域</button>
        <button class="map-tool ${mode === 'project' ? 'active' : ''}" id="universeProjectBtn" type="button">按项目</button>
      </div>
      <button class="map-node-fab" id="mapNodeIndexBtn" type="button">全局节点</button>
      <div class="map-hint universe-hint" id="mapHint">${lockedBall ? `已锁定「${esc(lockedBall.name)}」；再次点击这颗星球，或点进入星球查看内部节点` : '点击知识星球锁定视角；再次点击同一星球进入内部；银色虚线表示跨领域同名节点'}</div>
      ${lockedBall ? `<div class="universe-lock-card">
        <div class="universe-lock-kicker">已锁定知识星球</div>
        <div class="universe-lock-name">${esc(lockedBall.name)}</div>
        <div class="universe-lock-meta">${lockedBall.articleCount} 篇作品 · ${lockedBall.nodeCount} 个节点</div>
      </div>` : ''}
      <svg id="universeView" viewBox="0 0 ${EARTH_SPHERE_VIEW.width} ${EARTH_SPHERE_VIEW.height}" aria-label="紫黑金领域宇宙">
        <defs>${universeDefsHtml()}</defs>
        <rect x="0" y="0" width="${EARTH_SPHERE_VIEW.width}" height="${EARTH_SPHERE_VIEW.height}" fill="url(#universeBg)"/>
        <g id="universeMotion">
          <g id="universeCamera">
            <g id="galaxyLayer">
              <ellipse class="galaxy-halo" cx="360" cy="238" rx="362" ry="156" transform="rotate(-24 360 238)" fill="url(#galaxyBlue)" opacity="0.78"/>
              <ellipse cx="164" cy="110" rx="220" ry="128" fill="url(#nebulaPurple)" opacity="0.54"/>
              <ellipse cx="552" cy="340" rx="226" ry="136" fill="url(#nebulaGold)" opacity="0.48"/>
              <g id="galaxyArmsLayer"></g>
              <ellipse class="galaxy-core" cx="360" cy="238" rx="132" ry="46" transform="rotate(-24 360 238)" fill="url(#galaxyCore)" opacity="0.86"/>
              <ellipse class="galaxy-dust-lane" cx="360" cy="244" rx="268" ry="13" transform="rotate(-24 360 244)" fill="#030206" opacity="0.32"/>
              <g id="starsLayer"></g>
              <g id="galaxyDustLayer"></g>
            </g>
            <g id="ballLinksLayer"></g>
            <g id="ballsLayer"></g>
          </g>
        </g>
      </svg>
    </div>
    <div class="earth-status universe-status">
      <span>紫黑金知识宇宙 · ${mode === 'domain' ? '按领域分球' : '按项目分球'}${lockedBall ? ` · 锁定 ${esc(lockedBall.name)}` : ''}</span>
      <span>${balls.length} 个知识星球 / ${links.length} 条跨球引力线</span>
    </div>
    <div class="map-legend universe-legend">
      <div class="map-legend-item"><svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(200,200,230,.28)" stroke-width="1" stroke-dasharray="3,4"/></svg><span>跨球同名节点</span></div>
      <div class="map-legend-item"><span class="map-legend-dot" style="background:var(--gold)"></span><span>球越大，作品越多</span></div>
    </div>
  `;

  const starsLayer = container.querySelector('#starsLayer');
  const armsLayer = container.querySelector('#galaxyArmsLayer');
  const dustLayer = container.querySelector('#galaxyDustLayer');
  const ballsLayer = container.querySelector('#ballsLayer');
  const linksLayer = container.querySelector('#ballLinksLayer');
  renderGalaxyArms(armsLayer);
  renderStars(starsLayer, 620);
  renderGalaxyDust(dustLayer, 560);
  renderUniverseBalls(balls, ballsLayer, lockUniverseBall, lockedBallId);
  renderBallLinks(links, balls, linksLayer);
  applyUniverseCameraLock(container, balls, lockedBallId);

  container.querySelector('#universeEnterLockedBtn')?.addEventListener('click', () => {
    const ball = balls.find(item => item.ballId === activeBallId);
    if (ball) enterUniverseBall(ball);
  });
  container.querySelector('#universeUnlockBtn')?.addEventListener('click', async () => {
    activeBallId = null;
    await saveMapState();
    loadMap();
  });
  container.querySelector('#universeDomainBtn')?.addEventListener('click', () => setUniverseMode('domain'));
  container.querySelector('#universeProjectBtn')?.addEventListener('click', () => setUniverseMode('project'));
  container.querySelector('#mapNodeIndexBtn')?.addEventListener('click', () => {
    switchTab('assets', { skipLoad: true });
    loadNodeIndex();
  });
}

function applyUniverseCameraLock(container, balls, lockedBallId) {
  const camera = container.querySelector('#universeCamera');
  if (!camera) return;
  const ball = balls.find(item => item.ballId === lockedBallId);
  if (!ball) {
    camera.setAttribute('transform', 'matrix(1 0 0 1 0 0)');
    return;
  }
  const scale = 3.2;
  const tx = EARTH_SPHERE_VIEW.cx - ball._x * scale;
  const ty = EARTH_SPHERE_VIEW.cy - ball._y * scale;
  camera.setAttribute('transform', `matrix(${scale} 0 0 ${scale} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
}

function rotateEarthSphereItems(items, rotateY, rotateX) {
  (items || []).forEach(item => {
    const afterY = rotateAroundAxis(item.view, { x: 0, y: 1, z: 0 }, rotateY);
    item.view = normalize3(rotateAroundAxis(afterY, { x: 1, y: 0, z: 0 }, rotateX));
  });
}

function updateEarthSpherePositions(state, links) {
  if (!state) return;
  const { earthNodes, demoPoints = [], nodeById, demoLayer, demoElements, nodeLayer, nodeElements, linkElements } = state;
  earthNodes.forEach(node => {
    node.projected = projectSpherePoint(node.view, state.zoom);
  });
  if (state.demoEnabled) {
    demoPoints.forEach(point => {
      point.projected = projectSpherePoint(point.view, state.zoom);
    });
  }

  if (state.demoEnabled && demoLayer && demoElements) {
    [...demoPoints].sort((a, b) => a.projected.z - b.projected.z).forEach(point => {
      const group = demoElements[point.id];
      if (group) demoLayer.appendChild(group);
    });
    demoPoints.forEach(point => {
      const group = demoElements[point.id];
      if (!group) return;
      const depthFade = point.projected.z < 0 ? 0.58 : 1;
      const opacity = Math.max(0.05, point.projected.opacity * depthFade);
      group.setAttribute('transform', `translate(${point.projected.x},${point.projected.y}) scale(${point.projected.scale})`);
      group.style.opacity = opacity.toFixed(3);
    });
  }

  if (nodeLayer) {
    [...earthNodes].sort((a, b) => a.projected.z - b.projected.z).forEach(node => {
      const group = nodeElements[node.id];
      if (group) nodeLayer.appendChild(group);
    });
  }

  earthNodes.forEach(node => {
    const group = nodeElements[node.id];
    if (!group) return;
    group.setAttribute('transform', `translate(${node.projected.x},${node.projected.y}) scale(${node.projected.scale})`);
    group.style.opacity = Math.max(0.08, node.projected.opacity);
  });

  links.forEach((link, index) => {
    const line = linkElements[index];
    const source = nodeById[link.source.id];
    const target = nodeById[link.target.id];
    if (!line || !source || !target) return;
    line.setAttribute('x1', source.projected.x);
    line.setAttribute('y1', source.projected.y);
    line.setAttribute('x2', target.projected.x);
    line.setAttribute('y2', target.projected.y);
    const depthOpacity = ((source.projected.opacity || 1) + (target.projected.opacity || 1)) / 2;
    const backPenalty = source.projected.z < 0 && target.projected.z < 0 ? 0.45 : 1;
    line.style.opacity = Math.max(0.06, Math.min(0.58, depthOpacity * backPenalty * 0.42));
  });
}

function startEarthSphereDrag(event, updatePositions) {
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest?.('.sphere-node')) return;
  if (!earthSphereState) return;

  event.preventDefault();
  hideNodeHoverCard();
  const svg = earthSphereState.svg;
  earthSphereState.drag = { x: event.clientX, y: event.clientY };
  svg.classList.add('rotating');
  svg.setPointerCapture?.(event.pointerId);

  const move = e => {
    const drag = earthSphereState?.drag;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    earthSphereState.drag = { x: e.clientX, y: e.clientY };
    const rotateY = dx * 0.006;
    const rotateX = -dy * 0.006;
    rotateEarthSphereItems(earthSphereState.earthNodes, rotateY, rotateX);
    rotateEarthSphereItems(earthSphereState.demoPoints, rotateY, rotateX);
    updatePositions();
  };

  const end = e => {
    svg.classList.remove('rotating');
    try { svg.releasePointerCapture?.(e.pointerId); } catch {}
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerup', end);
    svg.removeEventListener('pointercancel', end);
    if (earthSphereState) earthSphereState.drag = null;
    resumeNodeHoverAfterDrag(e);
    pauseEarthSphereAutoRotate(1500);
  };

  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}

function resumeNodeHoverAfterDrag(event) {
  if (!earthSphereState || !event) return;
  const el = document.elementFromPoint?.(event.clientX, event.clientY);
  const nodeEl = el?.closest?.('.sphere-node');
  const name = nodeEl?.dataset?.name;
  if (!name) return;
  scheduleShowNodeHoverCard(name, event);
}

function rotateEarthSphereBy(dx, dy) {
  if (!earthSphereState) return;
  const rotateY = dx * 0.006;
  const rotateX = -dy * 0.006;
  rotateEarthSphereItems(earthSphereState.earthNodes, rotateY, rotateX);
  rotateEarthSphereItems(earthSphereState.demoPoints, rotateY, rotateX);
}

function pauseEarthSphereAutoRotate(delay = 1500) {
  if (!earthSphereState) return;
  earthSphereState.autoPausedUntil = Date.now() + delay;
}

function startEarthSphereAutoRotate() {
  const state = earthSphereState;
  if (!state) return;
  if (state.autoFrame) cancelAnimationFrame(state.autoFrame);
  state.lastAutoRotateTs = 0;

  const step = now => {
    if (!earthSphereState || earthSphereState !== state) return;
    const last = state.lastAutoRotateTs || now;
    const delta = Math.min(120, now - last);
    state.lastAutoRotateTs = now;

    if (!state.drag && Date.now() >= state.autoPausedUntil) {
      const angle = delta / 1000 * Math.PI / 180;
      rotateEarthSphereItems(state.earthNodes, angle, 0);
      rotateEarthSphereItems(state.demoPoints, angle, 0);
      updateEarthSpherePositions(state, state.staticLinks || []);
    }
    state.autoFrame = requestAnimationFrame(step);
  };

  state.autoFrame = requestAnimationFrame(step);
}

function stopEarthSphere() {
  hideNodeHoverCard();
  if (earthSphereState?.autoFrame) cancelAnimationFrame(earthSphereState.autoFrame);
  earthSphereState = null;
}

function setEarthSphereZoom(delta) {
  if (!earthSphereState) return;
  hideNodeHoverCard();
  pauseEarthSphereAutoRotate(1500);
  earthSphereState.zoom = Math.max(EARTH_SPHERE_MIN_ZOOM, Math.min(EARTH_SPHERE_MAX_ZOOM, earthSphereState.zoom + delta));
  updateEarthSpherePositions(earthSphereState, earthSphereState.staticLinks || []);
}

function setEarthSphereDemoFill(enabled) {
  earthSphereDemoFillEnabled = !!enabled;
  if (!earthSphereState) return;
  hideNodeHoverCard();
  pauseEarthSphereAutoRotate(800);
  earthSphereState.demoEnabled = earthSphereDemoFillEnabled;
  const button = earthSphereState.svg?.closest('.graph-area')?.querySelector('#earthDemoFillBtn');
  if (button) {
    button.classList.toggle('active', earthSphereDemoFillEnabled);
    button.textContent = earthSphereDemoFillEnabled ? '关闭演示' : '演示星球';
  }
  renderEarthSphereDemoFill(earthSphereState);
  updateEarthSpherePositions(earthSphereState, earthSphereState.staticLinks || []);
  if (earthSphereDemoFillEnabled) maybeShowMapLightModeHint();
}

function resetEarthSphereView() {
  if (!earthSphereState) return;
  hideNodeHoverCard();
  pauseEarthSphereAutoRotate(1500);
  earthSphereState.zoom = EARTH_SPHERE_INITIAL_ZOOM;
  earthSphereState.earthNodes.forEach(node => { node.view = node.base; });
  earthSphereState.demoPoints?.forEach(point => { point.view = point.base; });
  updateEarthSpherePositions(earthSphereState, earthSphereState.staticLinks || []);
}

function openNodeDetailFromMap(name) {
  switchTab('assets', { skipLoad: true });
  showNodeDetail(name);
}

function openArticleFromNodeHover(articleId) {
  const rec = earthSphereState?.hoverArticles?.find(item => item.id === articleId);
  if (!rec) return;
  hideNodeHoverCard();
  switchTab('assets', { skipLoad: true });
  showAssetDetail(rec);
}

function nodeMentionsForHover(name) {
  const key = String(name || '').trim().toLowerCase();
  const articles = earthSphereState?.articles || [];
  return articles.map(rec => {
    const hit = recordNodeMentions(rec).find(n => String(n.name || '').trim().toLowerCase() === key);
    return hit ? { rec, hit } : null;
  }).filter(Boolean).sort((a, b) => String(b.rec.savedAt || '').localeCompare(String(a.rec.savedAt || '')));
}

function renderNodeHoverContent(name) {
  const node = earthSphereState?.earthNodes?.find(n => n.name === name);
  const mentions = nodeMentionsForHover(name);
  if (earthSphereState) earthSphereState.hoverArticles = mentions.map(m => m.rec);
  const typeLabel = TYPE_META[node?.type]?.label || node?.type || '知识节点';
  const listHtml = mentions.length
    ? `<div class="node-hover-list">${mentions.map(({ rec, hit }) => {
        const a = rec.analysis || {};
        const date = (rec.savedAt || '').slice(0, 10);
        const tags = [a.domain, a.sub_domain].filter(Boolean).slice(0, 3)
          .map(t => `<span class="node-hover-tag">${esc(t)}</span>`).join('');
        return `<div class="node-hover-article" data-article-id="${esc(rec.id)}">
          <div class="node-hover-article-top">
            <div class="node-hover-article-title">${esc(rec.article?.title || '（无标题）')}</div>
            <div class="node-hover-date">${esc(date)}</div>
          </div>
          ${tags ? `<div class="node-hover-tags">${tags}</div>` : ''}
          <div class="node-hover-hit"><b>命中点</b> ${esc(hit.contribution || a.core_claim || '')}</div>
        </div>`;
      }).join('')}</div>`
    : `<div class="node-hover-empty">还没有文章明确写到这个节点</div>`;

  return `<div class="node-hover-head">
    <div class="node-hover-title">
      <div class="node-hover-name">${esc(name)}</div>
      <div class="node-hover-sub">${esc(typeLabel)} · 亮度 ${node?.lv || 1} 级</div>
    </div>
    <div class="node-hover-count">命中 ${mentions.length} 篇</div>
  </div>${listHtml}`;
}

function showNodeHoverCard(name, event) {
  const card = document.getElementById('nodeHoverCard');
  if (!card) return;
  clearTimeout(nodeHoverShowTimer);
  clearTimeout(nodeHoverHideTimer);
  nodeHoverPending = { name, x: event.clientX, y: event.clientY };
  card.innerHTML = renderNodeHoverContent(name);
  card.dataset.nodeName = name;
  card.classList.add('visible');
  moveNodeHoverCard(event);
}

function scheduleShowNodeHoverCard(name, event) {
  if (earthSphereState?.drag) return;
  clearTimeout(nodeHoverShowTimer);
  clearTimeout(nodeHoverHideTimer);
  nodeHoverPending = { name, x: event.clientX, y: event.clientY };
  nodeHoverShowTimer = setTimeout(() => {
    if (!nodeHoverPending || nodeHoverPending.name !== name) return;
    showNodeHoverCard(name, nodeHoverPending);
  }, NODE_HOVER_SHOW_DELAY);
}

function trackNodeHoverCard(name, event) {
  if (nodeHoverPending?.name === name) {
    nodeHoverPending = { name, x: event.clientX, y: event.clientY };
  }
  const card = document.getElementById('nodeHoverCard');
  if (card?.classList.contains('visible') && card.dataset.nodeName === name) {
    moveNodeHoverCard(event);
  }
}

function moveNodeHoverCard(event) {
  const card = document.getElementById('nodeHoverCard');
  const area = card?.closest('.graph-area');
  if (!card || !area) return;
  const rect = area.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  let x = event.clientX - rect.left + 14;
  let y = event.clientY - rect.top + 14;
  if (x + cardRect.width > rect.width - 10) x = event.clientX - rect.left - cardRect.width - 14;
  if (y + cardRect.height > rect.height - 10) y = event.clientY - rect.top - cardRect.height - 14;
  card.style.left = `${Math.max(10, x)}px`;
  card.style.top = `${Math.max(10, y)}px`;
}

function scheduleHideNodeHoverCard(delay = 180) {
  clearTimeout(nodeHoverShowTimer);
  clearTimeout(nodeHoverHideTimer);
  nodeHoverPending = null;
  nodeHoverHideTimer = setTimeout(hideNodeHoverCard, delay);
}

function hideNodeHoverCard() {
  clearTimeout(nodeHoverShowTimer);
  clearTimeout(nodeHoverHideTimer);
  nodeHoverPending = null;
  const card = document.getElementById('nodeHoverCard');
  if (!card) return;
  card.classList.remove('visible');
  card.removeAttribute('data-node-name');
}

function bindNodeHoverCard() {
  const card = document.getElementById('nodeHoverCard');
  if (!card || card.dataset.bound === '1') return;
  card.dataset.bound = '1';
  card.addEventListener('pointerenter', () => clearTimeout(nodeHoverHideTimer));
  card.addEventListener('pointerleave', () => scheduleHideNodeHoverCard(180));
  card.addEventListener('click', event => {
    const item = event.target.closest('.node-hover-article');
    if (item?.dataset.articleId) openArticleFromNodeHover(item.dataset.articleId);
  });
}

async function loadMap(options = {}) {
  const [projectArticles, allArticles, allNodes, projects] = await Promise.all([
    dbGetAllArticles({ project: activeProject }),
    dbGetAllArticles(),
    dbGetAllNodes(),
    dbGetProjects(),
  ]);
  const container = document.getElementById('mapTab');
  const hasSavedMapState = await loadMapState();
  const domainBalls = prepareUniverseBalls(allArticles, 'domain');
  const resetToOverview = options?.resetToOverview === true;

  if (resetToOverview) {
    mapView = 'universe';
    activeBallId = null;
    await saveMapState();
  } else if (!hasSavedMapState && domainBalls.length > 1) {
    mapView = 'universe';
    universeMode = 'domain';
    activeBallId = null;
    await saveMapState();
  }

  if (mapView === 'universe') {
    renderUniverseView(allArticles, projects, container, universeMode);
    return;
  }

  let articles = activeBallId
    ? articlesForUniverseBall(allArticles, universeMode, activeBallId)
    : projectArticles;
  if (activeBallId && !articles.length) {
    activeBallId = null;
    articles = projectArticles;
    await saveMapState();
  }

  const articleIds = new Set(articles.map(a => a.id));
  const nodesArr = allNodes.filter(n => n.articles.some(id => articleIds.has(id)));

  if (nodesArr.length < 2) {
    stopMapSimulation();
    container.innerHTML = `<div class="asset-empty">节点太少<br>分析更多文章后知识地图会更丰富</div>`;
    return;
  }

  const { nodes, links } = prepareMapData(articles, nodesArr);
  renderMapView(nodes, links, container, articles);
}

function reviewAnchorsHtml(active = activeReviewSection) {
  return `<nav class="review-anchors" role="navigation" aria-label="复盘区块导航">
    ${REVIEW_ANCHORS.map(([id, label]) =>
      `<button class="review-anchor${id === active ? ' active' : ''}" type="button" data-anchor="${esc(id)}">${esc(label)}</button>`
    ).join('')}
  </nav>`;
}

function reviewNavBlockHtml(active = activeReviewSection) {
  return `<div class="review-nav-block" aria-label="复盘导航">
    <div class="review-nav-title">复盘</div>
    ${reviewAnchorsHtml(active)}
  </div>`;
}

function reviewAnchorSection(id, title, content) {
  return `<section id="review-${esc(id)}" class="review-section" data-review-section="${esc(id)}">
    <div class="review-section-title">${esc(title)}</div>
    ${content || '<div class="dashboard-muted">这一块还需要更多创作记录点亮。</div>'}
  </section>`;
}

function reviewSubBlock(title, content) {
  return content
    ? `<div class="review-sub-block">
        <div class="review-section-title">${esc(title)}</div>
        ${content}
      </div>`
    : '';
}

function bindReviewAnchors(container) {
  const buttons = [...(container?.querySelectorAll('.review-anchor') || [])];
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.anchor;
      if (!REVIEW_ANCHORS.some(([id]) => id === next)) return;
      if (activeReviewSection === next) return;
      activeReviewSection = next;
      loadReview();
    });
  });
}

function reviewStatRow(totalArticles, totalDomains, totalNodes, totalIdeas = 0) {
  return `<div class="review-stat-row">
    <div class="review-stat"><div class="review-stat-num">${totalArticles}</div><div class="review-stat-label">已分析</div></div>
    <div class="review-stat"><div class="review-stat-num">${totalDomains}</div><div class="review-stat-label">涉及领域</div></div>
    <div class="review-stat"><div class="review-stat-num">${totalNodes}</div><div class="review-stat-label">累计节点</div></div>
    <div class="review-stat"><div class="review-stat-num">${totalIdeas}</div><div class="review-stat-label">速记</div></div>
  </div>`;
}

function reviewCharCount(rec) {
  return String(rec?.article?.body || '').length;
}

function reviewStartOfWeek(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
  return d;
}

function reviewStartOfMonth(now = new Date(), offset = 0) {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function reviewInRange(records, start, end) {
  return records.filter(rec => {
    const d = reviewSavedDate(rec);
    return d && d >= start && d < end;
  });
}

function reviewMetricSummary(records, now = new Date()) {
  const weekStart = reviewStartOfWeek(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  const monthStart = reviewStartOfMonth(now);
  const nextMonth = reviewStartOfMonth(now, 1);
  const prevMonthStart = reviewStartOfMonth(now, -1);

  const thisWeek = reviewInRange(records, weekStart, nextWeek);
  const lastWeek = reviewInRange(records, lastWeekStart, weekStart);
  const thisMonth = reviewInRange(records, monthStart, nextMonth);
  const lastMonth = reviewInRange(records, prevMonthStart, monthStart);
  const recent30 = reviewRecent(records, 30, now);

  const sumChars = list => list.reduce((sum, rec) => sum + reviewCharCount(rec), 0);
  return {
    weekArticles: thisWeek.length,
    weekArticleDelta: thisWeek.length - lastWeek.length,
    weekChars: sumChars(thisWeek),
    weekCharsDelta: sumChars(thisWeek) - sumChars(lastWeek),
    dailyFreq: Number((recent30.length / 30).toFixed(2)),
    monthArticles: thisMonth.length,
    monthArticleDelta: thisMonth.length - lastMonth.length,
    monthChars: sumChars(thisMonth),
    monthCharsDelta: sumChars(thisMonth) - sumChars(lastMonth),
  };
}

function reviewTrendText(delta, unit = '') {
  if (delta > 0) return `比上期 +${formatMetricNumber(delta)}${unit}`;
  if (delta < 0) return `比上期 ${formatMetricNumber(delta)}${unit}`;
  return '与上期持平';
}

function reviewDomainWordStats(records) {
  const byDomain = {};
  for (const rec of records) {
    const domain = rec.article?.type === 'idea'
      ? '速记'
      : (rec.analysis?.domain || '未分类');
    byDomain[domain] = (byDomain[domain] || 0) + reviewCharCount(rec);
  }
  return Object.entries(byDomain)
    .map(([domain, chars]) => ({ domain, chars }))
    .sort((a, b) => b.chars - a.chars || a.domain.localeCompare(b.domain, 'zh-Hans-CN'));
}

function renderReviewTopStats(records, now = new Date()) {
  const stats = reviewMetricSummary(records, now);
  const domainWords = reviewDomainWordStats(records).slice(0, 6);
  const maxChars = Math.max(1, ...domainWords.map(d => d.chars));
  const bars = domainWords.length
    ? domainWords.map(d => `<div class="review-domain-word">
      <span class="review-domain-name">${esc(d.domain)}</span>
      <div class="review-domain-track"><div class="review-domain-fill" style="width:${Math.round(d.chars / maxChars * 100)}%"></div></div>
      <span class="review-domain-count">${formatMetricNumber(d.chars)}字</span>
    </div>`).join('')
    : `<div class="dashboard-muted">还没有足够的字数分布</div>`;

  return `<div class="review-focus">
    <div class="review-focus-grid">
      <div class="review-focus-card">
        <div class="review-focus-label">本周作品</div>
        <div class="review-focus-value">${stats.weekArticles}</div>
        <div class="review-focus-trend">${esc(reviewTrendText(stats.weekArticleDelta, '篇'))}</div>
      </div>
      <div class="review-focus-card">
        <div class="review-focus-label">本周字数</div>
        <div class="review-focus-value">${formatMetricNumber(stats.weekChars)}</div>
        <div class="review-focus-trend">${esc(reviewTrendText(stats.weekCharsDelta, '字'))}</div>
      </div>
      <div class="review-focus-card">
        <div class="review-focus-label">日均频率</div>
        <div class="review-focus-value">${stats.dailyFreq}</div>
        <div class="review-focus-trend">篇/天（30天）</div>
      </div>
      <div class="review-focus-card">
        <div class="review-focus-label">月度对比</div>
        <div class="review-focus-value">${stats.monthArticles}</div>
        <div class="review-focus-trend">${esc(reviewTrendText(stats.monthArticleDelta, '篇'))} · ${formatMetricNumber(stats.monthChars)}字</div>
      </div>
    </div>
    <div class="review-domain-wordbar">${bars}</div>
  </div>`;
}

function reviewSavedDate(rec) {
  const d = new Date(rec.savedAt || '');
  return Number.isNaN(d.getTime()) ? null : d;
}

function reviewDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function reviewCutoff(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days + 1);
  return d;
}

function reviewRecent(records, days = 30, now = new Date()) {
  const cutoff = reviewCutoff(days, now);
  return records.filter(rec => {
    const d = reviewSavedDate(rec);
    return d && d >= cutoff;
  });
}

function reviewCountByDay(articles, ideas, days = 30, now = new Date()) {
  const cutoff = reviewCutoff(days, now);
  const buckets = [];
  const byKey = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    const key = reviewDateKey(d);
    const bucket = { key, label: key.slice(5), articles: 0, ideas: 0 };
    buckets.push(bucket);
    byKey[key] = bucket;
  }

  const add = (rec, field) => {
    const d = reviewSavedDate(rec);
    if (!d) return;
    const key = reviewDateKey(d);
    if (byKey[key]) byKey[key][field]++;
  };
  articles.forEach(rec => add(rec, 'articles'));
  ideas.forEach(rec => add(rec, 'ideas'));
  return buckets;
}

function reviewNodeReuseStats(articles) {
  const byKey = {};
  for (const rec of articles) {
    const seen = new Set();
    for (const node of recordNodeMentions(rec)) {
      const name = String(node.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!byKey[key]) byKey[key] = { name, type: node.type || 'concept', count: 0 };
      byKey[key].count++;
    }
  }
  const nodes = Object.values(byKey).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  const repeated = nodes.filter(n => n.count >= 2);
  return {
    total: nodes.length,
    repeated: repeated.length,
    ratio: nodes.length ? Math.round(repeated.length / nodes.length * 100) : 0,
    topNodes: repeated.slice(0, 5),
  };
}

function reviewDomainShift(articles) {
  const cutoff = reviewCutoff(30);
  const recent = {};
  const earlier = {};
  for (const rec of articles) {
    const domain = rec.analysis?.domain || '未分类';
    const d = reviewSavedDate(rec);
    if (d && d >= cutoff) recent[domain] = (recent[domain] || 0) + 1;
    else earlier[domain] = (earlier[domain] || 0) + 1;
  }
  const recentList = Object.entries(recent).sort((a, b) => b[1] - a[1]);
  const earlierSet = new Set(Object.keys(earlier));
  const newDomains = recentList.filter(([name]) => !earlierSet.has(name)).map(([name]) => name);

  if (!recentList.length) {
    return `<div class="dashboard-muted">近30天还没有新的分析记录</div>`;
  }

  const focus = recentList.slice(0, 3).map(([name, count]) =>
    `<span class="dashboard-pill">${esc(name)} · ${count}</span>`).join('');
  const fresh = newDomains.length
    ? `<div class="dashboard-note">新出现：${esc(newDomains.slice(0, 3).join(' · '))}</div>`
    : `<div class="dashboard-note">近期领域与旧有积累保持连续</div>`;
  return `<div class="dashboard-pill-row">${focus}</div>${fresh}`;
}

function reviewRhythm(articles, ideas) {
  const buckets = reviewCountByDay(articles, ideas, 30);
  const maxCount = Math.max(1, ...buckets.map(b => b.articles + b.ideas));
  const cells = buckets.map(b => {
    const total = b.articles + b.ideas;
    const height = total ? Math.max(6, Math.round(total / maxCount * 28)) : 4;
    const state = total
      ? (b.articles && b.ideas ? 'mixed' : (b.ideas ? 'idea-only' : 'active'))
      : '';
    return `<span class="rhythm-cell ${state}" style="height:${height}px" title="${esc(`${b.key} · 分析 ${b.articles} · 速记 ${b.ideas}`)}"></span>`;
  }).join('');
  return `<div class="rhythm-panel">
    <div class="rhythm-bars">${cells}</div>
    <div class="rhythm-meta"><span>30天前</span><span>今天</span></div>
  </div>`;
}

function reviewDashboard(articles, ideas) {
  const recentArticles = reviewRecent(articles, 30);
  const recentIdeas = reviewRecent(ideas, 30);
  const activeDays = new Set([...recentArticles, ...recentIdeas]
    .map(reviewSavedDate)
    .filter(Boolean)
    .map(reviewDateKey)).size;
  const weeklyAvg = (recentArticles.length / 30 * 7).toFixed(1);
  const reuse = reviewNodeReuseStats(articles);
  const topNode = reuse.topNodes[0];

  return `<div class="dashboard-grid">
    <div class="dashboard-card">
      <div class="dashboard-label">近30天分析</div>
      <div class="dashboard-num">${recentArticles.length}</div>
      <div class="dashboard-note">${weeklyAvg} 篇/周</div>
    </div>
    <div class="dashboard-card">
      <div class="dashboard-label">活跃天数</div>
      <div class="dashboard-num">${activeDays}</div>
      <div class="dashboard-note">含分析与速记</div>
    </div>
    <div class="dashboard-card">
      <div class="dashboard-label">速记池</div>
      <div class="dashboard-num">${ideas.length}</div>
      <div class="dashboard-note">近30天新增 ${recentIdeas.length}</div>
    </div>
    <div class="dashboard-card">
      <div class="dashboard-label">节点复用</div>
      <div class="dashboard-num">${reuse.ratio}%</div>
      <div class="dashboard-note">${reuse.repeated}/${reuse.total} 个节点重复出现</div>
    </div>
  </div>
  ${reviewRhythm(articles, ideas)}
  <div class="dashboard-two-col">
    <div class="dashboard-panel">
      <div class="dashboard-panel-title">领域演化</div>
      ${reviewDomainShift(articles)}
    </div>
    <div class="dashboard-panel">
      <div class="dashboard-panel-title">复用核心</div>
      ${topNode
        ? `<div class="dashboard-node-main">「${esc(topNode.name)}」</div><div class="dashboard-note">贯穿 ${topNode.count} 篇内容，含 Markdown 链接</div>`
        : `<div class="dashboard-muted">还没有重复出现的节点</div>`}
    </div>
  </div>`;
}

function reviewPeriod(articles) {
  const now        = new Date();
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() || 7) - 1));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeek   = articles.filter(r => new Date(r.savedAt) >= weekStart);
  const thisMonth  = articles.filter(r => new Date(r.savedAt) >= monthStart);
  const topics = list => {
    const ds = [...new Set(list.map(r => r.analysis?.domain).filter(Boolean))];
    return ds.length ? ds.slice(0, 3).join(' · ') : '—';
  };
  return `<div class="period-row">
    <div class="period-card">
      <div class="period-label">本周</div>
      <div class="period-num">${thisWeek.length}</div>
      <div class="period-topics">${esc(topics(thisWeek))}</div>
    </div>
    <div class="period-card">
      <div class="period-label">本月</div>
      <div class="period-num">${thisMonth.length}</div>
      <div class="period-topics">${esc(topics(thisMonth))}</div>
    </div>
  </div>`;
}

function reviewPatterns(articles, nodesArr, domainList, totalArticles, totalDomains) {
  const now      = new Date();
  const patterns = [];
  if (domainList.length) {
    const [topDomain, topCount] = domainList[0];
    patterns.push(`你最常写的领域是「${topDomain}」，占全部内容的 ${Math.round(topCount / totalArticles * 100)}%`);
  }
  if (totalDomains >= 4) patterns.push(`你的创作跨越 ${totalDomains} 个领域，是个跨学科创作者`);
  else if (totalDomains === 1) patterns.push(`你深耕「${domainList[0][0]}」一个领域，专注度很高`);
  const recent30 = articles.filter(r => new Date(r.savedAt) >= new Date(now - 30 * 864e5));
  if (recent30.length) patterns.push(`近30天平均每周分析 ${(recent30.length / 30 * 7).toFixed(1)} 篇`);
  const freq = n => n.count ?? n.articles.length;
  const topNode = [...nodesArr].sort((a, b) => freq(b) - freq(a))[0];
  const topNodeCount = topNode ? freq(topNode) : 0;
  if (topNodeCount >= 2) patterns.push(`「${topNode.name}」是你写作中出现最多的节点，贯穿 ${topNodeCount} 篇文章`);
  if (articles.length >= 6) {
    const recentDs = [...new Set(articles.slice(0, 3).map(r => r.analysis?.domain).filter(Boolean))];
    const olderDs  = [...new Set(articles.slice(-3).map(r => r.analysis?.domain).filter(Boolean))];
    const newFocus = recentDs.filter(d => !olderDs.includes(d));
    if (newFocus.length) patterns.push(`近期你开始更多写「${newFocus[0]}」方向的内容`);
  }
  return patterns.map(p => `<div class="pattern-item">${esc(p)}</div>`).join('');
}

function reviewLitDirections(articles) {
  const counts = {};
  for (const rec of articles) {
    const domain = String(rec.analysis?.domain || '').trim();
    if (domain) counts[domain] = (counts[domain] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function reviewDirectionLabel(value, fallback = '未细分') {
  const text = String(value || '').trim();
  return text || fallback;
}

function reviewDirectionTitle(rec) {
  return String(rec.article?.title || '未命名作品').trim() || '未命名作品';
}

function reviewDirectionAddPoint(bucket, item, rec) {
  const name = reviewDirectionLabel(item?.name, '');
  if (!name) return;
  const key = name.toLowerCase();
  if (!bucket.points.has(key)) {
    bucket.points.set(key, {
      name,
      type: item?.type || 'concept',
      count: 0,
      articles: new Set(),
      contributions: [],
      latestTitle: reviewDirectionTitle(rec),
    });
  }
  const point = bucket.points.get(key);
  if (!point.articles.has(rec.id)) {
    point.articles.add(rec.id);
    point.count++;
  }
  const contribution = String(item?.contribution || item?.role || '').trim();
  if (contribution && point.contributions.length < 2) point.contributions.push(contribution);
}

function reviewDirectionKnowledgeItems(rec) {
  const analysis = rec.analysis || {};
  const items = [];
  for (const node of recordNodeMentions(rec)) {
    items.push({
      name: node.name,
      type: node.type || 'concept',
      role: node.role || '',
      contribution: node.contribution || '',
    });
  }
  for (const name of analysis.new_concepts || []) {
    items.push({ name, type: 'concept', role: 'new', contribution: '新引入概念' });
  }
  for (const name of analysis.tags || []) {
    items.push({ name, type: 'tag', role: 'tag', contribution: '作品标签' });
  }
  const perspective = String(analysis.perspective || '').trim();
  if (perspective) items.push({ name: perspective, type: 'perspective', role: 'view', contribution: '分析视角' });

  const seen = new Set();
  return items.filter(item => {
    const name = reviewDirectionLabel(item.name, '');
    const key = name.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    item.name = name;
    return true;
  }).slice(0, 10);
}

function reviewDirectionMap(articles) {
  const records = articles
    .filter(rec => rec.article?.type !== 'idea')
    .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
  const domains = new Map();

  for (const rec of records) {
    const analysis = rec.analysis || {};
    const domainName = reviewDirectionLabel(analysis.domain, '未分类');
    const subName = reviewDirectionLabel(analysis.sub_domain || analysis.perspective, '未细分');
    const title = reviewDirectionTitle(rec);
    const id = rec.id || `${domainName}:${subName}:${title}`;

    if (!domains.has(domainName)) {
      domains.set(domainName, {
        name: domainName,
        count: 0,
        articles: new Set(),
        works: [],
        subdomains: new Map(),
        points: new Map(),
        latestClaim: '',
      });
    }
    const domain = domains.get(domainName);
    if (!domain.articles.has(id)) {
      domain.articles.add(id);
      domain.count++;
      if (domain.works.length < 4) domain.works.push({ title, savedAt: rec.savedAt || '' });
      if (!domain.latestClaim && analysis.core_claim) domain.latestClaim = String(analysis.core_claim).trim();
    }

    if (!domain.subdomains.has(subName)) {
      domain.subdomains.set(subName, {
        name: subName,
        count: 0,
        articles: new Set(),
        works: [],
        points: new Map(),
        latestClaim: '',
      });
    }
    const sub = domain.subdomains.get(subName);
    if (!sub.articles.has(id)) {
      sub.articles.add(id);
      sub.count++;
      if (sub.works.length < 3) sub.works.push({ title, savedAt: rec.savedAt || '' });
      if (!sub.latestClaim && analysis.core_claim) sub.latestClaim = String(analysis.core_claim).trim();
    }

    for (const item of reviewDirectionKnowledgeItems(rec)) {
      reviewDirectionAddPoint(domain, item, rec);
      reviewDirectionAddPoint(sub, item, rec);
    }
  }

  const sortPoints = points => [...points.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 8);

  return [...domains.values()]
    .map(domain => ({
      ...domain,
      points: sortPoints(domain.points),
      subdomains: [...domain.subdomains.values()]
        .map(sub => ({ ...sub, points: sortPoints(sub.points) }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
        .slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 6);
}

function reviewDirectionGrowthHints(domain) {
  const sub = domain.subdomains?.[0];
  const point = (sub?.points?.[0] || domain.points?.[0]);
  const hints = [];
  if (sub) {
    const target = `「${domain.name} → ${sub.name}」`;
    hints.push(sub.count >= 3
      ? `${target}已经有连续积累，下一篇可以写反例、边界条件或现实迁移，避免只在同一个判断里打转。`
      : `先把${target}补到 3 篇左右，让它从零散兴趣变成一个小专题。`);
  }
  if (point) {
    hints.push(`把「${point.name}」从关键词扩成知识点：补定义、案例、反例和可迁移场景，后续就能成为你的稳定方法。`);
  }
  if ((domain.subdomains?.length || 0) <= 1) {
    hints.push(`这个大方向还缺相邻子领域，下一篇可以从背景脉络、人物/案例、方法论里选一个入口。`);
  }
  return hints.slice(0, 2);
}

function renderReviewDirectionMap(articles) {
  const domains = reviewDirectionMap(articles);
  if (!domains.length) {
    return `<div class="tl-block">
      <div class="tl-block-title">方向地图</div>
      <div class="tl-empty">还没有足够作品形成方向地图。先分析一篇文章，知识图鉴会开始识别大领域、子领域和具体知识点。</div>
    </div>`;
  }

  const cards = domains.map(domain => {
    const subHtml = domain.subdomains.length
      ? domain.subdomains.map(sub => {
          const pointChips = sub.points.length
            ? sub.points.slice(0, 5).map(point => `<span class="direction-point">${esc(point.name)}${point.count > 1 ? ` · ${point.count}` : ''}</span>`).join('')
            : '<span class="direction-point muted">等待知识点沉淀</span>';
          const works = sub.works.map(work => `<span class="direction-work" title="${esc(work.title)}">《${esc(work.title)}》</span>`).join('');
          return `<div class="direction-subdomain">
            <div class="direction-sub-head">
              <span class="direction-sub-name">${esc(sub.name)}</span>
              <span class="direction-sub-count">${sub.count} 篇</span>
            </div>
            <div class="direction-points">${pointChips}</div>
            ${sub.latestClaim ? `<div class="direction-claim">${esc(sub.latestClaim)}</div>` : ''}
            ${works ? `<div class="direction-works">${works}</div>` : ''}
          </div>`;
        }).join('')
      : '<div class="dashboard-muted">这个方向还没有拆出明确子领域。</div>';
    const hints = reviewDirectionGrowthHints(domain)
      .map(hint => `<div class="direction-growth-item">${esc(hint)}</div>`)
      .join('');
    return `<div class="direction-domain-card">
      <div class="direction-domain-head">
        <div>
          <div class="direction-domain-name">${esc(domain.name)}</div>
          <div class="direction-domain-meta">${domain.count} 篇作品 · ${domain.subdomains.length} 个子领域 · ${domain.points.length} 个知识点</div>
        </div>
      </div>
      <div class="direction-subdomain-list">${subHtml}</div>
      <div class="direction-growth">
        <div class="direction-growth-title">下一步成长抓手</div>
        ${hints || '<div class="dashboard-muted">继续分析作品后，知识图鉴会给出更具体的成长抓手。</div>'}
      </div>
    </div>`;
  }).join('');

  return `<div class="tl-block direction-map-block">
    <div class="tl-block-title">方向地图：大领域 → 子领域 → 知识点</div>
    <div class="direction-map-note">这里不只统计次数，而是把已有文章放回结构里：你在哪个大方向持续投入，已经长出哪些子领域，哪些知识点值得继续深挖。</div>
    <div class="direction-domain-list">${cards}</div>
  </div>`;
}

function reviewBlankSpotFallback(articles) {
  const map = reviewDirectionMap(articles);
  const top = map[0];
  if (top) {
    const sub = top.subdomains?.[0];
    const point = sub?.points?.[0] || top.points?.[0];
    if (sub && point) {
      return `你已经在「${top.name}」下进入「${sub.name}」，下一步可以把「${point.name}」从反复出现的词，推进成一个可讲清定义、案例、反例和迁移场景的知识点。`;
    }
    if (sub) {
      return `你已经在「${top.name}」下形成「${sub.name}」分支，下一步可以补一个相邻子领域，让这个方向从单线积累变成可展开的知识版图。`;
    }
  }
  const text = articles.map(rec =>
    [rec.analysis?.domain, rec.analysis?.sub_domain, rec.analysis?.perspective]
      .filter(Boolean).join(' ')
  ).join(' ');
  const candidates = ['人物细读', '反方论证', '历史脉络', '语言风格', '结构拆解', '跨领域类比'];
  const blanks = candidates.filter(item => !text.includes(item)).slice(0, 3);
  return blanks.length
    ? `可以试试 ${blanks.join('、')}。这些视角能把已有作品从“观点成立”推到“材料和方法更丰富”。`
    : '你已经覆盖了不少视角，下一步可以把同一主题拆成正反两篇，训练论证弹性。';
}

function reviewWritingPatternFallback(articles) {
  const map = reviewDirectionMap(articles);
  const top = map[0];
  if (top) {
    const sub = top.subdomains?.[0];
    const point = sub?.points?.[0] || top.points?.[0];
    const path = [top.name, sub?.name, point?.name].filter(Boolean).join(' → ');
    return `你的作品已经不是简单散点，而是在形成「${path}」这样的方向路径。继续沿着这个路径写，优势会从兴趣变成方法。`;
  }
  const domain = reviewLitDirections(articles)[0]?.name;
  const craftSummaries = articles
    .map(rec => rec.analysis?.craft_review?.summary)
    .filter(Boolean);
  const strengths = articles
    .map(rec => rec.analysis?.creator_strength)
    .filter(Boolean);
  if (craftSummaries.length) return craftSummaries[0];
  if (strengths.length) return strengths[0];
  return domain
    ? `你已经围绕「${domain}」形成稳定积累，写作模式正在从单篇判断转向连续观察。`
    : '当前样本还少，先保持每篇都沉淀一个明确判断和一个可复用素材。';
}

function reviewDirectionFallback(articles) {
  return {
    blank_spots: reviewBlankSpotFallback(articles),
    writing_pattern: reviewWritingPatternFallback(articles),
  };
}

function renderReviewDirectionAnalysis(articles, guidance = reviewDirectionFallback(articles)) {
  const lit = reviewLitDirections(articles);
  const chips = lit.length
    ? lit.map(item => `<span class="tl-chip">${esc(item.name)} · ${item.count}</span>`).join('')
    : '<span class="tl-chip muted">等待更多作品点亮方向</span>';
  return `<div class="review-direction">
    <div class="tl-block">
      <div class="tl-block-title">已被点亮的方向</div>
      <div class="tl-chip-row">${chips}</div>
    </div>
    ${renderReviewDirectionMap(articles)}
    <div class="tl-block">
      <div class="tl-block-title">尚未出现的视角</div>
      <div class="tl-feedback" id="reviewBlankSpots">${esc(guidance.blank_spots || '')}</div>
    </div>
    <div class="tl-block">
      <div class="tl-block-title">已建立的写作模式</div>
      <div class="tl-feedback" id="reviewWritingPattern">${esc(guidance.writing_pattern || '')}</div>
    </div>
  </div>`;
}

function reviewWeekCacheKey(now = new Date()) {
  const monday = reviewStartOfWeek(now);
  return [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildReviewSystemPrompt(articles, now = new Date()) {
  const items = [...articles]
    .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
    .slice(0, 24)
    .map((rec, index) => {
      const a = rec.analysis || {};
      const nodes = recordNodeMentions(rec).slice(0, 8).map(n => `${n.name}(${n.type || 'concept'})`).join('、');
      const suggestions = (a.next_suggestions || []).slice(0, 3)
        .map(s => [s.type, s.suggestion, s.reason].filter(Boolean).join('：'))
        .join('；');
      return `${index + 1}. ${rec.article?.title || '未命名'}｜${(rec.savedAt || '').slice(0, 10)}
领域：${a.domain || '未分类'} / ${a.sub_domain || ''}
视角：${a.perspective || ''}
知识点：${nodes || '无'}
地图位置：${a.map_position || ''}
核心判断：${a.core_claim || ''}
创作者优势：${a.creator_strength || ''}
写作技法总评：${a.craft_review?.summary || ''}
延伸建议：${suggestions || '无'}`;
    }).join('\n\n');
  return `请基于以下作品记录，为创作者生成本周复盘方向分析。
当前日期：${now.toISOString().slice(0, 10)}

只返回 JSON，不要 markdown：
{"blank_spots":"必须基于已有文章指出一个可补的大方向/子领域/知识点，80字以内","writing_pattern":"必须说明创作者正在形成的方向路径，不要只做数据归纳，80字以内"}

作品记录：
${items || '暂无作品'}`;
}

function parseReviewGuidance(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const blank = String(parsed.blank_spots || '').trim();
    const pattern = String(parsed.writing_pattern || '').trim();
    return blank || pattern ? { blank_spots: blank, writing_pattern: pattern } : null;
  } catch {
    return null;
  }
}

function updateReviewGuidance(guidance) {
  const blank = document.getElementById('reviewBlankSpots');
  const pattern = document.getElementById('reviewWritingPattern');
  if (blank && guidance?.blank_spots) blank.textContent = guidance.blank_spots;
  if (pattern && guidance?.writing_pattern) pattern.textContent = guidance.writing_pattern;
}

async function loadReviewGuidance(articles) {
  if (!articles.length || typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const fallback = reviewDirectionFallback(articles);
  const cacheKey = `review_guidance_${activeProject}_${reviewWeekCacheKey()}`;
  try {
    const cached = await chrome.storage.local.get(cacheKey);
    if (cached?.[cacheKey]) {
      updateReviewGuidance(cached[cacheKey]);
      return;
    }

    const [settings, apiKeys] = await Promise.all([
      chrome.storage.sync.get(['provider', 'model']),
      getStoredApiKeys(),
    ]);
    const { provider, model } = resolveProviderModel(settings);
    const apiKey = getApiKeyForProvider(provider, apiKeys);
    if (!apiKey) return;

    const raw = await callLLM(apiKey, provider, model, [
      { role: 'system', content: '你是创作者的周复盘教练，回答必须克制、具体、可执行。' },
      { role: 'user', content: buildReviewSystemPrompt(articles) },
    ], 900);
    const parsed = parseReviewGuidance(raw) || fallback;
    await chrome.storage.local.set({ [cacheKey]: parsed });
    updateReviewGuidance(parsed);
  } catch (e) {
    debugLog('[知识图鉴 panel] review guidance fallback:', e.message);
  }
}

function reviewIsoWeekInfo(now = new Date()) {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year, week };
}

function reviewWeeklyReportKey(now = new Date()) {
  const { year, week } = reviewIsoWeekInfo(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function reviewWeeklyLabel(now = new Date()) {
  const { year, week } = reviewIsoWeekInfo(now);
  return `${year} 第 ${week} 周`;
}

function reviewWeeklyStats(articles, now = new Date()) {
  const weekStart = reviewStartOfWeek(now);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  const weekArticles = reviewInRange(articles, weekStart, nextWeek);
  const domains = new Set(weekArticles.map(rec => rec.analysis?.domain || '').filter(Boolean));
  const chars = weekArticles.reduce((sum, rec) => sum + reviewCharCount(rec), 0);
  return {
    articles: weekArticles,
    count: weekArticles.length,
    chars,
    domainCount: domains.size,
    statsText: `本周 ${weekArticles.length} 篇 / ${chars} 字 / 涉及 ${domains.size} 个领域`,
  };
}

function weeklyKnowledgePointsForArticle(a = {}) {
  return compactTextList([
    a.domain,
    a.sub_domain,
    a.perspective,
    ...(a.nodes_hit || []).map(n => n.name),
    ...(a.connections || []),
    ...(a.new_concepts || []),
  ]).slice(0, 5);
}

function weeklyReadingPlanFallback(articles = []) {
  const items = [];
  articles.forEach(rec => {
    const a = rec.analysis || {};
    const field = compactTextList([a.domain, a.sub_domain]).join(' / ') || '本周创作方向';
    const points = weeklyKnowledgePointsForArticle(a);
    normalizeRecommendedBooks(a).forEach(book => {
      items.push({
        title: book.title,
        direction: a.perspective || a.core_claim || '补强本周文章背后的解释力',
        field,
        knowledge_points: points,
        why: book.body || `它能补强你本周在「${field}」里已经露出的兴趣和判断。`,
        how_to_use: '周末读的时候只抓一个概念、一条案例或一个反例，下周接回旧文章继续写。',
      });
    });
  });
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.title || '').replace(/\s+/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function normalizeWeeklyReadingPlan(plan = [], articles = []) {
  const raw = Array.isArray(plan) ? plan : [];
  const parsed = raw.map(item => {
    if (typeof item === 'string') {
      return { title: item, direction: '', field: '', knowledge_points: [], why: '', how_to_use: '' };
    }
    return {
      title: String(item?.title || item?.book || item?.name || item?.书名 || '').trim(),
      direction: String(item?.direction || item?.theme || item?.why_direction || item?.方向 || '').trim(),
      field: String(item?.field || item?.domain || item?.area || item?.领域 || '').trim(),
      knowledge_points: compactTextList(Array.isArray(item?.knowledge_points)
        ? item.knowledge_points
        : Array.isArray(item?.知识点)
          ? item.知识点
          : String(item?.knowledge_points || item?.points || item?.知识点 || '').split(/[、,，/]/)),
      why: String(item?.why || item?.reason || item?.why_this_week || item?.理由 || '').trim(),
      how_to_use: String(item?.how_to_use || item?.use || item?.action || item?.用法 || '').trim(),
    };
  }).filter(item => item.title);
  return (parsed.length ? parsed : weeklyReadingPlanFallback(articles)).slice(0, 4);
}

function renderWeeklyReadingPlan(items = []) {
  const list = normalizeWeeklyReadingPlan(items);
  if (!list.length) return '';
  const html = list.map(item => `
    <div class="weekly-reading-item">
      <div class="weekly-reading-title">《${esc(item.title)}》</div>
      ${item.direction ? `<div class="weekly-reading-line"><b>方向</b>${esc(item.direction)}</div>` : ''}
      ${item.field ? `<div class="weekly-reading-line"><b>领域</b>${esc(item.field)}</div>` : ''}
      ${item.knowledge_points?.length ? `<div class="weekly-reading-points">${item.knowledge_points.map(point => `<span>${esc(point)}</span>`).join('')}</div>` : ''}
      ${item.why ? `<p>${esc(item.why)}</p>` : ''}
      ${item.how_to_use ? `<p>${esc(item.how_to_use)}</p>` : ''}
    </div>`).join('');
  return `<div class="weekly-report-block weekly-report-reading"><span>周末书单与知识复利</span>${html}</div>`;
}

function buildWeeklyReportPrompt(articles, allArticles = articles, now = new Date()) {
  const stats = reviewWeeklyStats(articles, now);
  const historicalDomains = [...new Set(allArticles.map(rec => rec.analysis?.domain).filter(Boolean))].slice(0, 12).join('、') || '暂无';
  const items = stats.articles.map((rec, index) => {
    const a = rec.analysis || {};
    const books = normalizeRecommendedBooks(a).map(book => `${book.title}${book.body ? `（${book.body}）` : ''}`).join('；');
    const points = weeklyKnowledgePointsForArticle(a).join('、');
    const tags = (a.tags || []).join('、');
    return `${index + 1}. ${rec.article?.title || '未命名'}｜${(rec.savedAt || '').slice(0, 10)}
核心判断：${a.core_claim || '无'}
创作者优势：${a.creator_strength || '无'}
相邻领域/知识点：${points || '无'}
已有书单线索：${books || '无'}
标签：${tags || '无'}`;
  }).join('\n\n') || '本周暂无作品';

  return `请为创作者生成一份本周复盘报告。
当前周：${reviewWeeklyLabel(now)}
统计：${stats.statsText}
历史已覆盖领域：${historicalDomains}

只返回 JSON，不要 markdown：
{
  "week_label": "${reviewWeeklyLabel(now)}",
  "highlight": "本周亮点：你这周写得最好的 1-2 篇及理由。语气具体、亲近，80-140字",
  "blank": "空白机会：基于本周作品和历史地图，给下周建议方向，60-120字",
  "reading_plan": [
    {
      "title": "推荐书名",
      "direction": "这本书对应创作者已经显露出的哪个成长方向",
      "field": "领域/子领域",
      "knowledge_points": ["具体知识点1", "具体知识点2", "具体知识点3"],
      "why": "为什么这周适合读它，必须对应本周文章",
      "how_to_use": "读完后如何反哺下一篇知乎创作"
    }
  ],
  "stats": "${stats.statsText}"
}

本周作品：
${items}`;
}

function normalizeWeeklyReport(report = {}, articles = [], now = new Date()) {
  const stats = reviewWeeklyStats(articles, now);
  return {
    week_label: String(report.week_label || reviewWeeklyLabel(now)).trim(),
    highlight: formalizeProductName(String(report.highlight || `知识图鉴看了你这周写的 ${stats.count} 篇文章，最想提醒你的是：继续保留那些能把观察变成判断的段落。`).trim()),
    blank: formalizeProductName(String(report.blank || '下周可以试着补一个反方视角，或者把本周最有潜力的一篇扩写成系列。').trim()),
    reading_plan: normalizeWeeklyReadingPlan(report.reading_plan || report.reading || report.weekend_books || [], stats.articles),
    stats: String(report.stats || stats.statsText).trim(),
    generatedAt: report.generatedAt || new Date().toISOString(),
  };
}

function parseWeeklyReport(raw, articles = [], now = new Date()) {
  const text = String(raw || '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return normalizeWeeklyReport(JSON.parse(match[0]), articles, now);
  } catch {
    return null;
  }
}

function fallbackWeeklyReport(articles = [], now = new Date()) {
  const stats = reviewWeeklyStats(articles, now);
  if (!stats.count) {
    return {
      week_label: reviewWeeklyLabel(now),
      highlight: '知识图鉴这周还没看到新的正式作品。先别急，哪怕只写一篇，也能给下周的地图点一颗星。',
      blank: '可以先从最近最想反复解释的问题写起，写完再让知识图鉴帮你沉淀素材和立意。',
      reading_plan: [],
      stats: stats.statsText,
      generatedAt: new Date().toISOString(),
    };
  }
  const best = stats.articles[0];
  return normalizeWeeklyReport({
    highlight: `知识图鉴看了你这周写的 ${stats.count} 篇文章，先把《${best?.article?.title || '未命名'}》标出来：它最适合作为本周复盘的支点。`,
    blank: reviewBlankSpotFallback(articles),
    reading_plan: weeklyReadingPlanFallback(stats.articles),
  }, articles, now);
}

async function getWeeklyReports() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  const { weeklyReports = {} } = await chrome.storage.local.get('weeklyReports');
  return weeklyReports && typeof weeklyReports === 'object' ? weeklyReports : {};
}

async function saveWeeklyReport(key, report) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  const reports = await getWeeklyReports();
  reports[key] = report;
  await chrome.storage.local.set({ weeklyReports: reports });
  return reports;
}

async function autoGenerateWeeklyReportOnPanelOpen() {
  if (weeklyReportAutoPromise) return weeklyReportAutoPromise;
  weeklyReportAutoPromise = (async () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    if (typeof dbGetAllArticles !== 'function') return;
    const now = new Date();
    const reports = await getWeeklyReports();
    if (reports[reviewWeeklyReportKey(now)]) return;

    const allRecords = await dbGetAllArticles({ project: activeProject });
    const articles = allRecords.filter(rec => rec.article?.type !== 'idea');
    if (!reviewWeeklyStats(articles, now).count) return;
    await ensureWeeklyReport(articles, allRecords);
  })();

  try {
    await weeklyReportAutoPromise;
  } finally {
    weeklyReportAutoPromise = null;
  }
}

function weeklyReportEntries(reports = {}, currentKey = reviewWeeklyReportKey(), currentReport = null) {
  const archive = { ...reports };
  if (currentReport && currentKey) archive[currentKey] = currentReport;
  return Object.entries(archive).sort((a, b) => b[0].localeCompare(a[0]));
}

function renderWeeklyReportSwitcher(entries = [], currentKey = reviewWeeklyReportKey()) {
  const idx = Math.max(0, entries.findIndex(([key]) => key === currentKey));
  const hasOlder = idx >= 0 && idx < entries.length - 1;
  const hasNewer = idx > 0;
  return `<div class="weekly-report-switcher" aria-label="切换周复盘报告">
    <button class="weekly-report-nav-btn" type="button" data-week-nav="older"${hasOlder ? '' : ' disabled'}>上一周</button>
    <select class="weekly-report-week-select" id="weeklyReportSelect" aria-label="选择周复盘报告">
      ${entries.map(([key, report]) => `<option value="${esc(key)}"${key === currentKey ? ' selected' : ''}>${esc(report.week_label || key)}</option>`).join('')}
    </select>
    <button class="weekly-report-nav-btn" type="button" data-week-nav="newer"${hasNewer ? '' : ' disabled'}>下一周</button>
  </div>`;
}

function renderWeeklyReportHistory(reportsOrEntries = {}, currentKey = reviewWeeklyReportKey()) {
  const entries = Array.isArray(reportsOrEntries)
    ? reportsOrEntries
    : Object.entries(reportsOrEntries).sort((a, b) => b[0].localeCompare(a[0]));
  const rows = entries
    .map(([key, report]) => `<button class="weekly-report-history-row${key === currentKey ? ' active' : ''}" type="button" data-week-report-key="${esc(key)}">
      <span>${esc(report.week_label || key)}</span>
      <b>${esc(report.stats || '')}</b>
    </button>`).join('');
  return rows ? `<div class="weekly-report-history">
    <div class="weekly-report-history-title">历史周报</div>
    ${rows}
  </div>` : '';
}

function renderWeeklyReportCard(report, reports = {}, currentKey = reviewWeeklyReportKey(), status = '') {
  const entries = weeklyReportEntries(reports, currentKey, report);
  const cleanReport = {
    ...report,
    highlight: formalizeProductName(report?.highlight),
    blank: formalizeProductName(report?.blank),
    reading_plan: normalizeWeeklyReadingPlan(report?.reading_plan || []),
  };
  const isCurrentWeek = currentKey === reviewWeeklyReportKey();
  return `<div class="weekly-report-card" id="weeklyReportCard" data-week-key="${esc(currentKey)}">
    <div class="weekly-report-top">
      <div class="weekly-report-main-head">
        <div class="weekly-report-kicker">${isCurrentWeek ? '本周复盘报告' : '历史复盘报告'}</div>
        <div class="weekly-report-title-row">
          <div class="weekly-report-title">${esc(report.week_label || reviewWeeklyLabel())}</div>
          ${renderWeeklyReportSwitcher(entries, currentKey)}
        </div>
      </div>
      <button class="weekly-report-refresh" id="refreshWeeklyReportBtn" type="button"${isCurrentWeek ? '' : ' disabled'}>${isCurrentWeek ? '刷新本周复盘' : '历史报告'}</button>
    </div>
    <div class="weekly-report-stats">${esc(report.stats || '')}</div>
    <div class="weekly-report-grid">
      <div class="weekly-report-block"><span>本周亮点</span><p>${esc(cleanReport.highlight || '')}</p></div>
      <div class="weekly-report-block"><span>空白机会</span><p>${esc(cleanReport.blank || '')}</p></div>
      ${renderWeeklyReadingPlan(cleanReport.reading_plan)}
    </div>
    ${status ? `<div class="weekly-report-status">${esc(formalizeProductName(status))}</div>` : ''}
    ${renderWeeklyReportHistory(entries, currentKey)}
  </div>`;
}

function updateWeeklyReportCard(report, reports, status = '', currentKey = reviewWeeklyReportKey()) {
  const card = document.getElementById('weeklyReportCard');
  if (!card) return;
  card.outerHTML = renderWeeklyReportCard(report, reports, currentKey, status);
}

async function ensureWeeklyReport(articles, allArticles = articles, options = {}) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const now = new Date();
  const key = reviewWeeklyReportKey(now);
  const reports = await getWeeklyReports();
  const stats = reviewWeeklyStats(articles, now);
  if (!options.force && reports[key] && normalizeWeeklyReadingPlan(reports[key].reading_plan || [], []).length) return;
  if (!stats.count) {
    updateWeeklyReportCard(fallbackWeeklyReport(articles, now), reports);
    return;
  }

  updateWeeklyReportCard(reports[key] || fallbackWeeklyReport(articles, now), reports, '知识图鉴正在写本周复盘…', key);
  bindWeeklyReportCardInteractions(getWeeklyReportContainer(), allArticles, articles);
  try {
    const [settings, apiKeys] = await Promise.all([
      chrome.storage.sync.get(['provider', 'model']),
      getStoredApiKeys(),
    ]);
    const { provider, model } = resolveProviderModel(settings);
    const apiKey = getApiKeyForProvider(provider, apiKeys);
    if (!apiKey) {
      updateWeeklyReportCard(fallbackWeeklyReport(articles, now), reports, '知识图鉴还没有 API Key，先显示本地复盘。', key);
      bindWeeklyReportCardInteractions(getWeeklyReportContainer(), allArticles, articles);
      return;
    }
    const raw = await callLLM(apiKey, provider, model, [
      { role: 'system', content: '你是知识图鉴，创作者的周复盘伙伴。只输出 JSON，不要 markdown。语气具体、亲近、像真的读过作品。' },
      { role: 'user', content: buildWeeklyReportPrompt(articles, allArticles, now) },
    ], 1800);
    const report = parseWeeklyReport(raw, articles, now) || fallbackWeeklyReport(articles, now);
    const nextReports = await saveWeeklyReport(key, report);
    updateWeeklyReportCard(report, nextReports, '知识图鉴写好了本周复盘。', key);
    bindWeeklyReportCardInteractions(getWeeklyReportContainer(), allArticles, articles);
  } catch (e) {
    debugLog('[知识图鉴 panel] weekly report fallback:', e.message);
    updateWeeklyReportCard(fallbackWeeklyReport(articles, now), reports, `知识图鉴这次没写成周报：${e.message}`, key);
    bindWeeklyReportCardInteractions(getWeeklyReportContainer(), allArticles, articles);
  }
}

function getWeeklyReportContainer() {
  return document.getElementById('fingerprintTab') || document.getElementById('reviewTab') || document;
}

function bindWeeklyReportHistory(container, allRecords, articles) {
  const selectReport = async key => {
    const reports = await getWeeklyReports();
    const report = reports[key] || (key === reviewWeeklyReportKey() ? fallbackWeeklyReport(articles) : null);
    if (!report) return;
    updateWeeklyReportCard(report, reports, '', key);
    bindWeeklyReportCardInteractions(container, allRecords, articles);
  };

  const select = container?.querySelector('#weeklyReportSelect');
  if (select && select.dataset.bound !== '1') {
    select.dataset.bound = '1';
    select.addEventListener('change', () => selectReport(select.value));
  }

  container?.querySelectorAll('[data-week-nav]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const options = [...(container.querySelectorAll('#weeklyReportSelect option') || [])].map(opt => opt.value);
      const currentKey = container.querySelector('#weeklyReportCard')?.dataset.weekKey || select?.value || reviewWeeklyReportKey();
      const idx = options.indexOf(currentKey);
      const nextIdx = btn.dataset.weekNav === 'older' ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= options.length) return;
      selectReport(options[nextIdx]);
    });
  });

  container?.querySelectorAll('[data-week-report-key]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const key = btn.dataset.weekReportKey;
      await selectReport(key);
    });
  });
}

function bindWeeklyReportCardInteractions(container, allRecords, articles) {
  bindWeeklyReportActions(container, allRecords, articles);
  bindWeeklyReportHistory(container, allRecords, articles);
}

function bindWeeklyReportActions(container, allRecords, articles) {
  const btn = container?.querySelector('#refreshWeeklyReportBtn');
  if (!btn || btn.disabled || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '生成中…';
    await ensureWeeklyReport(articles, allRecords, { force: true });
  });
}

const STYLE_FINGERPRINT_SCHEMA = 'fingerprint_v2';
const STYLE_FINGERPRINT_LABELS = ['高频主题：', '论证方式：', '表达气质：', '反复世界观：', '问题切口：', '隐性连接：'];

function craftTextForFingerprint(rec) {
  const review = rec.analysis?.craft_review || {};
  return String(
    review.praise ||
    review.summary ||
    [review.structure, review.diction, review.rhythm, review.elegance].filter(Boolean).join(' ')
  ).trim();
}

function fingerprintTopValues(values = [], limit = 3) {
  const counts = new Map();
  for (const value of values.map(item => String(item || '').trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, limit)
    .map(([name]) => name);
}

function fingerprintArticleContext(rec) {
  const a = rec.analysis || {};
  const nodes = (a.nodes_hit || []).map(n => n.name).filter(Boolean).slice(0, 5);
  const assets = (a.asset_cards || []).map(card => [card.type, card.title].filter(Boolean).join(':')).filter(Boolean).slice(0, 4);
  const clips = (a.reusable_clips || []).map(c => c.type || c.content).filter(Boolean).slice(0, 3);
  return {
    title: rec.article?.title || '未命名',
    path: [a.domain, a.sub_domain, a.perspective].filter(Boolean).join(' → '),
    core: a.core_claim || '',
    strength: a.creator_strength || '',
    craft: craftTextForFingerprint(rec),
    nodes,
    assets,
    clips,
  };
}

function hasFingerprintContext(rec) {
  const ctx = fingerprintArticleContext(rec);
  return Boolean(ctx.craft || ctx.core || ctx.strength || ctx.nodes.length || ctx.assets.length || ctx.clips.length);
}

function buildStyleFingerprintPrompt(articles) {
  const items = [...articles]
    .map(fingerprintArticleContext)
    .filter(item => item.craft || item.core || item.strength || item.nodes.length || item.assets.length || item.clips.length)
    .slice(0, 10)
    .map((item, index) => `${index + 1}. 《${item.title}》
路径：${item.path || '未分类'}
核心判断：${item.core || '无'}
知识节点：${item.nodes.join('、') || '无'}
资产卡：${item.assets.join('；') || '无'}
创作者优势：${item.strength || '无'}
技法反馈：${item.craft || '无'}
素材类型：${item.clips.join('、') || '无'}`)
    .join('\n');
  return `基于下面这些同一创作者的作品记录，生成“写作指纹”。
要求：第二人称对话语气（"你"），具体、亲近、像真的读过作品；不要夸空话，不要泛泛说“专业”“有思想”。
请严格输出 6 行，每行保留标签：
高频主题：指出反复出现的主题/领域/知识节点。
论证方式：指出常用的推理路径、材料组织或结构习惯。
表达气质：指出语言和叙述气质。
反复世界观：指出这些作品背后反复出现的判断方式或价值关切。
问题切口：指出创作者最擅长切入的问题类型。
隐性连接：指出不同作品之间过去不容易被创作者意识到的连接。

作品记录：
${items || '暂无足够反馈'}`;
}

function buildLocalStyleFingerprintContent(articles) {
  const map = reviewDirectionMap(articles);
  const top = map[0];
  const sub = top?.subdomains?.[0];
  const point = sub?.points?.[0] || top?.points?.[0];
  const path = [top?.name, sub?.name, point?.name].filter(Boolean).join(' → ');
  const domains = fingerprintTopValues(articles.map(rec => rec.analysis?.domain));
  const perspectives = fingerprintTopValues(articles.map(rec => rec.analysis?.perspective || rec.analysis?.sub_domain));
  const nodes = fingerprintTopValues(articles.flatMap(rec => (rec.analysis?.nodes_hit || []).map(n => n.name)));
  const strengths = articles.map(rec => rec.analysis?.creator_strength).filter(Boolean);
  const craft = articles.map(rec => rec.analysis?.craft_review?.summary || craftTextForFingerprint(rec)).filter(Boolean);
  const claims = articles.map(rec => rec.analysis?.core_claim).filter(Boolean);
  const topDomains = domains.slice(0, 2).join('、');
  const topNodes = nodes.slice(0, 3).join('、');
  const mainPerspective = perspectives[0] || sub?.name || top?.name || '具体问题';

  return [
    `高频主题：${path || topDomains || '样本还少，先从连续分析作品开始'}。`,
    `论证方式：你常把${topNodes ? `「${topNodes}」` : '具体材料'}放回${mainPerspective ? `「${mainPerspective}」` : '一个更大的结构'}里看，而不是只停在表层评价。`,
    `表达气质：${craft[0] || strengths[0] || '你的表达更像是在慢慢确认一个判断，重视清楚、具体和可继续生长的线索'}。`,
    `反复世界观：${claims[0] ? `你反复追问“${claims[0]}”背后的机制。` : '你在作品里反复关心事物如何被结构、位置、关系和经验塑形。'}`,
    `问题切口：你适合继续写${mainPerspective ? `「${mainPerspective}」` : '那些能从个体经验进入系统解释'}的问题，把单篇观点推进成稳定专题。`,
    `隐性连接：${topDomains && nodes.length ? `「${topDomains}」和「${topNodes}」正在互相连线，旧作品会变成下一篇的素材入口。` : reviewWritingPatternFallback(articles)}`,
  ].join('\n');
}

function fallbackStyleFingerprint(articles) {
  return {
    schema: STYLE_FINGERPRINT_SCHEMA,
    generatedAt: new Date().toISOString(),
    content: buildLocalStyleFingerprintContent(articles),
  };
}

function hasStructuredStyleFingerprintContent(content) {
  const text = String(content || '');
  return STYLE_FINGERPRINT_LABELS.every(label => text.includes(label));
}

function isStyleFingerprintFresh(fp, now = new Date()) {
  const d = new Date(fp?.generatedAt || '');
  const currentSchema = fp?.schema === STYLE_FINGERPRINT_SCHEMA || hasStructuredStyleFingerprintContent(fp?.content);
  return fp?.content && currentSchema && !Number.isNaN(d.getTime()) &&
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth();
}

async function getStyleFingerprint() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
  const { styleFingerprint = null } = await chrome.storage.local.get('styleFingerprint');
  return styleFingerprint && typeof styleFingerprint === 'object' ? styleFingerprint : null;
}

async function saveStyleFingerprint(fp) {
  const normalized = { ...fp, schema: STYLE_FINGERPRINT_SCHEMA };
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return normalized;
  await chrome.storage.local.set({ styleFingerprint: normalized });
  return normalized;
}

function renderStyleFingerprintCard(fp, status = '') {
  const content = formalizeProductName(fp?.content || '知识图鉴还需要多读几篇，才能更准确地说出你的写作味道。');
  return `<div class="style-fingerprint-card" id="styleFingerprintCard">
    <div class="style-fingerprint-top">
      <div>
        <div class="style-fingerprint-kicker">你的写作指纹</div>
        <div class="style-fingerprint-title">知识图鉴读出来的“你”</div>
      </div>
      <button class="style-fingerprint-refresh" id="refreshStyleFingerprintBtn" type="button">刷新指纹</button>
    </div>
    <div class="style-fingerprint-body">${esc(content)}</div>
    ${status ? `<div class="style-fingerprint-status">${esc(formalizeProductName(status))}</div>` : ''}
  </div>`;
}

function updateStyleFingerprintCard(fp, status = '') {
  const card = document.getElementById('styleFingerprintCard');
  if (!card) return;
  card.outerHTML = renderStyleFingerprintCard(fp, status);
}

async function ensureStyleFingerprint(articles, options = {}) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const cached = await getStyleFingerprint();
  const freshCached = isStyleFingerprintFresh(cached) ? cached : null;
  if (!options.force && freshCached) return;

  const craftItems = articles.filter(hasFingerprintContext);
  const fallback = fallbackStyleFingerprint(articles);
  if (!craftItems.length) {
    updateStyleFingerprintCard(fallback);
    return;
  }

  updateStyleFingerprintCard(freshCached || fallback, '知识图鉴正在重新闻你的写作味道…');
  bindStyleFingerprintActions(document.getElementById('fingerprintTab'), articles);
  try {
    const [settings, apiKeys] = await Promise.all([
      chrome.storage.sync.get(['provider', 'model']),
      getStoredApiKeys(),
    ]);
    const { provider, model } = resolveProviderModel(settings);
    const apiKey = getApiKeyForProvider(provider, apiKeys);
    if (!apiKey) {
      updateStyleFingerprintCard(fallback, '知识图鉴还没有 API Key，先显示本地指纹。');
      bindStyleFingerprintActions(document.getElementById('fingerprintTab'), articles);
      return;
    }
    const content = String(await callLLM(apiKey, provider, model, [
      { role: 'system', content: '你是知识图鉴，创作者的长期写作观察伙伴。只基于作品记录输出写作指纹，不预测流量，不泛泛夸奖。只输出六行文本。' },
      { role: 'user', content: buildStyleFingerprintPrompt(craftItems) },
    ], 950) || '').trim();
    const normalizedContent = hasStructuredStyleFingerprintContent(content) ? content : fallback.content;
    const fp = await saveStyleFingerprint({
      generatedAt: new Date().toISOString(),
      content: normalizedContent,
    });
    updateStyleFingerprintCard(fp, '知识图鉴更新好了你的写作指纹。');
    bindStyleFingerprintActions(document.getElementById('fingerprintTab'), articles);
  } catch (e) {
    debugLog('[知识图鉴 panel] style fingerprint fallback:', e.message);
    updateStyleFingerprintCard(freshCached || fallback, `知识图鉴这次没闻准：${e.message}`);
    bindStyleFingerprintActions(document.getElementById('fingerprintTab'), articles);
  }
}

function bindStyleFingerprintActions(container, articles) {
  const btn = container?.querySelector('#refreshStyleFingerprintBtn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '刷新中…';
    await ensureStyleFingerprint(articles, { force: true });
  });
}

function reviewDomains(domainList, totalArticles) {
  const maxCount = domainList[0]?.[1] || 1;
  return domainList.map(([name, count]) => `
    <div class="domain-row">
      <span class="domain-name" title="${esc(name)}">${esc(name)}</span>
      <div class="domain-bar-wrap"><div class="domain-bar" style="width:${Math.round(count / maxCount * 100)}%"></div></div>
      <span class="domain-count">${count}</span>
    </div>`).join('');
}

function reviewNodeItem(n) {
  const freq = n.count ?? n.articles.length;
  return `<div class="node-freq-item">
    <span class="badge badge-type">${TYPE_META[n.type]?.label || esc(n.type)}</span>
    <span class="node-freq-name">${esc(n.name)}</span>
    <span class="node-freq-count">×${freq}</span>
  </div>`;
}

function reviewNodes(nodesArr) {
  const freq = n => n.count ?? n.articles.length;
  const sorted = [...nodesArr].sort((a, b) => freq(b) - freq(a) || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  const visible = sorted.slice(0, 3).map(reviewNodeItem).join('');
  const extra = sorted.slice(3).map(reviewNodeItem).join('');
  if (!extra) return `<div class="review-node-list">${visible}</div>`;
  return `<div class="review-node-list">
    ${visible}
    <div class="review-node-extra" hidden>${extra}</div>
    <button class="review-node-toggle" type="button" data-total="${sorted.length}" aria-expanded="false">展开全部 ${sorted.length} 个</button>
  </div>`;
}

function bindReviewNodeToggles(container) {
  container.querySelectorAll('.review-node-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.closest('.review-node-list');
      const extra = list?.querySelector('.review-node-extra');
      if (!list || !extra) return;
      const expanded = !list.classList.contains('expanded');
      list.classList.toggle('expanded', expanded);
      extra.hidden = !expanded;
      btn.setAttribute('aria-expanded', String(expanded));
      btn.textContent = expanded ? '收起' : `展开全部 ${btn.dataset.total} 个`;
    });
  });
}

function buildReviewChatContext(allRecords, articles, now = new Date()) {
  const weekStart = reviewStartOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const monthStart = reviewStartOfMonth(now);
  const thisWeek = reviewInRange(articles, weekStart, new Date(weekStart.getTime() + 7 * 864e5));
  const lastWeek = reviewInRange(articles, lastWeekStart, weekStart);
  const thisMonth = reviewInRange(articles, monthStart, reviewStartOfMonth(now, 1));
  const summarize = list => list.slice(0, 12).map((rec, index) => {
    const a = rec.analysis || {};
    return `${index + 1}. ${rec.article?.title || '未命名'}｜${(rec.savedAt || '').slice(0, 10)}
核心判断：${a.core_claim || '无'}
创作者优势：${a.creator_strength || '无'}`;
  }).join('\n\n') || '暂无';
  return {
    generatedAt: now.toISOString(),
    stats: reviewMetricSummary(allRecords, now),
    thisWeek: summarize(thisWeek),
    lastWeek: summarize(lastWeek),
    thisMonth: summarize(thisMonth),
  };
}

function reviewChatPanel() {
  const buttons = Object.entries(REVIEW_CHAT_TEMPLATES).map(([key, tpl]) =>
    `<button class="chat-template-btn" type="button" data-review-template="${esc(key)}">${esc(tpl.label)}</button>`
  ).join('');
  return `<div class="review-chat-entry">
    <button class="btn btn-secondary review-chat-open" type="button" id="openReviewChat">打开 AI 复盘对话</button>
    <div class="review-chat-panel" id="reviewChatPanel" hidden>
      <div class="card chat-card review-chat-card">
        <div class="card-label">AI 复盘对话</div>
        <div class="chat-templates">${buttons}</div>
        <div class="chat-history" id="reviewChatHistory" aria-live="polite"></div>
        <div class="chat-status" id="reviewChatStatus" role="status"></div>
      </div>
    </div>
  </div>`;
}

function buildReviewChatMessages(context, prompt) {
  const history = reviewChatHistory.slice(-CHAT_HISTORY_LIMIT).map(item => ({
    role: item.role,
    content: truncateText(item.content, item.role === 'assistant' ? 1200 : 700),
  }));
  return [
    {
      role: 'system',
      content: '你是创作者的周复盘教练。你要根据作品记录帮助作者决定下一步写什么、保留什么能力、调整什么节奏。',
    },
    {
      role: 'user',
      content: `这是我的创作复盘上下文：
统计：${JSON.stringify(context?.stats || {})}

本周作品：
${truncateText(context?.thisWeek || '', 3600)}

上周作品：
${truncateText(context?.lastWeek || '', 2200)}

本月作品：
${truncateText(context?.thisMonth || '', 3600)}`,
    },
    ...history,
    { role: 'user', content: prompt },
  ];
}

function bindReviewChat(container, allRecords, articles) {
  reviewChatContext = buildReviewChatContext(allRecords, articles);
  reviewChatHistory = [];
  const openBtn = container.querySelector('#openReviewChat');
  const panel = container.querySelector('#reviewChatPanel');
  openBtn?.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    openBtn.textContent = panel.hidden ? '打开 AI 复盘对话' : '收起 AI 复盘对话';
  });
  container.querySelectorAll('[data-review-template]').forEach(btn => {
    btn.addEventListener('click', () => sendReviewChat(btn.dataset.reviewTemplate));
  });
}

function setReviewChatBusy(busy) {
  const panel = document.getElementById('reviewChatPanel');
  if (!panel) return;
  panel.querySelectorAll('button').forEach(btn => { btn.disabled = busy; });
}

function setReviewChatStatus(text, isError = false) {
  const el = document.getElementById('reviewChatStatus');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('error', Boolean(isError));
}

function renderReviewChatHistory() {
  const el = document.getElementById('reviewChatHistory');
  if (!el) return;
  el.innerHTML = reviewChatHistory.map(item => {
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    return `<div class="chat-message ${role}">
      <div class="chat-message-label">${role === 'assistant' ? 'AI' : '我'}</div>
      <div class="chat-message-body">${esc(item.content)}</div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendReviewChat(key) {
  const tpl = REVIEW_CHAT_TEMPLATES[key];
  if (!tpl || !reviewChatContext) return;
  if (isReviewChatting) {
    setReviewChatStatus('上一条复盘还在生成中，请稍等。');
    return;
  }
  isReviewChatting = true;
  setReviewChatBusy(true);
  setReviewChatStatus('正在生成复盘回答…');
  reviewChatHistory.push({ role: 'user', content: tpl.label });
  renderReviewChatHistory();

  try {
    const [settings, apiKeys] = await Promise.all([
      chrome.storage.sync.get(['provider', 'model']),
      getStoredApiKeys(),
    ]);
    const { provider, model } = resolveProviderModel(settings);
    const apiKey = getApiKeyForProvider(provider, apiKeys);
    if (!apiKey) throw new Error('请先在设置页填写 API Key。');
    const answer = String(await callLLM(apiKey, provider, model, buildReviewChatMessages(reviewChatContext, tpl.prompt), 1600) || '').trim();
    reviewChatHistory.push({ role: 'assistant', content: answer || 'AI 没有返回可用内容。' });
    renderReviewChatHistory();
    setReviewChatStatus('复盘回答已生成。');
  } catch (e) {
    setReviewChatStatus(e.message || '复盘对话失败，请稍后再试。', true);
  } finally {
    isReviewChatting = false;
    setReviewChatBusy(false);
  }
}

function timelineWeekLabel(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() || 7) - 1;
  return `第${Math.ceil((date.getDate() + offset) / 7)}周`;
}

function timelineGroupLabel(date) {
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  return {
    year: `${date.getFullYear()}年`,
    month: `${date.getMonth() + 1}月`,
    week: timelineWeekLabel(date),
    day: `${date.getDate()}日`,
    short: `${date.getMonth() + 1}/${date.getDate()}`,
    full: reviewDateKey(date),
    weekday: weekdays[date.getDay()],
  };
}

function timelineItemSummary(rec) {
  const body = String(rec.article?.body || '').trim();
  const claim = String(rec.analysis?.core_claim || '').trim();
  return (body || claim || '这条记录已经进入你的创作时间轴。').slice(0, 150);
}

function timelineItemTags(rec) {
  const a = rec.analysis || {};
  const nodes = recordNodeMentions(rec).map(n => n.name).filter(Boolean);
  const type = rec.article?.type === 'idea' ? '速记' : '';
  return [...new Set([type, a.domain, a.sub_domain, ...nodes].filter(Boolean))].slice(0, 3);
}

function currentTimelineDateArticles(items) {
  const groupsByDate = {};
  for (const rec of items) {
    const d = reviewSavedDate(rec);
    if (!d) continue;
    const key = reviewDateKey(d);
    if (!groupsByDate[key]) groupsByDate[key] = { date: key, label: timelineGroupLabel(d), articles: [] };
    groupsByDate[key].articles.push(rec);
  }

  const groups = Object.values(groupsByDate)
    .map(group => ({
      ...group,
      articles: group.articles.sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || ''))),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const selected = groups.find(g => g.date === selectedTimelineDate) || groups[0] || null;
  if (selected && selectedTimelineDate !== selected.date) selectedTimelineDate = selected.date;
  return { groups, selected, articles: selected?.articles || [] };
}

function renderTimelineDatePath(selected, selectedArticle) {
  const label = selected?.label || {};
  const articleTitle = selectedArticle?.article?.title || '选择作品';
  const parts = [
    ['cal', label.year || '年份'],
    ['cal', label.month || '月份'],
    ['grid', label.week || '周'],
    ['cal', label.day || '日期'],
    ['doc', articleTitle],
  ];
  return `<div class="tl-date-path">${parts.map((part, index) => `
    ${index ? '<span class="tl-date-path-sep">/</span>' : ''}
    <button class="tl-date-path-item ${index === 4 ? 'active' : ''}" type="button" ${index < 4 && selected?.date ? `data-date="${esc(selected.date)}"` : ''}>
      <span class="tl-date-path-icon">${part[0] === 'grid' ? '▦' : part[0] === 'doc' ? '▤' : '□'}</span>
      <span>${esc(part[1])}</span>
    </button>
  `).join('')}</div>`;
}

function renderTimelineDeck(items) {
  timelineDeckItems = [...items].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
  const { groups, selected, articles } = currentTimelineDateArticles(timelineDeckItems);
  if (!groups.length) return '<div class="tl-empty">还没有可展示的写作日期。</div>';

  selectedTimelineArticle = articles.some(rec => rec.id === selectedTimelineArticle)
    ? selectedTimelineArticle
    : (articles[0]?.id || '');

  const selectedArticle = articles.find(rec => rec.id === selectedTimelineArticle);
  const selectedIndex = Math.max(0, articles.findIndex(rec => rec.id === selectedTimelineArticle));
  const visibleDateGroups = groups.slice(0, 5);

  return `<div class="tl-deck-layout" id="timelineDeck" data-date="${esc(selected?.date || '')}">
    <div class="tl-deck-main">
      ${renderTimelineDatePath(selected, selectedArticle)}
      <div class="tl-date-track" style="--date-count:${Math.max(1, visibleDateGroups.length)}">
        <div class="tl-date-dot-row">
          ${visibleDateGroups.map(group => `<button class="tl-date-dot-btn${group.date === selected?.date ? ' active' : ''}" type="button" data-date="${esc(group.date)}">
            <span class="tl-date-dot"></span>
            <span class="tl-date-dot-label">${esc(group.label.short)}</span>
            <span class="tl-date-dot-sub">${group.articles.length}篇</span>
          </button>`).join('')}
        </div>
      </div>
      <div class="tl-deck-area">
        <div class="tl-card-deck${selectedTimelineArticle ? ' has-active' : ''}">
          ${articles.map((rec, index) => {
            const active = rec.id === selectedTimelineArticle;
            const tags = timelineItemTags(rec);
            return `<article class="tl-deck-card${active ? ' active' : ''}" style="--deal-index:${index}" data-article-id="${esc(rec.id)}" tabindex="0">
              <div class="tl-card-icon">▤</div>
              <div class="tl-card-title">${esc(rec.article?.title || '未命名作品')}</div>
              <div class="tl-card-tags">${tags.map(tag => `<span class="tl-card-tag">${esc(tag)}</span>`).join('')}</div>
              <div class="tl-card-label">摘要</div>
              <div class="tl-card-summary">${esc(timelineItemSummary(rec))}</div>
              <div class="tl-card-action" data-action="open">查看全文 <span>→</span></div>
            </article>`;
          }).join('')}
        </div>
      </div>
      <div class="tl-card-rail">
        <button class="tl-rail-btn" type="button" data-move="-1" aria-label="上一张">‹</button>
        <div>
          <input class="tl-card-slider" type="range" min="0" max="${Math.max(0, articles.length - 1)}" value="${selectedIndex}">
          <div class="tl-rail-meta">${esc(selected?.label?.full || '')} · ${articles.length} 篇作品</div>
        </div>
        <button class="tl-rail-btn" type="button" data-move="1" aria-label="下一张">›</button>
      </div>
    </div>
    <aside class="tl-date-gear">
      <div class="tl-date-gear-title">▤ 日期选择</div>
      <div class="tl-date-gear-list">
        ${groups.map(group => `<button class="tl-date-gear-item${group.date === selected?.date ? ' active' : ''}" type="button" data-date="${esc(group.date)}">
          <span class="tl-gear-dot"></span>
          <span class="tl-gear-label">${esc(group.label.full)}<br><span class="tl-gear-count">${esc(group.label.weekday || '')}</span></span>
          <span class="tl-gear-count">${group.articles.length}篇</span>
        </button>`).join('')}
      </div>
    </aside>
  </div>`;
}

function reviewTimelineBlock(items) {
  return renderTimelineDeck(items);
}

function bindTimelineDeck(container = document.getElementById('reviewTab')) {
  const deck = container?.querySelector('#timelineDeck');
  if (!deck) return;

  deck.querySelectorAll('[data-date]').forEach(btn => {
    btn.addEventListener('click', () => selectTimelineDate(btn.dataset.date));
  });

  deck.querySelectorAll('.tl-deck-card').forEach(card => {
    const id = card.dataset.articleId;
    card.addEventListener('mouseenter', () => previewTimelineDeckCard(id));
    card.addEventListener('focus', () => previewTimelineDeckCard(id));
    card.addEventListener('click', event => {
      if (event.target.closest('[data-action="open"]')) return;
      selectTimelineDeckCard(id);
    });
    card.addEventListener('dblclick', () => openTimelineArticleFromDeck(id));
    card.querySelector('[data-action="open"]')?.addEventListener('click', event => {
      event.stopPropagation();
      openTimelineArticleFromDeck(id);
    });
  });

  deck.querySelectorAll('.tl-rail-btn').forEach(btn => {
    btn.addEventListener('click', () => moveTimelineDeck(Number(btn.dataset.move || 0)));
  });
  deck.querySelector('.tl-card-slider')?.addEventListener('input', event => {
    selectTimelineDeckCardByIndex(Number(event.target.value));
  });

  scrollTimelineDeckCard(selectedTimelineArticle);
}

function timelineCurrentArticles() {
  return currentTimelineDateArticles(timelineDeckItems).articles;
}

function previewTimelineDeckCard(id) {
  clearTimeout(timelineDeckHoverTimer);
  timelineDeckHoverTimer = setTimeout(() => scrollTimelineDeckCard(id), 115);
}

function scrollTimelineDeckCard(id) {
  const deck = document.querySelector('#timelineDeck .tl-card-deck');
  const card = [...(deck?.querySelectorAll('.tl-deck-card') || [])].find(el => el.dataset.articleId === id);
  if (!deck || !card) return;
  const start = deck.scrollLeft;
  const target = card.offsetLeft - deck.clientWidth / 2 + card.clientWidth / 2;
  const delta = target - start;
  if (timelineDeckScrollFrame) cancelAnimationFrame(timelineDeckScrollFrame);
  const started = performance.now();
  const duration = 430;
  const step = now => {
    const t = Math.min(1, (now - started) / duration);
    const damped = 1 - Math.pow(1 - t, 4);
    deck.scrollLeft = start + delta * damped;
    if (t < 1) timelineDeckScrollFrame = requestAnimationFrame(step);
  };
  timelineDeckScrollFrame = requestAnimationFrame(step);
}

function selectTimelineDeckCard(id) {
  if (!id) return;
  selectedTimelineArticle = id;
  const deck = document.querySelector('#timelineDeck');
  if (!deck) return;
  const articles = timelineCurrentArticles();
  const selectedArticle = articles.find(rec => rec.id === id);
  const selected = currentTimelineDateArticles(timelineDeckItems).selected;
  deck.querySelector('.tl-date-path')?.replaceWith(
    document.createRange().createContextualFragment(renderTimelineDatePath(selected, selectedArticle)).firstElementChild
  );
  deck.querySelectorAll('.tl-date-path-item[data-date]').forEach(btn => {
    btn.addEventListener('click', () => selectTimelineDate(btn.dataset.date));
  });
  deck.querySelectorAll('.tl-deck-card').forEach(card => {
    card.classList.toggle('active', card.dataset.articleId === id);
  });
  deck.querySelector('.tl-card-deck')?.classList.toggle('has-active', true);
  const idx = Math.max(0, articles.findIndex(rec => rec.id === id));
  const slider = deck.querySelector('.tl-card-slider');
  if (slider) slider.value = String(idx);
  scrollTimelineDeckCard(id);
}

function selectTimelineDeckCardByIndex(index) {
  const articles = timelineCurrentArticles();
  const safe = Math.max(0, Math.min(articles.length - 1, index));
  if (articles[safe]) selectTimelineDeckCard(articles[safe].id);
}

function moveTimelineDeck(delta) {
  const articles = timelineCurrentArticles();
  if (!articles.length) return;
  const current = Math.max(0, articles.findIndex(rec => rec.id === selectedTimelineArticle));
  const next = Math.max(0, Math.min(articles.length - 1, current + delta));
  selectTimelineDeckCard(articles[next].id);
}

function selectTimelineDate(date) {
  if (!date) return;
  selectedTimelineDate = date;
  selectedTimelineArticle = '';
  loadReview();
}

function openTimelineArticleFromDeck(id) {
  const rec = timelineDeckItems.find(item => item.id === id);
  if (!rec) return;
  switchTab('assets', { skipLoad: true });
  setAssetListMode('assets');
  showAssetDetail(rec);
}

// ── 作者分身 ─────────────────────────────────────────────
function authorAgentTopValues(values = [], limit = 4) {
  const counts = {};
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) counts[text] = (counts[text] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function buildAuthorAgentContext(records = []) {
  const articles = records
    .filter(rec => rec.article?.type !== 'idea' && Object.keys(rec.analysis || {}).length)
    .slice(0, 16);
  const works = articles.map(rec => {
    const a = rec.analysis || {};
    return {
      id: rec.id,
      title: rec.article?.title || '（无标题）',
      savedAt: rec.savedAt || '',
      sourceUrl: rec.article?.url || rec.url || '',
      domain: [a.domain, a.sub_domain].filter(Boolean).join(' · '),
      core_claim: a.core_claim || '',
      creator_strength: a.creator_strength || '',
      insight: a.insight || '',
      nodes: recordNodeMentions(rec).slice(0, 8).map(n => ({
        name: n.name,
        type: TYPE_META[n.type]?.label || n.type || '',
        role: ROLE_MAP[n.role] || n.role || '',
        contribution: n.contribution || '',
      })),
      asset_cards: normalizeAssetCards(a, { record: rec }).slice(0, 4).map(card => assetCardPayload(card)),
      reusable_clips: (a.reusable_clips || []).slice(0, 4).map(clip => ({
        type: clip.type || '素材',
        content: clip.content || '',
        why_reusable: clip.why_reusable || '',
      })),
      essence_insights: (a.essence_insights || []).slice(0, 3).map(insight => ({
        viewpoint: insight.viewpoint || '',
        why_essential: insight.why_essential || '',
      })),
      next_suggestions: (a.next_suggestions || []).slice(0, 3).map(s => ({
        type: s.type || '延展',
        suggestion: s.suggestion || '',
        reason: s.reason || '',
      })),
    };
  });
  return {
    articleCount: works.length,
    topThemes: authorAgentTopValues(works.flatMap(w => [w.domain, ...w.asset_cards.flatMap(card => card.keywords || [])])),
    topNodes: authorAgentTopValues(works.flatMap(w => w.nodes.map(n => n.name))),
    strengths: works.map(w => w.creator_strength).filter(Boolean).slice(0, 6),
    works,
  };
}

function buildAuthorAgentAnalysis(context = {}) {
  const firstWork = context.works?.[0] || {};
  return {
    domain: '作者分身',
    sub_domain: '历史作品资产',
    core_claim: context.articleCount
      ? `作者分身已读取 ${context.articleCount} 篇历史作品资产。`
      : '还没有可用于作者分身的历史作品。',
    asset_cards: (firstWork.asset_cards || []).slice(0, 6),
    creator_strength: context.strengths?.[0] || '继续分析更多作品后，作者分身会更准确。',
    reusable_clips: (firstWork.reusable_clips || []).slice(0, 5),
    essence_insights: (firstWork.essence_insights || []).slice(0, 5),
    nodes_hit: (firstWork.nodes || []).slice(0, 8).map(n => ({
      name: n.name,
      type: 'concept',
      role: 'secondary',
      contribution: n.contribution || n.role,
    })),
    next_suggestions: (firstWork.next_suggestions || []).slice(0, 4),
    insight: context.topThemes?.length
      ? `你的历史作品反复出现：${context.topThemes.map(t => t.name).join('、')}`
      : '',
  };
}

async function loadAuthorAgent() {
  const container = document.getElementById('authorTab');
  if (!container) return;
  container.innerHTML = `<div class="asset-empty">正在读取历史作品资产…</div>`;
  const records = await dbGetAllArticles({ project: activeProject });
  const context = buildAuthorAgentContext(records);

  if (!context.articleCount) {
    container.innerHTML = analysisGroup('作者分身', `<div class="asset-empty">还没有可提问的历史作品<br>先分析一篇文章，知识图鉴就能从旧文里回答你。</div>`);
    return;
  }

  const analysis = buildAuthorAgentAnalysis(context);
  const chatId = createChatSession(analysis, JSON.stringify(context, null, 2), 'authorTab', {
    agentMode: 'author',
    authorContext: context,
    articleTitle: '作者分身',
    articleText: JSON.stringify(context.works.slice(0, 8), null, 2),
    projectId: activeProject,
  });

  container.innerHTML = analysisGroup('向自己历史作品提问', cardChat(chatId, {
      label: '问问过去的我',
      placeholder: '例如：我以前怎么看位置决定命运？',
      templates: AUTHOR_AGENT_TEMPLATES,
      templateAttr: 'data-author-template',
    }));
}

// ── 指纹周报 ─────────────────────────────────────────────
async function loadFingerprint() {
  const allRecords = await dbGetAllArticles({ project: activeProject });
  const articles = allRecords.filter(r => r.article?.type !== 'idea');
  const container = document.getElementById('fingerprintTab');

  if (!articles.length) {
    container.innerHTML = `<div class="asset-empty">还没有正式作品<br>分析几篇文章后，这里会生成“知识图鉴读出的你”和本周资产复盘</div>`;
    return;
  }

  const styleFingerprint = await getStyleFingerprint();
  const initialStyleFingerprint = isStyleFingerprintFresh(styleFingerprint)
    ? styleFingerprint
    : fallbackStyleFingerprint(articles);
  const weeklyReports = await getWeeklyReports();
  const weeklyKey = reviewWeeklyReportKey();
  const weeklyReport = weeklyReports[weeklyKey] || fallbackWeeklyReport(articles);

  container.innerHTML = [
    renderStyleFingerprintCard(initialStyleFingerprint),
    renderWeeklyReportCard(weeklyReport, weeklyReports, weeklyKey),
  ].join('');

  bindStyleFingerprintActions(container, articles);
  bindWeeklyReportCardInteractions(container, allRecords, articles);
  ensureStyleFingerprint(articles).catch(e => debugLog('[知识图鉴 panel] style fingerprint load failed:', e.message));
  ensureWeeklyReport(articles, allRecords).catch(e => debugLog('[知识图鉴 panel] weekly report load failed:', e.message));
}

// ── 复盘中心 ─────────────────────────────────────────────
async function loadReview() {
  const allRecords = await dbGetAllArticles({ project: activeProject });
  const articles   = allRecords.filter(r => r.article?.type !== 'idea');
  const ideas      = allRecords.filter(r => r.article?.type === 'idea');
  const allNodes   = await dbGetAllNodes();
  const container  = document.getElementById('reviewTab');

  if (!articles.length && !ideas.length) {
    container.innerHTML = `<div class="asset-empty">还没有创作记录<br>分析文章或保存速记后再来看复盘吧</div>`;
    return;
  }

  // 只统计当前项目文章涉及的节点，频次也限定在项目内
  const articleIds  = new Set(articles.map(a => a.id));
  const nodesArr    = allNodes
    .map(n => ({ ...n, count: n.articles.filter(id => articleIds.has(id)).length }))
    .filter(n => n.count > 0);

  const domains = {};
  for (const rec of articles) {
    const d = rec.analysis?.domain || '未分类';
    domains[d] = (domains[d] || 0) + 1;
  }
  const domainList   = Object.entries(domains).sort((a, b) => b[1] - a[1]);
  const totalDomains = domainList.length;

  const overviewHtml = [
    reviewStatRow(articles.length, totalDomains, nodesArr.length, ideas.length),
    reviewSubBlock('本周创作概览', renderReviewTopStats(allRecords)),
    reviewSubBlock('创作者驾驶舱', reviewDashboard(articles, ideas)),
    reviewSubBlock('最近动态', articles.length ? reviewPeriod(articles) : ''),
    reviewSubBlock('创作模式', articles.length ? reviewPatterns(articles, nodesArr, domainList, articles.length, totalDomains) : ''),
    reviewSubBlock('领域分布', articles.length ? reviewDomains(domainList, articles.length) : ''),
  ].join('');

  const reviewSections = {
    overview: { title: '本周概览', html: overviewHtml },
    direction: { title: '创作方向分析', html: articles.length ? renderReviewDirectionAnalysis(articles) : '' },
    nodes: { title: '高频节点', html: nodesArr.length ? reviewNodes(nodesArr) : '' },
    timeline: { title: '时间轴卡片牌组', html: reviewTimelineBlock(allRecords) },
    chat: { title: 'AI 复盘', html: reviewChatPanel() },
  };
  if (!reviewSections[activeReviewSection]) activeReviewSection = 'overview';
  const activeSection = reviewSections[activeReviewSection];

  container.innerHTML = [
    reviewNavBlockHtml(activeReviewSection),
    reviewAnchorSection(activeReviewSection, activeSection.title, activeSection.html),
  ].join('');
  if (activeReviewSection === 'timeline') bindTimelineDeck(container);
  if (activeReviewSection === 'chat') bindReviewChat(container, allRecords, articles);
  bindReviewAnchors(container);
  if (activeReviewSection === 'nodes') bindReviewNodeToggles(container);
  if (activeReviewSection === 'direction') loadReviewGuidance(articles);
}

function showAssetDetail(rec) {
  if (rec.article?.type === 'idea') {
    showIdeaDetail(rec);
    return;
  }

  const container = document.getElementById('assetsList');
  container.innerHTML = `
    <div class="detail-back" id="detailBack">← 全部资产</div>
    <div id="assetDetailResult"></div>
    <div class="detail-action-row">
      <button class="btn btn-secondary" id="editMarkdownBtn">编辑 Markdown</button>
      <button class="btn detail-delete-btn" id="deleteAssetBtn">删除作品</button>
    </div>
  `;
  document.getElementById('detailBack').addEventListener('click', loadCurrentAssetMode);
  document.getElementById('editMarkdownBtn').addEventListener('click', () => showMarkdownEditor(rec));
  document.getElementById('deleteAssetBtn').addEventListener('click', e => deleteAssetRecord(rec, '作品', e.currentTarget));

  const a = rec.analysis || {};
  if (Object.keys(a).length) {
    renderResult(a, JSON.stringify(a, null, 2), 'assetDetailResult', { record: rec });
  } else {
    const el = document.getElementById('assetDetailResult');
    el.innerHTML = `<div class="asset-empty">该记录没有分析数据</div>`;
    el.style.display = 'block';
  }
}

async function deleteAssetRecord(rec, kind = '作品', btn = null) {
  const message = kind === '速记'
    ? '确定删除这条速记？它的素材/立意会一并清除'
    : '确定删除这条作品？该文章和它的素材/立意会一并清除';
  if (!confirm(message)) return;

  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '删除中…';
  }
  try {
    await dbDeleteArticle(rec.id);
    await updateAssetCount();
    await loadCurrentAssetMode();
  } catch (e) {
    alert(`知识图鉴删除失败：${e.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || (kind === '速记' ? '删除速记' : '删除作品');
    }
  }
}

function showIdeaDetail(rec) {
  const container = document.getElementById('assetsList');
  const date = (rec.savedAt || '').slice(0, 16).replace('T', ' ');
  container.innerHTML = `
    <div class="detail-back" id="detailBack">← 全部资产</div>
    <div class="card">
      <div class="card-label">速记</div>
      <div class="idea-detail-title">${esc(rec.article?.title || '（无标题）')}</div>
      <div class="idea-detail-meta">${esc(date)}</div>
      <div class="idea-detail-body">${esc(rec.article?.body || '')}</div>
    </div>
    <div class="detail-action-row">
      <button class="btn btn-secondary" id="editMarkdownBtn">编辑 Markdown</button>
      <button class="btn detail-delete-btn" id="deleteAssetBtn">删除速记</button>
    </div>
  `;
  document.getElementById('detailBack').addEventListener('click', loadCurrentAssetMode);
  document.getElementById('editMarkdownBtn').addEventListener('click', () => showMarkdownEditor(rec));
  document.getElementById('deleteAssetBtn').addEventListener('click', e => deleteAssetRecord(rec, '速记', e.currentTarget));
}

function showMarkdownEditor(rec) {
  const container = document.getElementById('assetsList');
  container.innerHTML = `
    <div class="detail-back" id="editorBack">← 详情</div>
    <div class="markdown-editor-head">
      <div class="node-detail-kicker">Markdown 编辑</div>
      <div class="markdown-editor-title">${esc(rec.article?.title || '（无标题）')}</div>
    </div>
    <textarea id="markdownEditorInput" class="markdown-editor-input" spellcheck="false"></textarea>
    <div class="wikilink-suggest" id="wikilinkSuggest" style="display:none"></div>
    <div class="markdown-editor-actions">
      <button class="btn" id="saveMarkdownEditBtn">保存编辑</button>
      <button class="btn btn-secondary" id="cancelMarkdownEditBtn">取消</button>
    </div>
    <div class="markdown-editor-status" id="markdownEditorStatus"></div>
  `;

  const input = document.getElementById('markdownEditorInput');
  input.value = buildArticleMarkdown(rec);
  initWikilinkAutocomplete(input);
  document.getElementById('editorBack').addEventListener('click', () => showAssetDetail(rec));
  document.getElementById('cancelMarkdownEditBtn').addEventListener('click', () => showAssetDetail(rec));
  document.getElementById('saveMarkdownEditBtn').addEventListener('click', () => saveMarkdownEdit(rec));
}

async function initWikilinkAutocomplete(input) {
  const suggest = document.getElementById('wikilinkSuggest');
  if (!suggest) return;
  const [articles, nodes] = await Promise.all([
    dbGetAllArticles().catch(() => []),
    dbGetAllNodes().catch(() => []),
  ]);
  const names = [...new Set([
    ...nodes.map(n => n.name),
    ...articles.flatMap(rec => recordNodeMentions(rec).map(n => n.name)),
  ].map(name => String(name || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

  const hide = () => { suggest.style.display = 'none'; suggest.innerHTML = ''; };
  const triggerAtCursor = () => {
    const pos = input.selectionStart || 0;
    const before = input.value.slice(0, pos);
    const start = before.lastIndexOf('[[');
    const close = before.lastIndexOf(']]');
    if (start <= close) return null;
    const query = before.slice(start + 2);
    if (/[\[\]\r\n]/.test(query)) return null;
    return { start, end: pos, query };
  };
  const render = () => {
    const trigger = triggerAtCursor();
    if (!trigger) { hide(); return; }
    const q = trigger.query.trim().toLowerCase();
    const matches = names
      .filter(name => !q || name.toLowerCase().includes(q))
      .slice(0, 8);
    if (!matches.length) { hide(); return; }
    suggest.innerHTML = matches.map(name =>
      `<button type="button" class="wikilink-suggest-item" data-name="${esc(name)}">[[${esc(name)}]]</button>`
    ).join('');
    suggest.style.display = 'block';
    suggest.querySelectorAll('.wikilink-suggest-item').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        const current = triggerAtCursor();
        if (!current) return hide();
        const value = `[[${btn.dataset.name}]]`;
        input.setRangeText(value, current.start, current.end, 'end');
        input.focus();
        hide();
      });
    });
  };

  input.addEventListener('input', render);
  input.addEventListener('click', render);
  input.addEventListener('keyup', e => {
    if (e.key === 'Escape') hide();
    else render();
  });
  input.addEventListener('blur', () => setTimeout(hide, 120));
}

async function saveMarkdownEdit(original) {
  const input = document.getElementById('markdownEditorInput');
  const status = document.getElementById('markdownEditorStatus');
  const btn = document.getElementById('saveMarkdownEditBtn');
  const text = input.value.trim();
  if (!text) {
    status.textContent = 'Markdown 不能为空';
    status.style.color = '#bb5555';
    status.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    const parsed = parseMarkdownRecord(text, `${original.id || 'edit'}.md`);
    if (parsed.warnings?.length) {
      status.textContent = `发现格式问题，尚未保存：${parsed.warnings.join('；')}`;
      status.style.color = '#bb5555';
      status.style.display = 'block';
      return;
    }

    const merged = mergeParsedMarkdownRecord(original, parsed);
    if (!merged.hasPatch) {
      status.textContent = '没有识别到可保存的改动';
      status.style.color = '#bb5555';
      status.style.display = 'block';
      return;
    }

    await dbPutArticle(merged.record);
    if (merged.shouldReplaceNodes) {
      await dbReplaceArticleNodes(merged.record.analysis?.nodes_hit || [], merged.record.id);
    }
    writeArticleToLocalFolder(merged.record);
    updateAssetCount();

    showAssetDetail(merged.record);
  } catch (e) {
    status.textContent = `保存失败：${e.message}`;
    status.style.color = '#bb5555';
    status.style.display = 'block';
  } finally {
    if (document.getElementById('saveMarkdownEditBtn')) {
      btn.disabled = false;
      btn.textContent = '保存编辑';
    }
  }
}

function nodeDetailRelatedAssets(mentions = [], displayName = '') {
  const seen = new Set();
  const items = [];
  for (const mention of mentions) {
    const rec = mention.rec || {};
    const cards = normalizeAssetCards(rec.analysis || {}, { record: rec });
    for (const card of cards) {
      const relevant = assetSearchMatches(displayName, [
        card.type,
        card.title,
        card.summary,
        card.whyReusable,
        ...(card.keywords || []),
        mention.hit?.contribution,
      ]) || /知识节点|核心观点|写作指纹|延展|创作者优势/.test(String(card.type || ''));
      if (!relevant) continue;
      const key = [rec.id, card.type, card.title].join('\x00').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        card,
        sourceTitle: rec.article?.title || '（无标题）',
      });
      if (items.length >= 6) return items;
    }
  }
  return items;
}

function nodeDetailFingerprintMeaning(mentions = [], displayName = '') {
  const strengths = compactTextList(mentions.map(m => m.rec?.analysis?.creator_strength));
  const insights = compactTextList(mentions.map(m => m.rec?.analysis?.insight));
  const contributions = compactTextList(mentions.map(m => m.hit?.contribution));
  if (strengths.length) {
    return `「${displayName}」在你的写作指纹里，不只是一个标签，而是你反复调用的思考入口。${strengths[0]}`;
  }
  if (insights.length) {
    return `「${displayName}」连接了你作品里的稳定观察：${insights[0]}`;
  }
  if (contributions.length) {
    return `「${displayName}」目前主要承担这个作用：${contributions[0]}`;
  }
  return `「${displayName}」已经进入你的知识宇宙。继续围绕它写下去，系统会逐渐读出它和你的写作优势之间的关系。`;
}

function nodeDetailExtensionDirections(mentions = [], displayName = '') {
  const suggestions = [];
  for (const mention of mentions) {
    const rec = mention.rec || {};
    for (const s of rec.analysis?.next_suggestions || []) {
      const title = String(s.suggestion || '').trim();
      if (!title) continue;
      suggestions.push({
        title,
        reason: s.reason || mention.hit?.contribution || '',
        sourceTitle: rec.article?.title || '（无标题）',
      });
    }
  }
  if (suggestions.length) return suggestions.slice(0, 4);
  return [{
    title: `把「${displayName}」写成一篇新的现实迁移文章`,
    reason: '从已有作品里抽出这个节点的定义、案例、反例和边界条件，让旧节点变成下一篇文章的入口。',
    sourceTitle: '',
  }];
}

function renderNodeAssetExplanation(mentions = [], displayName = '', nodeType = '', projectsHit = []) {
  if (!mentions.length) return '';
  const relatedAssets = nodeDetailRelatedAssets(mentions, displayName);
  const fingerprintMeaning = nodeDetailFingerprintMeaning(mentions, displayName);
  const directions = nodeDetailExtensionDirections(mentions, displayName);
  const typeLabel = TYPE_META[nodeType]?.label || nodeType || '知识节点';
  const assetHtml = relatedAssets.length
    ? relatedAssets.map(item => `<div class="field">
        <div class="field-label">${esc(item.card.type)} · 来自《${esc(item.sourceTitle)}》</div>
        <div class="field-value">${esc(item.card.title || item.card.summary || '')}</div>
      </div>`).join('')
    : `<div class="field"><div class="field-label">关联资产</div><div class="field-value">继续分析更多文章后，这里会显示观点卡、素材卡和延展方向。</div></div>`;
  const directionHtml = directions.map(item => `<div class="field">
      <div class="field-label">${item.sourceTitle ? `来自《${esc(item.sourceTitle)}》` : '可延展方向'}</div>
      <div class="field-value">${esc(item.title)}${item.reason ? `：${esc(item.reason)}` : ''}</div>
    </div>`).join('');

  return [
    `<div class="card">
      <div class="card-label">作品资产解释卡</div>
      <div class="core-claim">${esc(displayName)}</div>
      <div class="field"><div class="field-label">节点类型</div><div class="field-value">${esc(typeLabel)}</div></div>
      <div class="field"><div class="field-label">关联作品</div><div class="field-value">${mentions.length} 篇作品 · ${projectsHit.length} 个项目</div></div>
      <div class="field"><div class="field-label">关联资产</div><div class="field-value">${relatedAssets.length} 个作品资产</div></div>
    </div>`,
    `<div class="card">
      <div class="card-label">关联资产</div>
      ${assetHtml}
    </div>`,
    `<div class="card">
      <div class="card-label">写作指纹意义</div>
      <div class="field-value">${esc(fingerprintMeaning)}</div>
    </div>`,
    `<div class="card">
      <div class="card-label">可延展方向</div>
      ${directionHtml}
    </div>`,
  ].join('');
}

async function showNodeDetail(nodeName, backTarget = 'assets') {
  const key = String(nodeName || '').trim().toLowerCase();
  if (!key) return;

  switchTab('assets', { skipLoad: true });
  const container = document.getElementById('assetsList');
  container.innerHTML = `<div class="asset-empty">正在读取节点反链…</div>`;

  const [articles, projects] = await Promise.all([dbGetAllArticles(), dbGetProjects()]);
  const projectNameById = {};
  for (const p of projects) projectNameById[p.id] = p.name;

  const mentions = [];
  for (const rec of articles) {
    const hit = recordNodeMentions(rec)
      .find(n => String(n.name || '').trim().toLowerCase() === key);
    if (!hit) continue;
    mentions.push({
      rec,
      hit,
      projectName: projectNameById[rec.project_id || 'default'] || rec.project_id || '默认项目',
    });
  }

  const displayName = mentions[0]?.hit.name || nodeName;
  const nodeType    = mentions[0]?.hit.type || '';
  const projectsHit = [...new Set(mentions.map(m => m.projectName))];
  const roleCounts  = mentions.reduce((acc, m) => {
    const role = m.hit.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const roleHtml = Object.entries(roleCounts).map(([role, count]) =>
    `<span class="badge badge-${esc(role)}">${ROLE_MAP[role] || esc(role)} ×${count}</span>`
  ).join('');

  container.innerHTML = `
    <div class="detail-back" id="nodeDetailBack">← ${backTarget === 'nodes' ? '节点库' : '全部资产'}</div>
    <div class="node-detail-head">
      <div class="node-detail-kicker">知识节点</div>
      <div class="node-detail-title">${esc(displayName)}</div>
      <div class="node-detail-meta">
        ${nodeType ? `<span class="badge badge-type">${TYPE_META[nodeType]?.label || esc(nodeType)}</span>` : ''}
        <span>${mentions.length} 篇作品</span>
        <span>${projectsHit.length} 个项目</span>
      </div>
      ${roleHtml ? `<div class="node-detail-roles">${roleHtml}</div>` : ''}
    </div>
    ${renderNodeAssetExplanation(mentions, displayName, nodeType, projectsHit)}
    ${mentions.length ? mentions.map((m, i) => {
      const rec = m.rec;
      const a = rec.analysis || {};
      const date = (rec.savedAt || '').slice(0, 10);
      return `
        <div class="asset-card node-mention-card" data-idx="${i}">
          <div class="asset-card-top">
            <span class="asset-domain">${esc(m.projectName)}${a.domain ? ' · ' + esc(a.domain) : ''}</span>
            <span class="asset-date">${esc(date)}</span>
          </div>
          <div class="asset-title">${esc(rec.article?.title || '（无标题）')}</div>
          <div class="asset-claim">${esc(m.hit.contribution || a.core_claim || '')}</div>
          <div class="node-mention-role">
            <span class="badge badge-${esc(m.hit.role)}">${ROLE_MAP[m.hit.role] || esc(m.hit.role)}</span>
          </div>
        </div>`;
    }).join('') : `<div class="asset-empty">还没有作品反向引用这个节点</div>`}
  `;

  document.getElementById('nodeDetailBack').addEventListener('click', () => {
    if (backTarget === 'nodes') loadNodeIndex();
    else loadCurrentAssetMode();
  });
  container.querySelectorAll('.node-mention-card').forEach(card => {
    card.addEventListener('click', () => {
      showAssetDetail(mentions[parseInt(card.dataset.idx)].rec);
    });
  });
}

function showResetBtn() {
  const existing = document.getElementById('resetAnalyzeBtn');
  const btn = document.createElement('button');
  btn.id = 'resetAnalyzeBtn';
  btn.className = 'btn';
  btn.textContent = '分析新内容';
  btn.style.cssText = 'margin-top:12px;background:#1a1a2a;color:#6060a0;border:1px solid #252540;';
  btn.addEventListener('click', resetAnalyze);
  if (existing) existing.replaceWith(btn);
  else document.getElementById('result').after(btn);
}

function resetAnalyze() {
  capturedText = '';
  document.getElementById('result').style.display = 'none';
  document.getElementById('errorBox').style.display = 'none';
  document.getElementById('detectedCard').style.display = 'none';
  document.getElementById('toggleManual').style.display = 'none';
  document.getElementById('waitingSection').style.display = 'block';
  document.getElementById('analyzeBtn').style.display = 'none';
  document.getElementById('articleInput').value = '';
  document.getElementById('resetAnalyzeBtn')?.remove();
}

function toggleRaw(btn) {
  const pre = btn.closest('.raw-toggle')?.nextElementSibling;
  if (!pre?.classList?.contains('raw-json')) return;
  const show = pre.style.display !== 'block';
  pre.style.display = show ? 'block' : 'none';
  btn.textContent = show ? '收起 JSON ↑' : '查看原始 JSON ↓';
}

function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function setKnowledgeLoadingMessage(text) {
  const el = document.getElementById('knowledgeLoadingMessage');
  if (!el) return;
  el.classList.add('fading');
  setTimeout(() => {
    el.textContent = text;
    el.classList.remove('fading');
  }, 300);
}

function startKnowledgeLoadingMessages() {
  stopKnowledgeLoadingMessages();
  knowledgeLoadingIndex = Math.floor(Math.random() * KNOWLEDGE_LOADING_MESSAGES.length);
  const next = () => {
    setKnowledgeLoadingMessage(KNOWLEDGE_LOADING_MESSAGES[knowledgeLoadingIndex]);
    knowledgeLoadingIndex = (knowledgeLoadingIndex + 1) % KNOWLEDGE_LOADING_MESSAGES.length;
  };
  next();
  knowledgeLoadingTimer = setInterval(next, 3000);
}

function stopKnowledgeLoadingMessages() {
  if (knowledgeLoadingTimer) clearInterval(knowledgeLoadingTimer);
  knowledgeLoadingTimer = null;
  document.getElementById('knowledgeLoadingMessage')?.classList.remove('fading');
}

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'block' : 'none';
  document.getElementById('analyzeBtn').disabled = on;
  document.getElementById('analyzeBtn').textContent = on ? '知识图鉴分析中…' : '开始分析';
  if (on) startKnowledgeLoadingMessages();
  else stopKnowledgeLoadingMessages();
}

function showError(msg) {
  const el = document.getElementById('errorBox');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

// 启动
if (!window.__ZHJ_PANEL_TEST__ && typeof chrome !== 'undefined' && chrome.storage?.local) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
