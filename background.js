'use strict';

var DEBUG = false;
var lastCaptureTabId = null;
var lastCaptureTabUrl = '';
var ZHIHU_TAB_PATTERNS = ['https://www.zhihu.com/*', 'https://zhuanlan.zhihu.com/*'];

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function isZhihuUrl(url) {
  return typeof url === 'string' && /^https:\/\/([^/]+\.)?zhihu\.com(\/|$)/.test(url);
}

function rememberCaptureTab(tab) {
  if (!tab?.id) return;
  lastCaptureTabId = tab.id;
  lastCaptureTabUrl = tab.url || '';
}

// Service worker 只保留核心职责：点击图标 -> 打开 panel -> 抓取知乎内容。
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

chrome.action.onClicked.addListener((tab) => {
  debugLog('[知乎创作图鉴 bg] 图标点击, tab.id=', tab.id, ' url=', tab.url);
  rememberCaptureTab(tab);

  chrome.sidePanel.open({ tabId: tab.id }).catch((e) =>
    console.warn('[知乎创作图鉴 bg] 开面板失败:', e.message)
  );

  if (!isZhihuUrl(tab.url)) {
    debugLog('[知乎创作图鉴 bg] 非知乎页面，跳过捕获');
    return;
  }
  captureFromTab(tab.id);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'zhihu_article') {
    chrome.storage.local.set({ lastArticle: msg.article })
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'capture_current_tab') {
    (async () => {
      try {
        const tab = await resolveCaptureTab(msg);
        if (!tab) {
          sendResponse({ ok: false, error: '当前页面不是知乎内容页' });
          return;
        }
        rememberCaptureTab(tab);
        const result = await captureFromTab(tab.id);
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message || String(e) });
      }
    })();
    return true;
  }
});

async function resolveCaptureTab(msg = {}) {
  if (Number.isInteger(msg.tabId)) {
    try {
      const tab = await chrome.tabs.get(msg.tabId);
      if (isZhihuUrl(tab?.url || msg.tabUrl)) return tab;
    } catch (e) {
      debugLog('[知乎创作图鉴 bg] 指定 tab 不可用:', e.message);
    }
  }

  for (const query of [{ active: true, currentWindow: true }, { active: true, lastFocusedWindow: true }]) {
    try {
      const [tab] = await chrome.tabs.query(query);
      if (tab?.id && isZhihuUrl(tab.url)) return tab;
    } catch (e) {
      debugLog('[知乎创作图鉴 bg] 查询当前 tab 失败:', e.message);
    }
  }

  try {
    const tabs = await chrome.tabs.query({ url: ZHIHU_TAB_PATTERNS });
    const tab = pickBestZhihuTab(tabs);
    if (tab) return tab;
  } catch (e) {
    debugLog('[知乎创作图鉴 bg] 查询知乎 tab 失败:', e.message);
  }

  if (lastCaptureTabId) {
    try {
      const tab = await chrome.tabs.get(lastCaptureTabId);
      if (isZhihuUrl(tab?.url || lastCaptureTabUrl)) return tab;
    } catch (e) {
      debugLog('[知乎创作图鉴 bg] 最近捕获 tab 不可用:', e.message);
    }
  }

  return null;
}

function pickBestZhihuTab(tabs = []) {
  return tabs
    .filter(tab => tab?.id && isZhihuUrl(tab.url))
    .sort((a, b) => {
      if (!!b.active !== !!a.active) return Number(b.active) - Number(a.active);
      if (!!b.highlighted !== !!a.highlighted) return Number(b.highlighted) - Number(a.highlighted);
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    })[0] || null;
}

async function captureFromTab(tabId) {
  const failures = [];
  try {
    const captured = await captureViaContentScript(tabId);
    if (isCapturedArticleValid(captured)) {
      return saveCapturedArticle(captured, 'content');
    }
    failures.push('页面脚本未返回足够正文');
  } catch (e) {
    failures.push(e.message || String(e));
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: grabPageContent,
    });
    const captured = results?.[0]?.result;
    debugLog('[知乎创作图鉴 bg] 捕获结果:',
      captured ? `类型=${captured.type} 标题=${captured.title?.slice(0, 20)} 正文=${captured.body?.length}字` : 'null'
    );
    if (isCapturedArticleValid(captured)) return saveCapturedArticle(captured, 'inject');
    console.warn('[知乎创作图鉴 bg] 内容太短或为空');
    failures.push('注入抓取未返回足够正文');
  } catch (e) {
    console.error('[知乎创作图鉴 bg] 注入失败:', e.message);
    failures.push(e.message || String(e));
  }

  return {
    ok: false,
    error: '当前知乎页没有抓到足够长的正文，请确认页面已加载完整后再点一次',
    detail: failures.filter(Boolean).join('；'),
  };
}

async function captureViaContentScript(tabId) {
  return chrome.tabs.sendMessage(tabId, { action: 'capture_request' });
}

function isCapturedArticleValid(article) {
  return !!(article && typeof article.body === 'string' && article.body.trim().length > 30);
}

async function saveCapturedArticle(article, method) {
  const captured = { ...article, body: article.body.trim() };
  await chrome.storage.local.set({ lastArticle: captured });
  debugLog('[知乎创作图鉴 bg] 已写入 storage, method=', method);
  return { ok: true, article: captured, method };
}

