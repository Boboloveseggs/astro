'use strict';

const DB_NAME    = 'zhijing_db';
const DB_VERSION = 4;
var DEBUG = false;

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function dbCurrentName() {
  return globalThis.__ZHJ_TEST_DB_NAME__ || DB_NAME;
}

function ensureClipsStore(db) {
  if (db.objectStoreNames.contains('clips')) return;
  const s = db.createObjectStore('clips', { keyPath: 'id' });
  s.createIndex('by_type', 'type');
  s.createIndex('by_article', 'source_article_id');
  s.createIndex('by_savedAt', 'savedAt');
}

// ── 打开数据库 ───────────────────────────────────────────
function dbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbCurrentName(), DB_VERSION);
    req.onupgradeneeded = e => {
      const db  = e.target.result;
      const old = e.oldVersion;

      if (old < 1) {
        const s = db.createObjectStore('articles', { keyPath: 'id' });
        s.createIndex('by_date',    'savedAt');
        s.createIndex('by_url',     'url');
        s.createIndex('by_project', 'project_id');
        db.createObjectStore('nodes',  { keyPath: 'id' });
        db.createObjectStore('config', { keyPath: 'key' });
      }

      if (old >= 1 && old < 2) {
        // 既有用户：为 articles 表补 by_project 索引
        const store = e.target.transaction.objectStore('articles');
        if (!store.indexNames.contains('by_project')) {
          store.createIndex('by_project', 'project_id');
        }
      }

      if (old >= 2 && old < 3) {
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      }

      if (old < 4) {
        ensureClipsStore(db);
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── 文章 ─────────────────────────────────────────────────
function sameProjectId(a, b) {
  return (a?.project_id || 'default') === (b?.project_id || 'default');
}

function findUniqueUrlRecord(records, url) {
  if (!url) return null;
  const matches = (records || []).filter(rec => rec?.url === url);
  return matches.length === 1 ? matches[0] : null;
}

function findUniqueShortIdRecord(records, shortId) {
  if (!shortId) return null;
  const matches = (records || []).filter(rec => rec?.id?.slice(-6) === shortId);
  return matches.length === 1 ? matches[0] : null;
}

async function dbSaveArticle(record) {
  if (!record.project_id) record.project_id = 'default';
  const db = await dbOpen();
  await new Promise((resolve, reject) => {
    const t     = db.transaction('articles', 'readwrite');
    const store = t.objectStore('articles');
    t.oncomplete = () => resolve();
    t.onerror    = e => reject(e.target.error);

    if (record.url) {
      // 同项目内 URL 唯一；不同项目允许收录同一 URL。
      store.index('by_url').openCursor(IDBKeyRange.only(record.url)).onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor) {
          store.put(record);
          return;
        }
        const existing = cursor.value;
        if (sameProjectId(existing, record)) {
          record.id = existing.id;
          store.put(record);
          return;
        }
        cursor.continue();
      };
    } else {
      store.put(record);
    }
  });
}

