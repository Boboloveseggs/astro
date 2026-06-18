'use strict';

const ZHIHU_CONTENT_EXPORT_CONTROL_KEY = 'zhihuContentExportControl';
const EXPORT_KIND_CONFIGS = {
  answers: { key: 'answers', label: '回答', buttonId: 'exportAnswersStartBtn' },
  articles: { key: 'articles', label: '文章', buttonId: 'exportArticlesStartBtn' },
  pins: { key: 'pins', label: '想法', buttonId: 'exportPinsStartBtn' },
};
const EXPORT_START_BUTTON_IDS = Object.values(EXPORT_KIND_CONFIGS).map(item => item.buttonId);

let exportAnswersState = {
  isRunning: false,
  isPaused: false,
  jobId: '',
  tabId: null,
  wired: false,
  listenerWired: false,
  lastSummary: null,
  lastKind: 'answers',
};

function getExportButton(id) {
  return document.getElementById(id);
}

function setExportText(id, text) {
  const el = getExportButton(id);
  if (el) el.textContent = text;
}

function setExportDisplay(id, display) {
  const el = getExportButton(id);
  if (el) el.style.display = display;
}

function setExportDisabled(id, disabled) {
  const el = getExportButton(id);
  if (el) el.disabled = disabled;
}

function getExportKindConfig(kind) {
  return EXPORT_KIND_CONFIGS[kind] || EXPORT_KIND_CONFIGS.answers;
}

function setExportStartButtonsDisabled(disabled) {
  EXPORT_START_BUTTON_IDS.forEach(id => setExportDisabled(id, disabled));
}

function updateExportProgress(current, total, message = '') {
  const progressLabel = document.getElementById('exportAnswersProgressLabel');
  const progressBar = document.getElementById('exportAnswersProgressBar');
  const progressText = document.getElementById('exportAnswersProgressText');
  const msgEl = document.getElementById('exportAnswersMessage');
  const knownTotal = Number.isFinite(Number(total)) && Number(total) > 0;
  const safeCurrent = Number.isFinite(Number(current)) ? Number(current) : 0;
  const totalText = knownTotal ? String(Number(total)) : '?';
  const percent = knownTotal ? Math.min(100, Math.round((safeCurrent / Number(total)) * 100)) : 0;

  if (progressLabel) {
    progressLabel.textContent = knownTotal
      ? `导出中：${safeCurrent}/${totalText} (${percent}%)`
      : `导出中：${safeCurrent}/${totalText}`;
  }
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressText) progressText.textContent = `${safeCurrent}/${totalText}`;
  if (msgEl && message) msgEl.textContent = message;
}

function showExportStatus() {
  setExportDisplay('exportAnswersStatus', 'block');
  setExportDisplay('exportAnswersComplete', 'none');
  setExportDisplay('exportAnswersError', 'none');
  setExportDisplay('exportAnswersRetryBtn', 'none');
  const completeInfo = document.getElementById('exportAnswersCompleteInfo');
  if (completeInfo) completeInfo.textContent = '';
}

function showExportComplete(summary = {}) {
  const completeEl = document.getElementById('exportAnswersComplete');
  const infoEl = document.getElementById('exportAnswersCompleteInfo');
  const total = Number(summary.total_count || 0);
  const failed = Number(summary.failed_count || 0);
  const filename = summary.filename || 'zhihu_export.json';
  const filterLabel = summary.date_filter?.label || '';
  const itemLabel = summary.item_label || '内容';

  setExportDisplay('exportAnswersStatus', failed > 0 ? 'block' : 'none');
  setExportDisplay('exportAnswersPauseBtn', 'none');
  if (completeEl) completeEl.style.display = 'block';
  if (infoEl) {
    infoEl.innerHTML = [
      `<div>共导出 ${total} 条${itemLabel}</div>`,
      filterLabel ? `<div style="margin-top: 4px; font-size: 10px;">范围：${filterLabel}</div>` : '',
      `<div style="margin-top: 4px; font-size: 10px;">文件名：${filename}${failed ? `；失败 ${failed} 条，可点重试` : ''}</div>`,
    ].join('');
  }
  setExportDisplay('exportAnswersRetryBtn', failed > 0 ? 'inline-block' : 'none');
}

