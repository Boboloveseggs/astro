'use strict';

const ZHIHU_CONTENT_API_BASE = 'https://developer.zhihu.com';
const ZHIHU_CONTENT_ACCESS_SECRET_KEY = 'zhihuAccessSecret';
const ZHIHU_CONTENT_CACHE_KEY = 'zhihuContentApiCache';
const ZHIHU_CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getZhihuAccessSecret() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return '';
  const result = await chrome.storage.local.get(ZHIHU_CONTENT_ACCESS_SECRET_KEY);
  return String(result?.[ZHIHU_CONTENT_ACCESS_SECRET_KEY] || '').trim();
}

async function zhihuContentApiReady() {
  return !!(await getZhihuAccessSecret());
}

function zhihuContentCacheKey(endpoint, query = {}) {
  const normalized = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).trim()}`)
    .join('&');
  return `${endpoint}?${normalized}`;
}

async function getZhihuContentCache(key) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
  const result = await chrome.storage.local.get(ZHIHU_CONTENT_CACHE_KEY);
  const cache = result?.[ZHIHU_CONTENT_CACHE_KEY] || {};
  const item = cache[key];
  if (!item || Date.now() - Number(item.savedAt || 0) > ZHIHU_CONTENT_CACHE_TTL_MS) return null;
  return item.data || null;
}

async function setZhihuContentCache(key, data) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const result = await chrome.storage.local.get(ZHIHU_CONTENT_CACHE_KEY);
  const cache = result?.[ZHIHU_CONTENT_CACHE_KEY] || {};
  cache[key] = { savedAt: Date.now(), data };
  await chrome.storage.local.set({ [ZHIHU_CONTENT_CACHE_KEY]: cache });
}

async function zhihuContentApiFetch(path, { query = {}, force = false } = {}) {
  const accessSecret = await getZhihuAccessSecret();
  if (!accessSecret) throw new Error('知乎开放平台 Access Secret 未配置');

  const cacheKey = zhihuContentCacheKey(path, query);
  if (!force) {
    const cached = await getZhihuContentCache(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(path, ZHIHU_CONTENT_API_BASE);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessSecret}`,
      'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
    },
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`知乎数据开放平台请求失败：HTTP ${resp.status}`);
  if (!data) throw new Error('知乎数据开放平台没有返回 JSON');
  const status = data.status ?? data.Status;
  const code = data.code ?? data.Code;
  const message = data.msg || data.message || data.Message;
  if (status !== undefined && Number(status) !== 0) {
    throw new Error(message || '知乎数据开放平台返回失败');
  }
  if (code !== undefined && Number(code) !== 0) {
    throw new Error(message || data.data || data.Data || '知乎数据开放平台返回失败');
  }

  await setZhihuContentCache(cacheKey, data);
  return data;
}

function zhihuContentPickArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.Data?.Items)) return data.Data.Items;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.Data?.Results)) return data.Data.Results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.List)) return data.List;
  return [];
}

function normalizeZhihuContentResults(data, limit = 5) {
  return zhihuContentPickArray(data).slice(0, limit).map((item, index) => ({
    title: String(item.title || item.Title || item.question_title || item.QuestionTitle || item.name || item.Name || item.content_title || item.ContentTitle || `知乎结果 ${index + 1}`).trim(),
    excerpt: String(item.excerpt || item.Excerpt || item.summary || item.Summary || item.content || item.Content || item.content_text || item.ContentText || item.answer_excerpt || item.AnswerExcerpt || item.description || item.Description || '').replace(/<[^>]+>/g, '').trim(),
    url: String(item.url || item.Url || item.link || item.Link || item.target_url || item.TargetUrl || item.content_url || item.ContentUrl || '').trim(),
    author: String(item.author_name || item.AuthorName || item.author?.name || item.Author?.Name || item.author || item.Author || '').trim(),
    type: String(item.type || item.Type || item.content_type || item.ContentType || item.object_type || item.ObjectType || 'zhihu').trim(),
    raw: item,
  })).filter(item => item.title || item.excerpt);
}

async function zhihuSearchContent(query, { limit = 5, force = false } = {}) {
  const q = String(query || '').trim();
  if (!q) return { query: q, results: [], raw: null };
  const raw = await zhihuContentApiFetch('/api/v1/content/zhihu_search', {
    query: { Query: q },
    force,
  });
  return { query: q, results: normalizeZhihuContentResults(raw, limit), raw };
}

async function zhihuFetchHotList({ limit = 10, force = false } = {}) {
  const raw = await zhihuContentApiFetch('/api/v1/content/hot_list', { force });
  return { results: normalizeZhihuContentResults(raw, limit), raw };
}