async function dbPutArticle(record) {
  if (!record.project_id) record.project_id = 'default';
  const db = await dbOpen();
  await new Promise((resolve, reject) => {
    const req = db.transaction('articles', 'readwrite').objectStore('articles').put(record);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbGetAllArticles(filter = {}) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const results = [];
    const project = filter.project || null;
    const t   = db.transaction('articles', 'readonly');
    const req = t.objectStore('articles').index('by_date').openCursor(null, 'prev');
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        const rec = cursor.value;
        if (!project || (rec.project_id || 'default') === project) results.push(rec);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function dbGetArticle(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('articles', 'readonly').objectStore('articles').get(id);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbGetArticleCount(filter = {}) {
  const db      = await dbOpen();
  const project = filter.project || null;
  return new Promise((resolve, reject) => {
    if (!project) {
      const req = db.transaction('articles', 'readonly').objectStore('articles').count();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
      return;
    }
    let count = 0;
    const req = db.transaction('articles', 'readonly').objectStore('articles')
      .index('by_project').openCursor(IDBKeyRange.only(project));
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { count++; cursor.continue(); } else resolve(count);
    };
    req.onerror = e => reject(e.target.error);
  });
}

// ── 节点 ─────────────────────────────────────────────────
async function dbUpdateNodes(nodesHit, articleId) {
  if (!nodesHit?.length) return;
  const db = await dbOpen();
  await new Promise((resolve, reject) => {
    const t     = db.transaction('nodes', 'readwrite');
    const store = t.objectStore('nodes');
    t.onerror   = e => reject(e.target.error);
    let pending = nodesHit.length;
    const done  = () => { if (--pending === 0) resolve(); };
    for (const node of nodesHit) {
      const key = node.name.trim().toLowerCase();
      store.get(key).onsuccess = e => {
        const entry = e.target.result || { id: key, name: node.name, type: node.type, articles: [] };
        if (!entry.articles.includes(articleId)) entry.articles.push(articleId);
        store.put(entry).onsuccess = done;
      };
    }
  });
}

async function dbReplaceArticleNodes(nodesHit, articleId) {
  const db = await dbOpen();
  await new Promise((resolve, reject) => {
    const t     = db.transaction('nodes', 'readwrite');
    const store = t.objectStore('nodes');
    t.oncomplete = () => resolve();
    t.onerror    = e => reject(e.target.error);

    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) return;
      const entry = cursor.value;
      const idx = entry.articles.indexOf(articleId);
      if (idx !== -1) {
        entry.articles.splice(idx, 1);
        if (entry.articles.length === 0) cursor.delete();
        else cursor.update(entry);
      }
      cursor.continue();
    };
  });
  await dbUpdateNodes(nodesHit || [], articleId);
}

async function dbGetAllNodes() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('nodes', 'readonly').objectStore('nodes').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbDeleteArticle(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['articles', 'nodes', 'clips'], 'readwrite');
    t.onerror    = e => reject(e.target.error);
    t.oncomplete = () => resolve();

    t.objectStore('articles').delete(id);
    const clipIndex = t.objectStore('clips').index('by_article');
    clipIndex.openCursor(IDBKeyRange.only(id)).onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };

    // 清理 nodes 表里对该 articleId 的引用，引用清空的节点直接删
    t.objectStore('nodes').openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) return;
      const entry = cursor.value;
      const idx = entry.articles.indexOf(id);
      if (idx !== -1) {
        entry.articles.splice(idx, 1);
        if (entry.articles.length === 0) cursor.delete();
        else cursor.update(entry);
      }
      cursor.continue();
    };
  });
}

async function dbClearAll() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['articles', 'nodes', 'clips'], 'readwrite');
    t.objectStore('articles').clear();
    t.objectStore('nodes').clear();
    t.objectStore('clips').clear();
    t.oncomplete = () => resolve();
    t.onerror    = e => reject(e.target.error);
  });
}

function normalizeClip(clip = {}) {
  const content = String(clip.content || '').trim();
  if (!content) return null;
  return {
    id: clip.id || ('clip_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    type: clip.type === '立意' ? '立意' : '素材',
    content,
    why_reusable: String(clip.why_reusable || ''),
    source_article_id: String(clip.source_article_id || ''),
    source_article_title: String(clip.source_article_title || ''),
    project_id: clip.project_id || 'default',
    savedAt: clip.savedAt || new Date().toISOString(),
  };
}

async function dbSaveClip(clip) {
  const normalized = normalizeClip(clip);
  if (!normalized) return null;
  const db = await dbOpen();
  await new Promise((resolve, reject) => {
    const req = db.transaction('clips', 'readwrite').objectStore('clips').put(normalized);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
  return normalized;
}

async function dbGetClips(filter = {}) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const results = [];
    const store = db.transaction('clips', 'readonly').objectStore('clips');
    const req = filter.type
      ? store.index('by_type').openCursor(IDBKeyRange.only(filter.type))
      : store.openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) {
        results.sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
        resolve(results);
        return;
      }
      const clip = cursor.value;
      const projectOk = !filter.project || (clip.project_id || 'default') === filter.project;
      const articleOk = !filter.source_article_id || clip.source_article_id === filter.source_article_id;
      if (projectOk && articleOk) results.push(clip);
      cursor.continue();
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function dbDeleteClip(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('clips', 'readwrite').objectStore('clips').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbDeleteClipsBySource(articleId) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const t = db.transaction('clips', 'readwrite');
    t.oncomplete = () => resolve();
    t.onerror    = e => reject(e.target.error);
    t.objectStore('clips').index('by_article').openCursor(IDBKeyRange.only(articleId)).onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
  });
}

