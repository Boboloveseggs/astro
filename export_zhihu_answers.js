'use strict';

// 批量导出知乎回答：面板只负责控制和显示进度；实际请求在已登录的 www.zhihu.com 标签页中执行。
const ZHIHU_ANSWERS_EXPORT_CONTROL_KEY = 'zhihuAnswersExportControl';

let exportAnswersState = {
  isRunning: false,
  isPaused: false,
  jobId: '',
  tabId: null,
  wired: false,
  listenerWired: false,
  lastSummary: null,
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
}

function showExportComplete(summary = {}) {
  const completeEl = document.getElementById('exportAnswersComplete');
  const infoEl = document.getElementById('exportAnswersCompleteInfo');
  const total = Number(summary.total_count || 0);
  const failed = Number(summary.failed_count || 0);
  const filename = summary.filename || 'zhihu_answers.json';
  const filterLabel = summary.date_filter?.label || '';

  setExportDisplay('exportAnswersStatus', failed > 0 ? 'block' : 'none');
  setExportDisplay('exportAnswersPauseBtn', 'none');
  if (completeEl) completeEl.style.display = 'block';
  if (infoEl) {
    infoEl.innerHTML = [
      `<div>共导出 ${total} 条回答</div>`,
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
  setExportDisabled('exportAnswersStartBtn', on);
  setExportDisplay('exportAnswersStartBtn', on ? 'none' : 'inline-block');
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
  const current = (await chrome.storage.local.get(ZHIHU_ANSWERS_EXPORT_CONTROL_KEY))[ZHIHU_ANSWERS_EXPORT_CONTROL_KEY] || {};
  await chrome.storage.local.set({
    [ZHIHU_ANSWERS_EXPORT_CONTROL_KEY]: { ...current, ...patch },
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

async function startZhihuAnswersExport() {
  if (exportAnswersState.isRunning) return;
  ensureExportMessageListener();

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

  const jobId = `zhihu-answers-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  exportAnswersState.jobId = jobId;
  exportAnswersState.tabId = tab.id;
  exportAnswersState.lastSummary = null;
  exportAnswersState.isPaused = false;

  setExportRunningUi(true);
  await chrome.storage.local.set({
    [ZHIHU_ANSWERS_EXPORT_CONTROL_KEY]: { jobId, paused: false, cancelled: false },
  });

  try {
    updateExportProgress(0, 0, '正在知乎登录页内启动导出...');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runZhihuAnswersExporterInPage,
      args: [jobId, dateFilter],
    });
    const result = results?.[0]?.result;
    if (!result?.ok) throw new Error(result?.error || '导出没有返回成功状态');
    exportAnswersState.lastSummary = result.summary || exportAnswersState.lastSummary || {};
    showExportComplete(exportAnswersState.lastSummary);
  } catch (error) {
    showExportError(error.message || '导出失败');
    console.error('[知识图鉴] 批量导出知乎回答失败:', error);
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
  if (msgEl) msgEl.textContent = exportAnswersState.isPaused ? '已暂停，点击「继续」恢复' : '继续导出...';
}

function retryZhihuAnswersExport() {
  setExportDisplay('exportAnswersError', 'none');
  setExportDisplay('exportAnswersRetryBtn', 'none');
  startZhihuAnswersExport().catch(error => {
    showExportError(error.message || '重试失败');
  });
}

function initExportAnswersUI() {
  ensureExportMessageListener();
  if (exportAnswersState.wired) return;

  const startBtn = document.getElementById('exportAnswersStartBtn');
  const pauseBtn = document.getElementById('exportAnswersPauseBtn');
  const retryBtn = document.getElementById('exportAnswersRetryBtn');

  if (startBtn) startBtn.addEventListener('click', () => {
    startZhihuAnswersExport().catch(error => showExportError(error.message || '导出失败'));
  });
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    toggleExportPause().catch(error => showExportError(error.message || '暂停状态切换失败'));
  });
  if (retryBtn) retryBtn.addEventListener('click', retryZhihuAnswersExport);

  setExportDisplay('exportAnswersPauseBtn', 'none');
  exportAnswersState.wired = true;
}

// 这个函数会被 chrome.scripting.executeScript 注入到 www.zhihu.com 页面中运行。
async function runZhihuAnswersExporterInPage(jobId, options = {}) {
  const CONTROL_KEY = 'zhihuAnswersExportControl';
  const PAGE_SIZE = 20;
  const MIN_DELAY = 2000;
  const MAX_DELAY = 5000;
  const MAX_RETRIES = 3;
  const DETAIL_INCLUDE = [
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

  function getCreatedTimestamp(answer) {
    const value = Number(answer?.created_time || answer?.createdTime || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function getDateDecision(answer) {
    if (!dateFilter.active) return { include: true, beforeStart: false, afterEnd: false };
    const createdTime = getCreatedTimestamp(answer);
    if (!createdTime) return { include: true, beforeStart: false, afterEnd: false };
    if (dateFilter.startTimestamp && createdTime < dateFilter.startTimestamp) {
      return { include: false, beforeStart: true, afterEnd: false };
    }
    if (dateFilter.endExclusiveTimestamp && createdTime >= dateFilter.endExclusiveTimestamp) {
      return { include: false, beforeStart: false, afterEnd: true };
    }
    return { include: true, beforeStart: false, afterEnd: false };
  }

  function buildExportFilename() {
    if (!dateFilter.active) return 'zhihu_answers.json';
    return `zhihu_answers_${dateFilter.startDate || 'begin'}_to_${dateFilter.endDate || 'now'}.json`;
  }

  async function postMessage(payload) {
    try {
      const maybePromise = chrome.runtime?.sendMessage?.({ ...payload, jobId });
      if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
    } catch (e) {
      // 进度消息失败不影响本地导出。
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
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '';
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

  function normalizeAnswer(raw) {
    const answer = raw || {};
    const id = String(answer.id || '');
    const question = answer.question || {};
    const author = answer.author || {};
    const questionId = question.id ? String(question.id) : '';
    const fallbackUrl = questionId && id
      ? `${location.origin}/question/${questionId}/answer/${id}`
      : absoluteUrl(answer.url, '');
    const contentHtml = String(answer.content || '');
    const excerptText = htmlToText(answer.excerpt || answer.excerpt_new || '');
    const contentText = htmlToText(contentHtml) || excerptText;

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
      created_time: answer.created_time || '',
      created_at: toIsoTime(answer.created_time),
      updated_time: answer.updated_time || '',
      updated_at: toIsoTime(answer.updated_time),
      voteup_count: answer.voteup_count || 0,
      comment_count: answer.comment_count || 0,
      thanks_count: answer.thanks_count || 0,
      author: author.name || '',
      author_url_token: author.url_token || '',
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

    await pauseAwareDelay(randomDelay(), '等待下一次请求...');

    const summaries = new Map();
    let nextUrl = `/api/v4/members/${encodeURIComponent(urlToken)}/answers?offset=0&limit=${PAGE_SIZE}&sort_by=created`;
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
          ? `正在获取回答列表，已发现 ${summaries.size} 条符合日期范围...`
          : `正在获取回答列表，已发现 ${summaries.size} 条...`,
      });
      const list = await fetchJsonWithRetry(nextUrl, '获取回答列表', {
        current: summaries.size,
        total: dateFilter.active ? 0 : knownTotal,
        message: '正在获取回答列表...',
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
      knownTotal = Number(paging.totals || list.totals || knownTotal || summaries.size) || 0;
      if (stoppedAtStartBoundary) break;
      if (paging.is_end || !paging.next || !items.length) break;
      nextUrl = normalizeApiUrl(paging.next);
      await pauseAwareDelay(randomDelay(), '等待下一页列表请求...');
    }

    const answerIds = Array.from(summaries.keys());
    const answers = [];
    const failedItems = [];

    for (let index = 0; index < answerIds.length; index += 1) {
      const answerId = answerIds[index];
      await postMessage({
        type: 'zhihuAnswersExportProgress',
        current: index,
        total: answerIds.length,
        message: `正在导出回答 ${index + 1}/${answerIds.length}...`,
      });

      try {
        const detailUrl = `/api/v4/answers/${encodeURIComponent(answerId)}?include=${encodeURIComponent(DETAIL_INCLUDE)}`;
        const detail = await fetchJsonWithRetry(detailUrl, `获取回答 ${answerId}`, {
          current: index,
          total: answerIds.length,
          message: `正在导出回答 ${index + 1}/${answerIds.length}...`,
        });
        const normalized = normalizeAnswer({ ...summaries.get(answerId), ...detail });
        const decision = getDateDecision(normalized);
        if (decision.include) {
          answers.push(normalized);
        } else if (decision.beforeStart) {
          skippedBeforeStart += 1;
        } else if (decision.afterEnd) {
          skippedAfterEnd += 1;
        }
      } catch (error) {
        const fallback = normalizeAnswer(summaries.get(answerId));
        if (fallback.content || fallback.excerpt || fallback.question_title) {
          fallback.partial = true;
          fallback.partial_reason = error.message;
          answers.push(fallback);
        } else {
          failedItems.push({ answer_id: answerId, error: error.message });
        }
      }

      if (index < answerIds.length - 1) {
        await pauseAwareDelay(randomDelay(), '等待下一条回答请求...');
      }
    }

    await postMessage({
      type: 'zhihuAnswersExportProgress',
      current: answerIds.length,
      total: answerIds.length,
      message: '正在生成 zhihu_answers.json...',
    });

    const filename = buildExportFilename();
    const exportData = {
      export_format: 'zhihu_answers_v1',
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
      total_count: answers.length,
      failed_count: failedItems.length,
      failed_items: failedItems,
      answers,
    };
    downloadJson(filename, exportData);

    const summary = {
      total_count: answers.length,
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