// 注入到知乎页面的捕获函数必须自包含，不能引用 service worker 外层变量。
function grabPageContent() {
  const url = location.href;

  if (/\/p\/\d+/.test(url)) {
    const title = document.querySelector('h1.Post-Title, .Post-Title')?.innerText?.trim()
      || document.querySelector('meta[property="og:title"]')?.content?.replace(/ - 知乎$/, '').trim()
      || document.title.replace(/ - 知乎$/, '').trim();
    const bodyEl = pickReadableElement(['.Post-RichText', '.Post-RichText .RichText', 'article .RichText', '.RichText', '.RichContent-inner', 'article', 'main']);
    const body = bodyEl?.innerText?.trim() || '';
    if (body.length > 30) return { type: 'article', title, body, author: '', url, source_id: '', published_at: '' };
  }

  if (/\/question\/\d+\/answer\/\d+/.test(url)) {
    const title = document.querySelector('h1.QuestionHeader-title, .QuestionHeader-title')?.innerText?.trim()
      || document.querySelector('meta[property="og:title"]')?.content?.replace(/ - 知乎$/, '').trim()
      || document.title.replace(/ - 知乎$/, '').trim();
    const answerId = url.match(/\/answer\/(\d+)/)?.[1];
    let answerEl = answerId ? document.querySelector(`[data-zop*='"answerId":${answerId}']`) : null;
    if (!answerEl) answerEl = document.querySelector('.AnswerItem, .List-item');
    const root = answerEl || document;
    const bodyEl = pickReadableElement(['.RichContent-inner', '.RichContent-inner .RichText', '.RichText', 'article', 'main'], root);
    const body = bodyEl?.innerText?.trim() || '';
    const author = root.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name a')?.innerText?.trim() || '';
    const publishedAt = root.querySelector('.ContentItem-time time')?.getAttribute('datetime') || '';
    if (body.length > 30) return { type: 'answer', title, body, author, url, source_id: '', published_at: publishedAt };
  }

  if (/\/pin\/\d+/.test(url)) {
    const bodyEl = pickReadableElement(['.PinItem-content .RichText', '.PinItem .RichText', '.RichText', 'article', 'main']);
    const body = bodyEl?.innerText?.trim() || '';
    const author = document.querySelector('.AuthorInfo-name a')?.innerText?.trim() || '';
    const publishedAt = document.querySelector('time')?.getAttribute('datetime') || '';
    if (body.length > 10) {
      return { type: 'pin', title: body.slice(0, 30) + (body.length > 30 ? '…' : ''), body, author, url, source_id: '', published_at: publishedAt };
    }
  }

  const blocks = [
    ...document.querySelectorAll('.AnswerItem'),
    ...document.querySelectorAll('.ArticleItem'),
    ...document.querySelectorAll('.PinItem'),
    ...document.querySelectorAll('.List-item'),
    ...document.querySelectorAll('.ContentItem'),
  ];

  const valid = blocks.filter(el => (el.innerText?.trim().length || 0) > 80);
  if (!valid.length) {
    const fallbackEl = pickReadableElement(['article', 'main', '.RichText', '.RichContent-inner', '#root', 'body']);
    const fallbackBody = fallbackEl?.innerText?.trim() || '';
    if (fallbackBody.length > 80) {
      return {
        type: 'article',
        title: document.querySelector('h1')?.innerText?.trim()
          || document.querySelector('meta[property="og:title"]')?.content?.replace(/ - 知乎$/, '').trim()
          || document.title.replace(/ - 知乎$/, '').trim(),
        body: fallbackBody,
        author: '',
        url,
        source_id: '',
        published_at: '',
      };
    }
    console.warn('[知乎创作图鉴 inject] 未找到任何有效内容块');
    return null;
  }

  let best = valid[0], bestScore = -Infinity;
  for (const el of valid) {
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    if (visible > bestScore) { bestScore = visible; best = el; }
  }

  const cls = best.className || '';
  let type = 'answer';
  if (cls.includes('PinItem')) type = 'pin';
  else if (cls.includes('ArticleItem')) type = 'article';

  const bodyEl = best.querySelector('.RichContent-inner, .RichContent-inner .RichText, .RichText');
  const body = bodyEl?.innerText?.trim() || best.innerText?.trim() || '';

  let title = '';
  if (type === 'pin') {
    title = body.slice(0, 30) + (body.length > 30 ? '…' : '');
  } else {
    title = best.querySelector('.ContentItem-title a, .QuestionItem-title a, h2 a, .ContentItem-title')?.innerText?.trim()
      || document.title.replace(/ - 知乎$/, '').trim();
  }

  const author = best.querySelector('.AuthorInfo-name a, .AuthorInfo-name .UserLink-link')?.innerText?.trim() || '';
  const publishedAt = best.querySelector('.ContentItem-time time')?.getAttribute('datetime') || '';
  const articleLink = best.querySelector(
    'a[href*="/answer/"], a[href*="/p/"], a[href*="/pin/"], .ContentItem-title a, h2 a'
  );
  const articleUrl = articleLink?.href || url;

  return { type, title, body, author, url: articleUrl, source_id: '', published_at: publishedAt };

  function pickReadableElement(selectors, root = document) {
    let best = null;
    let bestLen = 0;
    for (const sel of selectors) {
      for (const el of root.querySelectorAll(sel)) {
        const len = el.innerText?.trim().length || 0;
        if (len > bestLen) {
          best = el;
          bestLen = len;
        }
      }
    }
    return best;
  }
}