async function dbReplaceClipsBySource(articleId, clips = []) {
  const normalized = (clips || []).map(normalizeClip).filter(Boolean);
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const t = db.transaction('clips', 'readwrite');
    const store = t.objectStore('clips');
    t.oncomplete = () => resolve();
    t.onerror    = e => reject(e.target.error);
    store.index('by_article').openCursor(IDBKeyRange.only(articleId)).onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }
      for (const clip of normalized) store.put({ ...clip, source_article_id: articleId });
    };
  });
}

async function dbExportAll() {
  const [articles, nodes, clips, projects, assetViews] = await Promise.all([
    dbGetAllArticles(),
    dbGetAllNodes(),
    dbGetClips().catch(() => []),
    dbGetProjects().catch(() => null),
    dbGetConfig('asset_views').catch(() => null),
  ]);
  const config = normalizeBackupConfig({ projects, asset_views: assetViews });
  return { export_format: 3, exported_at: new Date().toISOString(), articles, nodes, clips, config };
}

async function dbImportAll(data) {
  if (!Array.isArray(data?.articles)) throw new Error('备份文件格式不正确');
  const idMap = {};
  for (const rec of data.articles) {
    const originalId = rec.id;
    await dbSaveArticle(rec);
    if (originalId) idMap[originalId] = rec.id;
    await dbReplaceArticleNodes(rec.analysis?.nodes_hit || [], rec.id);
  }
  if (data.nodes?.length) {
    const db = await dbOpen();
    await new Promise((resolve, reject) => {
      const t     = db.transaction('nodes', 'readwrite');
      const store = t.objectStore('nodes');
      t.oncomplete = () => resolve();
      t.onerror    = e => reject(e.target.error);
      for (const n of data.nodes) {
        const incomingArticles = (n.articles || []).map(id => idMap[id] || id);
        store.get(n.id).onsuccess = e => {
          const existing = e.target.result;
          if (existing) {
            // 合并 articles 数组，去重
            const merged = [...new Set([...(existing.articles || []), ...incomingArticles])];
            store.put({ ...n, articles: merged });
          } else {
            store.put({ ...n, articles: [...new Set(incomingArticles)] });
          }
        };
      }
    });
  }
  const config = normalizeBackupConfig(data.config || {});
  for (const [key, value] of Object.entries(config)) {
    await dbSetConfig(key, value);
  }
  if (Array.isArray(data.clips)) {
    for (const clip of data.clips) {
      const sourceId = clip.source_article_id ? (idMap[clip.source_article_id] || clip.source_article_id) : '';
      await dbSaveClip({ ...clip, source_article_id: sourceId });
    }
  }
}

function normalizeBackupConfig(config = {}) {
  const result = {};
  if (Array.isArray(config.projects)) {
    const projects = config.projects
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map(p => ({
        id: String(p.id),
        name: String(p.name),
        createdAt: p.createdAt || '',
      }));
    if (projects.length) result.projects = projects;
  }
  if (Array.isArray(config.asset_views)) {
    const views = config.asset_views
      .filter(v => v && typeof v.id === 'string' && typeof v.name === 'string' && v.filters && typeof v.filters === 'object')
      .map(v => ({
        id: String(v.id),
        name: String(v.name),
        filters: {
          year:   String(v.filters.year || ''),
          domain: String(v.filters.domain || ''),
          node:   String(v.filters.node || ''),
          type:   String(v.filters.type || ''),
        },
        createdAt: v.createdAt || '',
      }));
    if (views.length) result.asset_views = views;
  }
  return result;
}

// ── 项目管理 ─────────────────────────────────────────────
async function dbGetProjects() {
  const saved = await dbGetConfig('projects');
  if (saved) return saved;
  const defaults = [{ id: 'default', name: '默认项目', createdAt: new Date().toISOString() }];
  await dbSetConfig('projects', defaults);
  return defaults;
}

async function dbSaveProject(project) {
  const list = await dbGetProjects();
  const idx  = list.findIndex(p => p.id === project.id);
  if (idx >= 0) list[idx] = project; else list.push(project);
  await dbSetConfig('projects', list);
}