function showExportError(message) {
  const errorEl = document.getElementById('exportAnswersError');
  if (errorEl) {
    errorEl.textContent = message || '导出失败';
    errorEl.style.display = 'block';
  }
  setExportDisplay('exportAnswersRetryBtn', 'inline-block');
}

function setExportRunningUi(on) {
  exportAnswersState.isRunning = on;
  setExportStartButtonsDisabled(on);
  setExportDisplay('exportAnswersPauseBtn', on ? 'inline-block' : 'none');
  if (!on) {
    exportAnswersState.isPaused = false;
    setExportText('exportAnswersPauseBtn', '暂停');
  }
}

async function getZhihuAnswersExportTab() {
  if (typeof chrome === 'undefined') return null;
  if (!chrome.tabs?.query) return null;
  const isWwwZhihu = (url) => typeof url === 'string' && /^https:\/\/www\.zhihu\.com(\/|$)/.test(url);
  const queries = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
  ];

  for (const query of queries) {
    const [tab] = await chrome.tabs.query(query).catch(() => []);
    if (tab?.id && isWwwZhihu(tab.url)) return tab;
  }

  const tabs = await chrome.tabs.query({ url: 'https://www.zhihu.com/*' }).catch(() => []);
  return tabs
    .filter(tab => tab?.id && isWwwZhihu(tab.url))
    .sort((a, b) => {
      if (!!b.active !== !!a.active) return Number(b.active) - Number(a.active);
      if (!!b.highlighted !== !!a.highlighted) return Number(b.highlighted) - Number(a.highlighted);
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    })[0] || null;
}

async function setExportControl(patch) {
  if (typeof chrome === 'undefined') return;
  if (!chrome.storage?.local) return;
  const current = (await chrome.storage.local.get(ZHIHU_CONTENT_EXPORT_CONTROL_KEY))[ZHIHU_CONTENT_EXPORT_CONTROL_KEY] || {};
  await chrome.storage.local.set({
    [ZHIHU_CONTENT_EXPORT_CONTROL_KEY]: { ...current, ...patch },
  });
}

function handleZhihuAnswersExportMessage(message) {
  if (!message || message.jobId !== exportAnswersState.jobId) return;

  if (message.type === 'zhihuAnswersExportProgress') {
    updateExportProgress(message.current, message.total, message.message);
  }

  if (message.type === 'zhihuAnswersExportComplete') {
    exportAnswersState.lastSummary = message.summary || {};
    showExportComplete(exportAnswersState.lastSummary);
    setExportRunningUi(false);
  }

  if (message.type === 'zhihuAnswersExportError') {
    showExportError(message.error);
    setExportRunningUi(false);
  }
}

