'use strict';

const ZHIHU_OPENAPI_BASE = 'https://openapi.zhihu.com';
let zhihuStoryListCache = null;

function getZhihuOpenApiConfig() {
  const cfg = globalThis.ZHIHU_OPENAPI_DEFAULTS || {};
  const appKey = String(cfg.appKey || '').trim();
  const appSecret = String(cfg.appSecret || '').trim();
  if (!cfg.enabled || !appKey || !appSecret || appSecret.includes('__')) return null;
  return { appKey, appSecret };
}

function zhihuOpenApiReady() {
  return !!getZhihuOpenApiConfig();
}

function zhihuOpenApiLogId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `zhj_${Date.now()}_${rand}`;
}

function zhihuBuildSignString(appKey, timestamp, logId, extraInfo = '') {
  return `app_key:${appKey}|ts:${timestamp}|logid:${logId}|extra_info:${extraInfo}`;
}

async function zhihuHmacSha256Base64(secret, text) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  const bytes = new Uint8Array(sig);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

async function zhihuOpenApiHeaders() {
  const cfg = getZhihuOpenApiConfig();
  if (!cfg) throw new Error('知乎比赛 API 还没有配置');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const logId = zhihuOpenApiLogId();
  const extraInfo = '';
  const signText = zhihuBuildSignString(cfg.appKey, timestamp, logId, extraInfo);
  const sign = await zhihuHmacSha256Base64(cfg.appSecret, signText);
  return {
    'X-App-Key': cfg.appKey,
    'X-Timestamp': timestamp,
    'X-Log-Id': logId,
    'X-Sign': sign,
    'X-Extra-Info': extraInfo,
  };
}

async function zhihuOpenApiFetch(path, { query = {}, method = 'GET', body = null } = {}) {
  const url = new URL(path, ZHIHU_OPENAPI_BASE);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const headers = await zhihuOpenApiHeaders();
  if (body) headers['Content-Type'] = 'application/json';
  const resp = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`知乎开放 API 请求失败：HTTP ${resp.status}`);
  if (!data) throw new Error('知乎开放 API 没有返回 JSON');
  const status = data.status ?? data.code;
  if (status !== undefined && Number(status) !== 0) {
    throw new Error(data.msg || data.message || '知乎开放 API 返回失败');
  }
  return data.data;
}

async function zhihuFetchStoryList({ force = false } = {}) {
  if (zhihuStoryListCache && !force) return zhihuStoryListCache;
  const list = await zhihuOpenApiFetch('/openapi/hackathon_story/list');
  zhihuStoryListCache = Array.isArray(list) ? list : [];
  return zhihuStoryListCache;
}

async function zhihuFetchStoryDetail(workId) {
  if (!workId) throw new Error('缺少故事 ID');
  return zhihuOpenApiFetch('/openapi/hackathon_story/detail', {
    query: { work_id: workId },
  });
}

function zhihuStoryToArticle(summary = {}, detail = {}) {
  const title = summary.title || detail.title || detail.chapter_name || '知乎开放故事';
  const chapter = detail.chapter_name && detail.chapter_name !== title ? ` - ${detail.chapter_name}` : '';
  const labels = detail.labels || summary.labels || [];
  const intro = detail.introduction || summary.description || '';
  const content = detail.content || '';
  const labelText = labels.length ? `标签：${labels.join(' / ')}` : '';
  const body = [
    `标题：${title}${chapter}`,
    detail.author_name ? `作者：${detail.author_name}` : '',
    labelText,
    intro ? `导语：${intro}` : '',
    content,
  ].filter(Boolean).join('\n\n');
  return {
    title: `${title}${chapter}`,
    author: detail.author_name || '',
    body,
    url: `zhihu-hackathon-story://${detail.work_id || summary.work_id || ''}`,
    type: 'zhihu_story',
    published_at: '知乎黑客松开放故事',
    work_id: detail.work_id || summary.work_id || '',
    labels,
  };
}