async function dbDeleteProject(id) {
  if (id === 'default') throw new Error('不能删除默认项目');
  const articles = await dbGetAllArticles({ project: id });
  for (const rec of articles) await dbDeleteArticle(rec.id);
  const list = await dbGetProjects();
  await dbSetConfig('projects', list.filter(p => p.id !== id));
}

// ── 配置（本地文件夹句柄等）────────────────────────────────
async function dbGetConfig(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('config', 'readonly').objectStore('config').get(key);
    req.onsuccess = e => resolve(e.target.result?.value ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbSetConfig(key, value) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('config', 'readwrite').objectStore('config').put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbDeleteConfig(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('config', 'readwrite').objectStore('config').delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── 本地文件夹写出 ───────────────────────────────────────
function buildArticleMarkdown(record) {
  const a     = record.analysis || {};
  const lines = [];

  lines.push(`# ${record.article?.title || '（无标题）'}`);
  lines.push('');
  const meta = [record.article?.author, (record.savedAt || '').slice(0, 10)].filter(Boolean).join(' · ');
  if (meta) lines.push(`**${meta}**`);
  if (record.url) lines.push(`原文：${record.url}`);
  lines.push('');

  if (record.article?.type === 'idea') {
    lines.push('## 速记');
    lines.push(record.article?.body || '');
    lines.push('');
    return lines.join('\n');
  }

  if (a.domain)      lines.push(`**领域**：${a.domain}${a.sub_domain ? ' · ' + a.sub_domain : ''}`);
  if (a.perspective) lines.push(`**视角**：${a.perspective}`);
  if (a.core_claim)  lines.push(`**核心判断**：${a.core_claim}`);
  if (a.map_position) lines.push(`**地图位置**：${a.map_position}`);
  lines.push('');

  if (a.tags?.length) {
    lines.push(`**标签**：${a.tags.join(' · ')}`);
    lines.push('');
  }

  if (a.wikilinks?.length) {
    lines.push('## Wikilinks');
    for (const name of a.wikilinks) lines.push(`- [[${name}]]`);
    lines.push('');
  }

  if (a.strengths?.length) {
    lines.push('## 文章优势');
    for (const s of a.strengths) lines.push(`- **${s.dimension}**：${s.evidence}`);
    lines.push('');
  }

  if (a.nodes_hit?.length) {
    lines.push('## 知识节点');
    for (const n of a.nodes_hit) lines.push(`- [${n.role}] **${n.name}**（${n.type}）— ${n.contribution}`);
    lines.push('');
  }

  if (a.new_concepts?.length) {
    lines.push('## 新引入概念');
    lines.push(a.new_concepts.join(' · '));
    lines.push('');
  }

  if (a.next_suggestions?.length) {
    lines.push('## 下一步选题');
    for (const s of a.next_suggestions) {
      lines.push(`### [${s.type}] ${s.suggestion}`);
      lines.push(s.reason);
      if (s.theory_ref) lines.push(`> 参考：${s.theory_ref}`);
      lines.push('');
    }
  }

  if (a.connections?.length) {
    lines.push('## 相邻领域');
    lines.push(a.connections.join(' · '));
    lines.push('');
  }

  if (a.insight) {
    lines.push('## 编辑评语');
    lines.push(a.insight);
    lines.push('');
  }

  return lines.join('\n');
}

function buildLocalMarkdownFilename(record) {
  const date      = (record.savedAt || '').slice(0, 10);
  const rawTitle  = record.article?.title || 'untitled';
  const safeTitle = rawTitle.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 50);
  const shortId   = (record.id || '').slice(-6);
  return `${date}_${safeTitle}_${shortId}.md`;
}

function extractWikilinks(text) {
  const seen = new Set();
  const links = [];
  const re = /\[\[([^\]\r\n]+?)\]\]/g;
  let m;
  while ((m = re.exec(text || ''))) {
    let name = String(m[1] || '').split('|')[0].split('#')[0].trim();
    name = name.replace(/[\[\]]/g, '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    links.push(name);
  }
  return links;
}

function yamlQuote(value) {
  return JSON.stringify(String(value ?? ''));
}

function yamlArrayField(key, values) {
  const items = (values || []).map(v => String(v || '').trim()).filter(Boolean);
  if (!items.length) return `${key}: []`;
  return `${key}:\n${items.map(v => `  - ${yamlQuote(v)}`).join('\n')}`;
}

function obsidianLink(name) {
  const clean = String(name || '').replace(/[\[\]\r\n]/g, '').trim();
  return clean ? `[[${clean}]]` : '';
}

function buildVaultFilename(record) {
  const date      = (record.savedAt || '').slice(0, 10) || 'unknown-date';
  const rawTitle  = record.article?.title || 'untitled';
  const safeTitle = rawTitle.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 50);
  const shortId   = (record.id || '').slice(-6) || Math.random().toString(36).slice(2, 8);
  return `${date}_${safeTitle}_${shortId}.md`;
}

function buildObsidianMarkdown(record, projectName = '') {
  const a         = record.analysis || {};
  const title     = record.article?.title || '（无标题）';
  const nodeNames = (a.nodes_hit || []).map(n => n.name).filter(Boolean);
  const lines     = [];

  lines.push('---');
  lines.push(`title: ${yamlQuote(title)}`);
  lines.push(`created: ${yamlQuote(record.savedAt || '')}`);
  lines.push(`source: ${yamlQuote(record.url || record.article?.url || '')}`);
  lines.push(`author: ${yamlQuote(record.article?.author || '')}`);
  lines.push(`type: ${yamlQuote(record.article?.type || '')}`);
  lines.push(`project: ${yamlQuote(projectName || record.project_id || 'default')}`);
  lines.push(`domain: ${yamlQuote(a.domain || '')}`);
  lines.push(`sub_domain: ${yamlQuote(a.sub_domain || '')}`);
  lines.push(`perspective: ${yamlQuote(a.perspective || '')}`);
  lines.push(yamlArrayField('tags', a.tags || []));
  lines.push(yamlArrayField('nodes', nodeNames));
  lines.push(yamlArrayField('wikilinks', a.wikilinks || []));
  lines.push('---');
  lines.push('');

  lines.push(`# ${title}`);
  lines.push('');
  const meta = [record.article?.author, (record.savedAt || '').slice(0, 10)].filter(Boolean).join(' · ');
  if (meta) lines.push(`**${meta}**`);
  const url = record.url || record.article?.url || '';
  if (url) lines.push(`原文：${url}`);
  lines.push('');

  if (record.article?.type === 'idea') {
    lines.push('## 速记');
    lines.push(record.article?.body || '');
    lines.push('');
    return lines.join('\n');
  }

  if (a.domain)       lines.push(`**领域**：${a.domain}${a.sub_domain ? ' · ' + a.sub_domain : ''}`);
  if (a.perspective)  lines.push(`**视角**：${a.perspective}`);
  if (a.core_claim)   lines.push(`**核心判断**：${a.core_claim}`);
  if (a.map_position) lines.push(`**地图位置**：${a.map_position}`);
  lines.push('');

  if (a.tags?.length) {
    lines.push(`**标签**：${a.tags.join(' · ')}`);
    lines.push('');
  }

  if (a.wikilinks?.length) {
    lines.push('## Wikilinks');
    for (const name of a.wikilinks) lines.push(`- ${obsidianLink(name)}`);
    lines.push('');
  }

  if (a.strengths?.length) {
    lines.push('## 文章优势');
    for (const s of a.strengths) lines.push(`- **${s.dimension}**：${s.evidence}`);
    lines.push('');
  }

  if (a.nodes_hit?.length) {
    lines.push('## 知识节点');
    for (const n of a.nodes_hit) {
      const linkedName = obsidianLink(n.name) || n.name;
      lines.push(`- [${n.role}] ${linkedName}（${n.type}）— ${n.contribution}`);
    }
    lines.push('');
  }

  if (a.new_concepts?.length) {
    lines.push('## 新引入概念');
    lines.push(a.new_concepts.join(' · '));
    lines.push('');
  }

  if (a.next_suggestions?.length) {
    lines.push('## 下一步选题');
    for (const s of a.next_suggestions) {
      lines.push(`### [${s.type}] ${s.suggestion}`);
      lines.push(s.reason);
      if (s.theory_ref) lines.push(`> 参考：${s.theory_ref}`);
      lines.push('');
    }
  }

  if (a.connections?.length) {
    lines.push('## 相邻领域');
    lines.push(a.connections.join(' · '));
    lines.push('');
  }

  if (a.insight) {
    lines.push('## 编辑评语');
    lines.push(a.insight);
    lines.push('');
  }

  return lines.join('\n');
}

async function dbExportObsidianVault(handle, filter = {}) {
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted') {
    const requested = await handle.requestPermission({ mode: 'readwrite' });
    if (requested !== 'granted') throw new Error('未获得文件夹写入权限');
  }

  const [articles, projects] = await Promise.all([
    dbGetAllArticles(filter),
    dbGetProjects(),
  ]);
  const projectNameById = {};
  for (const p of projects) projectNameById[p.id] = p.name;

  let exported = 0;
  const indexLines = [
    '# 知识图鉴索引',
    '',
    `导出时间：${new Date().toISOString()}`,
    '',
  ];

  for (const rec of articles) {
    const projectName = projectNameById[rec.project_id || 'default'] || rec.project_id || '默认项目';
    const filename    = buildVaultFilename(rec);
    const fileHandle  = await handle.getFileHandle(filename, { create: true });
    const writable    = await fileHandle.createWritable();
    await writable.write(buildObsidianMarkdown(rec, projectName));
    await writable.close();
    indexLines.push(`- [[${filename.replace(/\.md$/, '')}]] · ${projectName}`);
    exported++;
  }

  const indexHandle = await handle.getFileHandle('知识图鉴索引.md', { create: true });
  const writable    = await indexHandle.createWritable();
  await writable.write(indexLines.join('\n'));
  await writable.close();

  return { exported };
}