function ensureExportMessageListener() {
  if (exportAnswersState.listenerWired || typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
  chrome.runtime.onMessage.addListener(handleZhihuAnswersExportMessage);
  exportAnswersState.listenerWired = true;
}

function readExportDateFilter() {
  const startDate = (document.getElementById('exportAnswersStartDate')?.value || '').trim();
  const endDate = (document.getElementById('exportAnswersEndDate')?.value || '').trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (startDate && !datePattern.test(startDate)) throw new Error('起始日期格式不正确');
  if (endDate && !datePattern.test(endDate)) throw new Error('结束日期格式不正确');
  if (startDate && endDate && startDate > endDate) throw new Error('起始日期不能晚于结束日期');

  return { startDate, endDate };
}

async function startZhihuAnswersExport(kind = 'answers') {
  if (exportAnswersState.isRunning) return;
  ensureExportMessageListener();

  const config = getExportKindConfig(kind);
  exportAnswersState.lastKind = config.key;

  let dateFilter = {};
  try {
    dateFilter = readExportDateFilter();
  } catch (error) {
    showExportError(error.message || '日期范围不正确');
    return;
  }

  showExportStatus();
  updateExportProgress(0, 0, '正在寻找已登录的知乎标签页...');

  const tab = await getZhihuAnswersExportTab();
  if (!tab?.id) {
    showExportError('请先在当前浏览器打开并登录 https://www.zhihu.com/，再点击导出。');
    return;
  }

  const jobId = `zhihu-${config.key}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  exportAnswersState.jobId = jobId;
  exportAnswersState.tabId = tab.id;
  exportAnswersState.lastSummary = null;
  exportAnswersState.isPaused = false;

  setExportRunningUi(true);
  await chrome.storage.local.set({
    [ZHIHU_CONTENT_EXPORT_CONTROL_KEY]: { jobId, paused: false, cancelled: false },
  });

  try {
    updateExportProgress(0, 0, `正在知乎登录页内启动${config.label}导出...`);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runZhihuAnswersExporterInPage,
      args: [jobId, { ...dateFilter, kind: config.key }],
    });
    const result = results?.[0]?.result;
    if (!result?.ok) throw new Error(result?.error || '导出没有返回成功状态');
    exportAnswersState.lastSummary = result.summary || exportAnswersState.lastSummary || {};
    showExportComplete(exportAnswersState.lastSummary);
  } catch (error) {
    showExportError(error.message || '导出失败');
    console.error('[知识图鉴] 批量导出知乎内容失败:', error);
  } finally {
    await setExportControl({ cancelled: true, paused: false }).catch(() => {});
    setExportRunningUi(false);
  }
}

async function toggleExportPause() {
  if (!exportAnswersState.isRunning || !exportAnswersState.jobId) return;
  exportAnswersState.isPaused = !exportAnswersState.isPaused;
  await setExportControl({
    jobId: exportAnswersState.jobId,
    paused: exportAnswersState.isPaused,
    cancelled: false,
  });
  setExportText('exportAnswersPauseBtn', exportAnswersState.isPaused ? '继续' : '暂停');
  const msgEl = document.getElementById('exportAnswersMessage');
  if (msgEl) msgEl.textContent = exportAnswersState.isPaused ? '已暂停，点击“继续”恢复' : '继续导出...';
}

function retryZhihuAnswersExport() {
  setExportDisplay('exportAnswersError', 'none');
  setExportDisplay('exportAnswersRetryBtn', 'none');
  startZhihuAnswersExport(exportAnswersState.lastKind || 'answers').catch(error => {
    showExportError(error.message || '重试失败');
  });
}

function initExportAnswersUI() {
  ensureExportMessageListener();
  if (exportAnswersState.wired) return;

  document.querySelectorAll('[data-export-kind]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.getAttribute('data-export-kind') || 'answers';
      startZhihuAnswersExport(kind).catch(error => showExportError(error.message || '导出失败'));
    });
  });

  const pauseBtn = document.getElementById('exportAnswersPauseBtn');
  const retryBtn = document.getElementById('exportAnswersRetryBtn');

  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    toggleExportPause().catch(error => showExportError(error.message || '暂停状态切换失败'));
  });
  if (retryBtn) retryBtn.addEventListener('click', retryZhihuAnswersExport);

  setExportDisplay('exportAnswersPauseBtn', 'none');
  exportAnswersState.wired = true;
}

async function runZhihuAnswersExporterInPage(jobId, options = {}) {
  const CONTROL_KEY = 'zhihuContentExportControl';
  const PAGE_SIZE = 20;
  const MIN_DELAY = 2000;
  const MAX_DELAY = 5000;
  const MAX_RETRIES = 3;
  const ANSWER_DETAIL_INCLUDE = [
    'content',
    'excerpt',
    'question',
    'author',
    'voteup_count',
    'comment_count',
    'thanks_count',
    'created_time',
    'updated_time',
    'url',
  ].join(',');
  const ARTICLE_DETAIL_INCLUDE = [
    'content',
    'excerpt',
    'author',
    'voteup_count',
    'comment_count',
    'created',
    'updated',
    'url',
    'title',
  ].join(',');

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const randomDelay = () => Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

  function parseDateBoundary(dateText, nextDay = false) {
    if (!dateText) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText));
    if (!match) throw new Error(`日期格式不正确：${dateText}`);
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]) + (nextDay ? 1 : 0);
    const date = new Date(year, monthIndex, day, 0, 0, 0, 0);
    if (!Number.isFinite(date.getTime())) throw new Error(`日期无效：${dateText}`);
    return Math.floor(date.getTime() / 1000);
  }

  function createDateFilter(rawOptions = {}) {
    const startDate = String(rawOptions.startDate || '').trim();
    const endDate = String(rawOptions.endDate || '').trim();
    if (startDate && endDate && startDate > endDate) throw new Error('起始日期不能晚于结束日期');
    const startTimestamp = parseDateBoundary(startDate, false);
    const endExclusiveTimestamp = parseDateBoundary(endDate, true);
    const active = Boolean(startTimestamp || endExclusiveTimestamp);
    const label = active
      ? `${startDate || '最早'} 至 ${endDate || '现在'}`
      : '全部时间';
    return { active, startDate, endDate, startTimestamp, endExclusiveTimestamp, label };
  }

  const dateFilter = createDateFilter(options);

  function normalizeTimestamp(value) {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'string' && !/^\d+(\.\d+)?$/.test(value.trim())) {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
  }

  function getCreatedTimestamp(item) {
    return normalizeTimestamp(item?.created_time ?? item?.created ?? item?.created_at ?? item?.createdAt);
  }

  function getUpdatedTimestamp(item) {
    return normalizeTimestamp(item?.updated_time ?? item?.updated ?? item?.updated_at ?? item?.updatedAt);
  }

  function getDateDecision(item) {
    if (!dateFilter.active) return { include: true, beforeStart: false, afterEnd: false };
    const createdTime = getCreatedTimestamp(item);
    if (!createdTime) return { include: true, beforeStart: false, afterEnd: false };
    if (dateFilter.startTimestamp && createdTime < dateFilter.startTimestamp) {
      return { include: false, beforeStart: true, afterEnd: false };
    }
    if (dateFilter.endExclusiveTimestamp && createdTime >= dateFilter.endExclusiveTimestamp) {
      return { include: false, beforeStart: false, afterEnd: true };
    }
    return { include: true, beforeStart: false, afterEnd: false };
  }

  function buildExportFilename(target) {
    if (!dateFilter.active) return `${target.filenamePrefix}.json`;
    return `${target.filenamePrefix}_${dateFilter.startDate || 'begin'}_to_${dateFilter.endDate || 'now'}.json`;
  }

  async function postMessage(payload) {
    try {
      const maybePromise = chrome.runtime?.sendMessage?.({ ...payload, jobId });
      if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
    } catch (e) {
      // Progress messages are best-effort; download still works if one is missed.
    }
  }

  async function getControl() {
    try {
      const data = await chrome.storage.local.get(CONTROL_KEY);
      return data?.[CONTROL_KEY] || {};
    } catch (e) {
      return {};
    }
  }

  async function ensureNotPaused(message) {
    let notified = false;
    while (true) {
      const control = await getControl();
      if (control.jobId && control.jobId !== jobId) throw new Error('导出任务已被新的任务替换');
      if (control.cancelled) throw new Error('导出已取消');
      if (!control.paused) return;
      if (!notified) {
        await postMessage({ type: 'zhihuAnswersExportProgress', current: 0, total: 0, message: message || '已暂停，等待继续...' });
        notified = true;
      }
      await sleep(250);
    }
  }

  async function pauseAwareDelay(ms, message) {
    const started = Date.now();
    let elapsed = 0;
    while (elapsed < ms) {
      await ensureNotPaused(message);
      const step = Math.min(250, ms - elapsed);
      await sleep(step);
      elapsed = Date.now() - started;
    }
  }

  function makeNonRetryableError(message) {
    const error = new Error(message);
    error.nonRetryable = true;
    return error;
  }

  async function fetchJsonWithRetry(url, label, progress = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      await ensureNotPaused(progress.message);
      try {
        const response = await fetch(url, {
          credentials: 'include',
          headers: { Accept: 'application/json, text/plain, */*' },
        });
        if (response.status === 401) throw makeNonRetryableError('未登录知乎或登录已过期，请在当前浏览器登录知乎后重试');
        if (response.status === 403) throw makeNonRetryableError('知乎拒绝了本次访问，可能需要在知乎页面完成验证后重试');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error('返回内容不是 JSON');
        }
      } catch (error) {
        lastError = error;
        if (error.nonRetryable || attempt >= MAX_RETRIES) break;
        await postMessage({
          type: 'zhihuAnswersExportProgress',
          current: progress.current || 0,
          total: progress.total || 0,
          message: `${label}失败，正在第 ${attempt + 1} 次重试...`,
        });
        await pauseAwareDelay(randomDelay(), '重试等待中...');
      }
    }
    throw new Error(`${label}失败：${lastError?.message || '未知错误'}`);
  }

  function normalizeApiUrl(rawUrl) {
    const url = new URL(rawUrl, location.origin);
    if (url.hostname !== 'www.zhihu.com') throw new Error('知乎返回了非 www.zhihu.com 的分页地址，已停止导出');
    return `${url.pathname}${url.search}`;
  }

  function htmlToText(html) {
    if (!html) return '';
    const box = document.createElement('div');
    box.innerHTML = String(html);
    return (box.textContent || box.innerText || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function toIsoTime(value) {
    const n = normalizeTimestamp(value);
    if (!n) return '';
    return new Date(n * 1000).toISOString();
  }

  function absoluteUrl(rawUrl, fallback) {
    if (!rawUrl) return fallback || '';
    try {
      return new URL(rawUrl, location.origin).href;
    } catch (e) {
      return fallback || String(rawUrl);
    }
  }

  function answerPageUrl(rawUrl, fallback) {
    const url = absoluteUrl(rawUrl, '');
    if (/\/question\/\d+\/answer\/\d+/.test(url)) return url;
    return fallback || url;
  }

  function collectText(value, depth = 0) {
    if (depth > 4 || value === undefined || value === null) return '';
    if (typeof value === 'string') return htmlToText(value);
    if (typeof value === 'number' || typeof value === 'boolean') return '';
    if (Array.isArray(value)) return value.map(item => collectText(item, depth + 1)).filter(Boolean).join('\n');
    if (typeof value === 'object') {
      return ['text', 'content', 'title', 'excerpt', 'excerpt_title', 'description']
        .map(key => collectText(value[key], depth + 1))
        .filter(Boolean)
        .join('\n');
    }
    return '';
  }

  function normalizeAuthor(author = {}) {
    return {
      name: author.name || '',
      url_token: author.url_token || author.urlToken || '',
      id: author.id || '',
    };
  }

  function normalizeAnswer(raw) {
    const answer = raw || {};
    const id = String(answer.id || '');
    const question = answer.question || {};
    const author = normalizeAuthor(answer.author || {});
    const questionId = question.id ? String(question.id) : '';
    const fallbackUrl = questionId && id
      ? `${location.origin}/question/${questionId}/answer/${id}`
      : absoluteUrl(answer.url, '');
    const contentHtml = String(answer.content || '');
    const excerptText = htmlToText(answer.excerpt || answer.excerpt_new || '');
    const contentText = htmlToText(contentHtml) || excerptText;
    const created = getCreatedTimestamp(answer);
    const updated = getUpdatedTimestamp(answer);

    return {
      id,
      question_id: questionId,
      question_title: question.title || answer.title || '',
      title: question.title || answer.title || '',
      url: answerPageUrl(answer.url, fallbackUrl),
      question_url: questionId ? `${location.origin}/question/${questionId}` : absoluteUrl(question.url, ''),
      content: contentHtml || contentText,
      content_html: contentHtml,
      content_text: contentText,
      excerpt: excerptText,
      created_time: created || '',
      created_at: toIsoTime(created),
      updated_time: updated || '',
      updated_at: toIsoTime(updated),
      voteup_count: answer.voteup_count || 0,
      comment_count: answer.comment_count || 0,
      thanks_count: answer.thanks_count || 0,
      author: author.name,
      author_url_token: author.url_token,
    };
  }

  function normalizeArticle(raw) {
    const article = raw || {};
    const id = String(article.id || '');
    const author = normalizeAuthor(article.author || {});
    const contentHtml = String(article.content || '');
    const excerptText = htmlToText(article.excerpt || article.excerpt_title || article.summary || '');
    const contentText = htmlToText(contentHtml) || excerptText;
    const created = getCreatedTimestamp(article);
    const updated = getUpdatedTimestamp(article);
    const fallbackUrl = id ? `https://zhuanlan.zhihu.com/p/${id}` : '';

    return {
      id,
      title: article.title || article.excerpt_title || '',
      url: absoluteUrl(article.url || article.link, fallbackUrl),
      content: contentHtml || contentText,
      content_html: contentHtml,
      content_text: contentText,
      excerpt: excerptText,
      created_time: created || '',
      created_at: toIsoTime(created),
      updated_time: updated || '',
      updated_at: toIsoTime(updated),
      voteup_count: article.voteup_count || article.voting || 0,
      comment_count: article.comment_count || 0,
      author: author.name,
      author_url_token: author.url_token,
    };
  }

  function normalizePin(raw) {
    const pin = raw || {};
    const id = String(pin.id || '');
    const author = normalizeAuthor(pin.author || pin.member || {});
    const contentText = collectText(pin.content || pin.excerpt || pin.summary || pin.title);
    const created = getCreatedTimestamp(pin);
    const updated = getUpdatedTimestamp(pin);
    const fallbackUrl = id ? `${location.origin}/pin/${id}` : '';

    return {
      id,
      title: pin.title || contentText.slice(0, 80),
      url: absoluteUrl(pin.url || pin.link, fallbackUrl),
      content: typeof pin.content === 'string' ? pin.content : contentText,
      content_text: contentText,
      excerpt: contentText.slice(0, 300),
      created_time: created || '',
      created_at: toIsoTime(created),
      updated_time: updated || '',
      updated_at: toIsoTime(updated),
      like_count: pin.like_count || pin.voteup_count || 0,
      comment_count: pin.comment_count || 0,
      author: author.name,
      author_url_token: author.url_token,
      raw_type: pin.type || pin.content_type || '',
    };
  }

  function hasExportableContent(item) {
    return Boolean(item?.content || item?.content_text || item?.excerpt || item?.title || item?.question_title);
  }

  function makeTargets(urlToken) {
    const encodedToken = encodeURIComponent(urlToken);
    return {
      answers: {
        key: 'answers',
        label: '回答',
        filenamePrefix: 'zhihu_answers',
        exportFormat: 'zhihu_answers_v1',
        resultKey: 'answers',
        listUrl: `/api/v4/members/${encodedToken}/answers?offset=0&limit=${PAGE_SIZE}&sort_by=created`,
        detailUrl: id => `/api/v4/answers/${encodeURIComponent(id)}?include=${encodeURIComponent(ANSWER_DETAIL_INCLUDE)}`,
        normalize: normalizeAnswer,
      },
      articles: {
        key: 'articles',
        label: '文章',
        filenamePrefix: 'zhihu_articles',
        exportFormat: 'zhihu_articles_v1',
        resultKey: 'articles',
        listUrl: `/api/v4/members/${encodedToken}/articles?offset=0&limit=${PAGE_SIZE}&sort_by=created`,
        detailUrl: id => `/api/v4/articles/${encodeURIComponent(id)}?include=${encodeURIComponent(ARTICLE_DETAIL_INCLUDE)}`,
        normalize: normalizeArticle,
      },
      pins: {
        key: 'pins',
        label: '想法',
        filenamePrefix: 'zhihu_pins',
        exportFormat: 'zhihu_pins_v1',
        resultKey: 'pins',
        listUrl: `/api/v4/members/${encodedToken}/pins?offset=0&limit=${PAGE_SIZE}`,
        detailUrl: id => `/api/v4/pins/${encodeURIComponent(id)}`,
        normalize: normalizePin,
      },
    };
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  try {
    if (!/^https:\/\/www\.zhihu\.com(\/|$)/.test(location.href)) {
      throw new Error('请在已登录的 www.zhihu.com 页面中运行导出');
    }

    await postMessage({ type: 'zhihuAnswersExportProgress', current: 0, total: 0, message: '正在确认知乎登录状态...' });
    const me = await fetchJsonWithRetry('/api/v4/me?include=url_token,name,id', '确认登录状态', {
      message: '正在确认知乎登录状态...',
    });
    const urlToken = me.url_token || me.urlToken;
    if (!urlToken) throw new Error('没有读取到知乎用户标识，请确认已经登录知乎');

    const targets = makeTargets(urlToken);
    const target = targets[String(options.kind || 'answers')] || targets.answers;

    await pauseAwareDelay(randomDelay(), '等待下一次请求...');

    const summaries = new Map();
    let nextUrl = target.listUrl;
    let knownTotal = 0;
    let skippedBeforeStart = 0;
    let skippedAfterEnd = 0;
    let stoppedAtStartBoundary = false;

    while (nextUrl) {
      await postMessage({
        type: 'zhihuAnswersExportProgress',
        current: summaries.size,
        total: dateFilter.active ? 0 : knownTotal,
        message: dateFilter.active
          ? `正在获取${target.label}列表，已发现 ${summaries.size} 条符合日期范围...`
          : `正在获取${target.label}列表，已发现 ${summaries.size} 条...`,
      });
      const list = await fetchJsonWithRetry(nextUrl, `获取${target.label}列表`, {
        current: summaries.size,
        total: dateFilter.active ? 0 : knownTotal,
        message: `正在获取${target.label}列表...`,
      });
      const items = Array.isArray(list.data) ? list.data : [];
      for (const item of items) {
        const id = String(item?.id || '');
        const decision = getDateDecision(item);
        if (decision.include) {
          if (id && !summaries.has(id)) summaries.set(id, item);
        } else if (decision.beforeStart) {
          skippedBeforeStart += 1;
          stoppedAtStartBoundary = true;
        } else if (decision.afterEnd) {
          skippedAfterEnd += 1;
        }
      }
      const paging = list.paging || {};
      knownTotal = Number(paging.totals || paging.total || list.totals || knownTotal || summaries.size) || 0;
      if (stoppedAtStartBoundary) break;
      if (paging.is_end || !paging.next || !items.length) break;
      nextUrl = normalizeApiUrl(paging.next);
      await pauseAwareDelay(randomDelay(), '等待下一页列表请求...');
    }

    const itemIds = Array.from(summaries.keys());
    const exportedItems = [];
    const failedItems = [];

    for (let index = 0; index < itemIds.length; index += 1) {
      const itemId = itemIds[index];
      await postMessage({
        type: 'zhihuAnswersExportProgress',
        current: index,
        total: itemIds.length,
        message: `正在导出${target.label} ${index + 1}/${itemIds.length}...`,
      });

      const summaryItem = summaries.get(itemId);
      try {
        let detail = {};
        if (typeof target.detailUrl === 'function') {
          detail = await fetchJsonWithRetry(target.detailUrl(itemId), `获取${target.label} ${itemId}`, {
            current: index,
            total: itemIds.length,
            message: `正在导出${target.label} ${index + 1}/${itemIds.length}...`,
          });
        }
        const normalized = target.normalize({ ...summaryItem, ...detail });
        const decision = getDateDecision(normalized);
        if (decision.include) {
          exportedItems.push(normalized);
        } else if (decision.beforeStart) {
          skippedBeforeStart += 1;
        } else if (decision.afterEnd) {
          skippedAfterEnd += 1;
        }
      } catch (error) {
        const fallback = target.normalize(summaryItem);
        if (hasExportableContent(fallback)) {
          fallback.partial = true;
          fallback.partial_reason = error.message;
          exportedItems.push(fallback);
        } else {
          failedItems.push({ item_id: itemId, content_type: target.key, error: error.message });
        }
      }

      if (index < itemIds.length - 1) {
        await pauseAwareDelay(randomDelay(), `等待下一条${target.label}请求...`);
      }
    }

    const filename = buildExportFilename(target);
    await postMessage({
      type: 'zhihuAnswersExportProgress',
      current: itemIds.length,
      total: itemIds.length,
      message: `正在生成 ${filename}...`,
    });

    const exportData = {
      export_format: target.exportFormat,
      content_type: target.key,
      content_label: target.label,
      exported_at: new Date().toISOString(),
      source: 'www.zhihu.com logged-in browser',
      request_interval_ms: { min: MIN_DELAY, max: MAX_DELAY },
      date_filter: {
        active: dateFilter.active,
        start_date: dateFilter.startDate,
        end_date: dateFilter.endDate,
        label: dateFilter.label,
        stopped_at_start_boundary: stoppedAtStartBoundary,
        skipped_before_start: skippedBeforeStart,
        skipped_after_end: skippedAfterEnd,
      },
      total_count: exportedItems.length,
      failed_count: failedItems.length,
      failed_items: failedItems,
      [target.resultKey]: exportedItems,
    };
    downloadJson(filename, exportData);

    const summary = {
      content_type: target.key,
      item_label: target.label,
      total_count: exportedItems.length,
      failed_count: failedItems.length,
      failed_items: failedItems,
      filename,
      date_filter: exportData.date_filter,
    };
    await postMessage({ type: 'zhihuAnswersExportComplete', summary });
    return { ok: true, summary };
  } catch (error) {
    await postMessage({ type: 'zhihuAnswersExportError', error: error.message || '导出失败' });
    return { ok: false, error: error.message || '导出失败' };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExportAnswersUI);
} else {
  initExportAnswersUI();
}
