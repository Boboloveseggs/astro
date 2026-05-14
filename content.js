'use strict';

(function () {
  var DEBUG = false;

  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  function getPageType() {
    const url = location.href;
    if (/\/question\/\d+\/answer\/\d+/.test(url)) return 'answer';
    if (/\/pin\/\d+/.test(url)) return 'pin';
    if (/\/p\/\d+/.test(url)) return 'article';
    return null;
  }

  // ── 针对特定内容页的精确捕获 ─────────────────────────────
  function captureContentPage() {
    const type = getPageType();
    const url  = location.href;
    let title = '', body = '', author = '', publishedAt = '';

    if (type === 'article') {
      title = document.querySelector('h1.Post-Title, .Post-Title')?.innerText?.trim()
        || document.title.replace(/ - 知乎$/, '').trim();
      for (const sel of ['.Post-RichText', '.Post-RichText .RichText', '.RichText', '.RichContent-inner']) {
        const el = document.querySelector(sel);
        if ((el?.innerText?.trim().length || 0) > 50) { body = el.innerText.trim(); break; }
      }
      author = document.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name a')?.innerText?.trim() || '';
      publishedAt = document.querySelector('.ContentItem-time time')?.getAttribute('datetime') || '';

    } else if (type === 'answer') {
      title = document.querySelector('h1.QuestionHeader-title, .QuestionHeader-title')?.innerText?.trim()
        || document.title.replace(/ - 知乎$/, '').trim();
      const answerId = url.match(/\/answer\/(\d+)/)?.[1];
      let answerEl = answerId
        ? document.querySelector(`[data-zop*='"answerId":${answerId}']`) : null;
      if (!answerEl) answerEl = document.querySelector('.AnswerItem, .List-item');
      const root = answerEl || document;
      for (const sel of ['.RichContent-inner', '.RichContent-inner .RichText', '.RichText']) {
        const el = root.querySelector(sel);
        if ((el?.innerText?.trim().length || 0) > 50) { body = el.innerText.trim(); break; }
      }
      author = root.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name a')?.innerText?.trim() || '';
      publishedAt = root.querySelector('.ContentItem-time time')?.getAttribute('datetime') || '';

    } else if (type === 'pin') {
      for (const sel of ['.PinItem-content .RichText', '.PinItem .RichText', '.RichText']) {
        const el = document.querySelector(sel);
        if ((el?.innerText?.trim().length || 0) > 10) {
          body  = el.innerText.trim();
          title = body.slice(0, 30) + (body.length > 30 ? '…' : '');
          break;
        }
      }
      author = document.querySelector('.AuthorInfo-name a')?.innerText?.trim() || '';
      publishedAt = document.querySelector('time')?.getAttribute('datetime') || '';
    }

    return { type, title, body, author, url, source_id: '', published_at: publishedAt };
  }

  // ── 在主页 / 个人主页等 feed 页面捕获最显眼的一条内容 ────
  function captureVisibleContent() {
    const type = getPageType();
    if (type) return captureContentPage();   // 已在内容页，直接精确捕获

    const candidates = [
      ...document.querySelectorAll('.AnswerItem'),
      ...document.querySelectorAll('.ArticleItem'),
      ...document.querySelectorAll('.PinItem'),
      ...document.querySelectorAll('.ContentItem'),
    ].filter(el => (el.innerText?.trim().length || 0) > 50);

    if (!candidates.length) return null;

    // 找视口内可见高度最大的元素
    let bestEl = candidates[0], bestScore = -Infinity;
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (visible > bestScore) { bestScore = visible; bestEl = el; }
    }

    let contentType = 'answer';
    if (bestEl.classList.contains('PinItem'))     contentType = 'pin';
    else if (bestEl.classList.contains('ArticleItem')) contentType = 'article';

    const bodyEl = bestEl.querySelector('.RichContent-inner, .RichText');
    const body   = bodyEl?.innerText?.trim() || bestEl.innerText?.trim() || '';

    let title = '';
    if (contentType === 'answer') {
      title = bestEl.querySelector('.ContentItem-title a, .QuestionItem-title a')?.innerText?.trim()
        || document.querySelector('h1.QuestionHeader-title')?.innerText?.trim()
        || document.title.replace(/ - 知乎$/, '').trim();
    } else if (contentType === 'pin') {
      title = body.slice(0, 30) + (body.length > 30 ? '…' : '');
    } else {
      title = bestEl.querySelector('.ContentItem-title a, h2 a')?.innerText?.trim()
        || document.title.replace(/ - 知乎$/, '').trim();
    }

    const author = bestEl.querySelector('.AuthorInfo-name a, .AuthorInfo-name .UserLink-link')
      ?.innerText?.trim() || '';
    const publishedAt = bestEl.querySelector('.ContentItem-time time')
      ?.getAttribute('datetime') || '';

    // 提取文章自己的 URL，避免用 feed 页 URL 导致多条内容互相覆盖
    const articleLink = bestEl.querySelector(
      'a[href*="/answer/"], a[href*="/p/"], a[href*="/pin/"], .ContentItem-title a, h2 a'
    );
    const articleUrl = articleLink?.href || '';

    debugLog(`[知乎创作图鉴] 手动捕获: 类型=${contentType} 正文=${body.length}字 标题=${title.slice(0,20)}`);
    return { type: contentType, title, body, author, url: articleUrl, source_id: '', published_at: publishedAt };
  }

  // ── 消息监听：面板点击"读取当前页面"时触发 ───────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'capture_request') {
      const article = captureVisibleContent();
      sendResponse(article);
      return true;
    }
  });

  // 抓取统一由 background.js 在用户点击图标时通过 executeScript 触发
  // 此处保留 capture_request 消息接口供其他场景按需调用

})();