async function writeArticleToLocalFolder(record) {
  let handle;
  try { handle = await dbGetConfig('local_folder'); } catch { return; }
  if (!handle) return;

  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return; // 无用户手势时无法重新申请

    const shortId   = (record.id || '').slice(-6);
    const filename  = buildLocalMarkdownFilename(record);

    if (shortId) {
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && name !== filename && name.endsWith(`_${shortId}.md`)) {
          await handle.removeEntry(name).catch(() => {});
        }
      }
    }

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(buildArticleMarkdown(record));
    await writable.close();
  } catch (e) {
    console.warn('[知识图鉴] 写入本地文件夹失败:', e.message);
  }
}

// ── 本地文件夹双向同步 ──────────────────────────────────────
function parseMarkdownRecord(text, filename) {
  const lines = text.split('\n');
  const warnings = [];

  const title = (lines[0] || '').replace(/^#+\s*/, '').trim();
  const urlLine = lines.find(l => l.startsWith('原文：'));
  const url = urlLine ? urlLine.slice(3).trim() : '';

  const getField = label => {
    const prefix = `**${label}**：`;
    const l = lines.find(ln => ln.startsWith(prefix));
    return l ? l.slice(prefix.length).trim() : null;
  };

  const domainFull  = getField('领域');
  const perspective  = getField('视角');
  const core_claim   = getField('核心判断');
  const map_position = getField('地图位置');
  const analysis = {};
  const article = {};

  const getSection = name => {
    const start = lines.findIndex(l => l.trim() === `## ${name}`);
    if (start < 0) return null;
    const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
    return lines.slice(start + 1, end > 0 ? end : lines.length);
  };

  const getTailSection = name => {
    const start = lines.findIndex(l => l.trim() === `## ${name}`);
    return start < 0 ? null : lines.slice(start + 1);
  };

  const setParsedArray = (key, sectionLines, parsed, hasInvalidLine = false) => {
    if (!sectionLines || hasInvalidLine) return;
    if (parsed.length) analysis[key] = parsed;
    else if (!sectionLines.some(l => l.trim())) analysis[key] = [];
  };

  if (domainFull) {
    const domainParts = domainFull.split('·');
    analysis.domain     = domainParts[0].trim();
    analysis.sub_domain = domainParts.length > 1 ? domainParts.slice(1).join('·').trim() : '';
  }
  if (perspective) analysis.perspective = perspective;
  if (core_claim) analysis.core_claim = core_claim;
  if (map_position) analysis.map_position = map_position;

  const strengthLines = getSection('文章优势');
  let hasInvalidStrength = false;
  const strengths = (strengthLines || []).map(l => {
    if (!l.trim()) return null;
    const m = l.match(/^-\s+\*\*(.+?)\*\*：(.+)$/);
    if (!m) {
      hasInvalidStrength = true;
      warnings.push('文章优势包含无法解析的行，已保留原数据');
      return null;
    }
    return { dimension: m[1], evidence: m[2] };
  }).filter(Boolean);
  setParsedArray('strengths', strengthLines, strengths, hasInvalidStrength);

  const nodeLines = getSection('知识节点');
  let hasInvalidNode = false;
  const nodes_hit = (nodeLines || []).map(l => {
    if (!l.trim()) return null;
    const m = l.match(/^-\s+\[(.+?)\]\s+\*\*(.+?)\*\*（(.+?)）—\s+(.+)$/);
    if (!m) {
      hasInvalidNode = true;
      warnings.push('知识节点包含无法解析的行，已保留原数据');
      return null;
    }
    return { role: m[1], name: m[2], type: m[3], contribution: m[4] };
  }).filter(Boolean);
  setParsedArray('nodes_hit', nodeLines, nodes_hit, hasInvalidNode);

  const conceptLines = getSection('新引入概念');
  const new_concepts = (conceptLines || [])
    .filter(l => l.trim())
    .flatMap(l => l.split('·').map(s => s.trim())).filter(Boolean);
  setParsedArray('new_concepts', conceptLines, new_concepts);

  const connectionLines = getSection('相邻领域');
  const connections = (connectionLines || [])
    .filter(l => l.trim())
    .flatMap(l => l.split('·').map(s => s.trim())).filter(Boolean);
  setParsedArray('connections', connectionLines, connections);

  const tagsRaw = getField('标签');
  if (tagsRaw !== null) {
    analysis.tags = tagsRaw ? tagsRaw.split('·').map(s => s.trim()).filter(Boolean) : [];
  }

  const insightLines = getSection('编辑评语');
  if (insightLines) {
    const insight = insightLines.filter(l => l.trim()).join('\n').trim();
    if (insight || !insightLines.some(l => l.trim())) analysis.insight = insight;
  }

  const suggestionLines = getSection('下一步选题');
  const next_suggestions = [];
  let cur = null;
  let hasInvalidSuggestion = false;
  for (const l of suggestionLines || []) {
    const m = l.match(/^###\s+\[(.+?)\]\s+(.+)$/);
    if (m) {
      if (cur) next_suggestions.push(cur);
      cur = { type: m[1], suggestion: m[2], reason: '', theory_ref: '' };
    } else if (cur) {
      const ref = l.match(/^>\s*参考：(.+)$/);
      if (ref) cur.theory_ref = ref[1].trim();
      else if (l.trim()) cur.reason = cur.reason ? cur.reason + '\n' + l.trim() : l.trim();
    } else if (l.trim()) {
      hasInvalidSuggestion = true;
      warnings.push('下一步选题包含无法解析的行，已保留原数据');
    }
  }
  if (cur) next_suggestions.push(cur);
  setParsedArray('next_suggestions', suggestionLines, next_suggestions, hasInvalidSuggestion);

  const ideaLines = getTailSection('速记');
  if (ideaLines) {
    article.type = 'idea';
    article.body = ideaLines.join('\n').trim();
    if (title) article.title = title;
  }

  analysis.wikilinks = extractWikilinks(text);

  const base = filename.replace(/\.md$/, '');
  const parts = base.split('_');
  const shortIdCandidate = parts.length >= 2 ? parts[parts.length - 1] : '';
  const shortId = /^[a-z0-9]{6,}$/i.test(shortIdCandidate) ? shortIdCandidate.slice(-6) : '';
  if (shortIdCandidate && !shortId) warnings.push('文件名 shortId 少于 6 位或包含非字母数字，已忽略');

  return { shortId, url, title, article, analysis, warnings: [...new Set(warnings)] };
}

function mergeParsedMarkdownRecord(existing, parsed) {
  const stable = value => {
    if (Array.isArray(value) && value.length === 0) return null;
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
    }
    return value ?? null;
  };
  const changed = (a, b) => JSON.stringify(stable(a)) !== JSON.stringify(stable(b));
  const rawAnalysisPatch = parsed.analysis || {};
  const analysisPatch = {};
  const articlePatch = {};

  for (const [key, value] of Object.entries(rawAnalysisPatch)) {
    if (changed(value, existing.analysis?.[key])) analysisPatch[key] = value;
  }

  if (parsed.title && parsed.title !== existing.article?.title) articlePatch.title = parsed.title;
  if (existing.article?.type === 'idea' && parsed.article?.type === 'idea') {
    for (const [key, value] of Object.entries(parsed.article)) {
      if (changed(value, existing.article?.[key])) articlePatch[key] = value;
    }
  }

  const hasAnalysisPatch = Object.keys(analysisPatch).length > 0;
  const hasArticlePatch  = Object.keys(articlePatch).length > 0;
  const shouldReplaceNodes = Object.prototype.hasOwnProperty.call(analysisPatch, 'nodes_hit');

  return {
    record: {
      ...existing,
      article: hasArticlePatch ? { ...existing.article, ...articlePatch } : existing.article,
      analysis: { ...existing.analysis, ...analysisPatch },
    },
    hasAnalysisPatch,
    hasArticlePatch,
    hasPatch: hasAnalysisPatch || hasArticlePatch,
    shouldReplaceNodes,
    warnings: parsed.warnings || [],
  };
}

async function syncFromLocalFolder() {
  let handle;
  try { handle = await dbGetConfig('local_folder'); } catch { return { synced: 0, error: '未绑定本地文件夹' }; }
  if (!handle) return { synced: 0, error: '未绑定本地文件夹' };

  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted') return { synced: 0, error: '文件夹权限已失效，请在设置页重新授权' };

  const allArticles = await dbGetAllArticles();
  const byUrl     = {};
  const byShortId = {};
  for (const rec of allArticles) {
    if (rec.url) {
      if (!byUrl[rec.url]) byUrl[rec.url] = [];
      byUrl[rec.url].push(rec);
    }
    if (rec.id) {
      const short = rec.id.slice(-6);
      if (!byShortId[short]) byShortId[short] = [];
      byShortId[short].push(rec);
    }
  }

  let synced = 0;
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file' || !name.endsWith('.md')) continue;
    try {
      const file   = await entry.getFile();
      const text   = await file.text();
      const parsed = parseMarkdownRecord(text, name);

      const existing = (parsed.shortId && findUniqueShortIdRecord(byShortId[parsed.shortId], parsed.shortId)) ||
        (parsed.url && findUniqueUrlRecord(byUrl[parsed.url], parsed.url));
      if (!existing) continue;

      const merged = mergeParsedMarkdownRecord(existing, parsed);
      if (!merged.hasPatch) continue;

      await dbPutArticle(merged.record);
      if (merged.shouldReplaceNodes) await dbReplaceArticleNodes(merged.record.analysis.nodes_hit || [], merged.record.id);
      synced++;
    } catch (e) {
      console.warn('[知识图鉴] 扫描文件失败:', name, e.message);
    }
  }
  return { synced };
}

// ── 迁移：chrome.storage.local → IndexedDB（只跑一次）─────
async function dbMigrateFromStorage() {
  const { zhijing_articles, zhijing_nodes, zhijing_migrated } =
    await chrome.storage.local.get(['zhijing_articles', 'zhijing_nodes', 'zhijing_migrated']);
  if (zhijing_migrated || !zhijing_articles?.length) return;

  for (const rec of zhijing_articles) {
    rec.url = rec.article?.url || '';
    await dbSaveArticle(rec);
  }
  if (zhijing_nodes) {
    const db = await dbOpen();
    await new Promise((resolve, reject) => {
      const t     = db.transaction('nodes', 'readwrite');
      const store = t.objectStore('nodes');
      const entries = Object.values(zhijing_nodes);
      if (!entries.length) { resolve(); return; }
      let pending = entries.length;
      const done  = () => { if (--pending === 0) resolve(); };
      for (const n of entries) {
        store.put({ id: n.name.trim().toLowerCase(), name: n.name, type: n.type, articles: n.articles || [] })
          .onsuccess = done;
      }
      t.onerror = e => reject(e.target.error);
    });
  }

  await chrome.storage.local.set({ zhijing_migrated: true });
  await chrome.storage.local.remove(['zhijing_articles', 'zhijing_nodes']);
  debugLog('[知识图鉴] storage → IndexedDB 迁移完成');
}
