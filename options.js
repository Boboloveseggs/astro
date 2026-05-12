'use strict';

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

async function setStoredApiKeys(apiKeys) {
  await chrome.storage.local.set({ apiKeys });
  await chrome.storage.sync.remove('apiKeys');
}

const DEFAULT_WEEK_GOAL = 3;
const UI_THEME_KEY = 'uiTheme';
const ZHIHU_CONTENT_ACCESS_SECRET_KEY = 'zhihuAccessSecret';
const ONBOARDING_OPTIONS_PENDING_KEY = 'onboardingOptionsPending';
let optionsOnboardingState = { active: false, index: 0, wired: false };

function normalizeWeekGoal(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_WEEK_GOAL;
  return Math.min(99, Math.max(1, n));
}

function applyUiTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.classList.toggle('theme-light', normalized === 'light');
  document.documentElement.dataset.theme = normalized;
  return normalized;
}

async function loadUiTheme() {
  const { [UI_THEME_KEY]: theme = 'dark' } = await chrome.storage.local.get(UI_THEME_KEY);
  applyUiTheme(theme);
}

function optionsOnboardingSteps() {
  return [
    {
      title: '这里是公开版设置页',
      body: 'GitHub 公开版不内置 API Key。请先填写自己的 API Key，之后就可以分析、归库和点亮知识宇宙。\n\n比赛演示包才会内置一次性默认通道；源码公开版为了安全已经移除。',
      primary: '下一步',
    },
    {
      title: '可以更换 AI 提供商',
      body: '这里可以选择 AI 提供商。公开版需要你填写对应提供商的 API Key。\n\n如果你以后想换成 DeepSeek、Kimi、智谱或自己的其他模型，再从这里改。',
      target: '#provider',
      primary: '下一步',
    },
    {
      title: 'API Key 是公开版必填项',
      body: '这个输入框用于填写你自己的 API Key。密钥只保存在本机 chrome.storage.local。\n\n如果你只是评审，请使用比赛下载包；公开源码版不会携带任何默认 Key。',
      target: '#apiKey',
      primary: '知道了',
    },
    {
      title: '知乎开放平台增强也是可选',
      body: 'Access Secret 用来读取知乎搜索语境，生成“知乎环境建议”。\n\n不填写也不影响核心流程：文章分析、作品归库、资产卡和知识宇宙都能正常使用。',
      target: '#zhihuAccessSecret',
      primary: '下一步',
    },
    {
      title: '改过设置再保存',
      body: '如果你更换了提供商、模型或填写了自己的 Key，就点“保存设置”。\n\n公开源码版没有默认分析通道，保存后再回到知识图鉴面板开始分析。',
      target: '#saveBtn',
      primary: '我知道了',
    },
    {
      title: '回到面板，直接分析',
      body: '现在回到知识图鉴面板。公开版配置好自己的 API Key 后即可使用。\n\n核心用法就是：载入一篇文章，点击开始分析，等它归库。',
      primary: '回到面板继续',
      action: 'finish',
    },
  ];
}

function setupOptionsOnboardingEvents() {
  if (optionsOnboardingState.wired) return;
  optionsOnboardingState.wired = true;
  document.getElementById('optionsOnboardingNextBtn')?.addEventListener('click', nextOptionsOnboarding);
  document.getElementById('optionsOnboardingBackBtn')?.addEventListener('click', backOptionsOnboarding);
  document.getElementById('optionsOnboardingSkipBtn')?.addEventListener('click', finishOptionsOnboarding);
  document.getElementById('optionsOnboardingExtraBtn')?.addEventListener('click', handleOptionsOnboardingExtra);
  window.addEventListener('resize', positionOptionsOnboardingArrow);
  window.addEventListener('scroll', positionOptionsOnboardingArrow, true);
}

async function maybeStartOptionsOnboarding() {
  setupOptionsOnboardingEvents();
  const { [ONBOARDING_OPTIONS_PENDING_KEY]: pending } = await chrome.storage.local.get(ONBOARDING_OPTIONS_PENDING_KEY);
  if (pending) startOptionsOnboarding(0);
}

function startOptionsOnboarding(index = 0) {
  optionsOnboardingState.active = true;
  optionsOnboardingState.index = index;
  renderOptionsOnboarding();
}

function replayOptionsOnboarding() {
  setupOptionsOnboardingEvents();
  startOptionsOnboarding(0);
}

function clearOptionsOnboardingHighlight() {
  document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
  document.getElementById('optionsOnboardingArrow')?.classList.remove('visible');
}

function renderOptionsOnboarding() {
  const steps = optionsOnboardingSteps();
  const step = steps[optionsOnboardingState.index];
  const layer = document.getElementById('optionsOnboardingLayer');
  if (!layer || !step) return;

  clearOptionsOnboardingHighlight();
  layer.classList.add('visible');
  document.getElementById('optionsOnboardingMeta').textContent = `可选设置说明 · 第 ${optionsOnboardingState.index + 1} 步 / 共 ${steps.length} 步`;
  document.getElementById('optionsOnboardingTitle').textContent = step.title;
  document.getElementById('optionsOnboardingBody').textContent = step.body;
  document.getElementById('optionsOnboardingBackBtn').style.display = optionsOnboardingState.index ? '' : 'none';
  document.getElementById('optionsOnboardingNextBtn').textContent = step.primary || '下一步';
  const extraBtn = document.getElementById('optionsOnboardingExtraBtn');
  if (extraBtn) {
    extraBtn.textContent = step.extra || '';
    extraBtn.style.display = step.extra ? '' : 'none';
  }

  if (step.target) {
    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add('onboarding-highlight');
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      setTimeout(positionOptionsOnboardingArrow, 180);
    }
  }
}

function positionOptionsOnboardingArrow() {
  if (!optionsOnboardingState.active) return;
  const step = optionsOnboardingSteps()[optionsOnboardingState.index];
  const arrow = document.getElementById('optionsOnboardingArrow');
  const target = step?.target ? document.querySelector(step.target) : null;
  if (!arrow || !target) {
    arrow?.classList.remove('visible');
    return;
  }
  const rect = target.getBoundingClientRect();
  arrow.style.left = `${Math.min(window.innerWidth - 42, Math.max(8, rect.left + rect.width / 2 - 12))}px`;
  arrow.style.top = `${Math.min(window.innerHeight - 42, Math.max(8, rect.bottom + 8))}px`;
  arrow.classList.add('visible');
}

async function nextOptionsOnboarding() {
  const steps = optionsOnboardingSteps();
  const step = steps[optionsOnboardingState.index];
  if (step?.action === 'finish' || optionsOnboardingState.index >= steps.length - 1) {
    await finishOptionsOnboarding();
    return;
  }
  optionsOnboardingState.index++;
  renderOptionsOnboarding();
}

function handleOptionsOnboardingExtra() {
  const step = optionsOnboardingSteps()[optionsOnboardingState.index];
  if (step?.extraAction === 'openOfficial' && step.officialUrl) {
    window.open(step.officialUrl, '_blank', 'noopener');
  }
}

function backOptionsOnboarding() {
  if (!optionsOnboardingState.index) return;
  optionsOnboardingState.index--;
  renderOptionsOnboarding();
}

async function finishOptionsOnboarding() {
  optionsOnboardingState.active = false;
  document.getElementById('optionsOnboardingLayer')?.classList.remove('visible');
  clearOptionsOnboardingHighlight();
  await chrome.storage.local.set({ [ONBOARDING_OPTIONS_PENDING_KEY]: false });
}

// ── 初始化 UI ────────────────────────────────────────────
function buildProviderSelect() {
  const sel = document.getElementById('provider');
  Object.entries(PROVIDERS).forEach(([id, p]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function updateModelSelect(providerId) {
  const models = PROVIDERS[providerId]?.models || [];
  const sel    = document.getElementById('model');
  sel.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    sel.appendChild(opt);
  });
}

function updateKeyHint(providerId) {
  const competition = getCompetitionDefaultConfig();
  const suffix = competition?.provider === providerId
    ? '。GitHub 公开版不会携带默认 Key，请填写自己的 Key。'
    : '';
  document.getElementById('keyHint').textContent = (PROVIDERS[providerId]?.keyHint || '') + suffix;
  document.getElementById('apiKey').placeholder   = PROVIDERS[providerId]?.keyHint || '';
}

// ── 读取已保存设置 ────────────────────────────────────────
async function loadSettings() {
  const [settings, apiKeys, { weekGoal, [ZHIHU_CONTENT_ACCESS_SECRET_KEY]: zhihuAccessSecret = '' }] = await Promise.all([
    chrome.storage.sync.get(['provider', 'model']),
    getStoredApiKeys(),
    chrome.storage.local.get(['weekGoal', ZHIHU_CONTENT_ACCESS_SECRET_KEY]),
  ]);
  const { provider, model } = resolveProviderModel(settings);

  document.getElementById('provider').value = provider;
  updateModelSelect(provider);
  updateKeyHint(provider);

  if (apiKeys[provider]) document.getElementById('apiKey').value = apiKeys[provider];
  document.getElementById('zhihuAccessSecret').value = zhihuAccessSecret || '';
  if (model) document.getElementById('model').value = model;
  document.getElementById('weekGoal').value = normalizeWeekGoal(weekGoal);

  renderSavedKeys(apiKeys);
}

// ── 保存设置 ─────────────────────────────────────────────
async function saveSettings() {
  const provider = document.getElementById('provider').value;
  const model    = document.getElementById('model').value;
  const apiKey   = document.getElementById('apiKey').value.trim();
  const zhihuAccessSecret = document.getElementById('zhihuAccessSecret').value.trim();
  const weekGoal = normalizeWeekGoal(document.getElementById('weekGoal').value);

  const apiKeys = await getStoredApiKeys();
  if (apiKey) apiKeys[provider] = apiKey;

  const localPayload = { weekGoal };
  if (zhihuAccessSecret) localPayload[ZHIHU_CONTENT_ACCESS_SECRET_KEY] = zhihuAccessSecret;

  await Promise.all([
    chrome.storage.sync.set({ provider, model }),
    chrome.storage.local.set(localPayload),
    zhihuAccessSecret ? Promise.resolve() : chrome.storage.local.remove(ZHIHU_CONTENT_ACCESS_SECRET_KEY),
    setStoredApiKeys(apiKeys),
  ]);
  renderSavedKeys(apiKeys);
  showStatus('设置已保存 ✓', 'ok');
}

// ── 渲染已保存密钥列表 ────────────────────────────────────
function renderSavedKeys(apiKeys) {
  const entries = Object.entries(apiKeys).filter(([, v]) => v);
  const box     = document.getElementById('savedKeysBox');
  const list    = document.getElementById('savedKeysList');

  if (!entries.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  list.innerHTML = entries.map(([pid, key]) => `
    <div class="saved-key-row">
      <span class="saved-key-name">${PROVIDERS[pid]?.name || pid}</span>
      <span class="saved-key-value">${key.slice(0, 8)}…</span>
      <span class="saved-key-del" data-pid="${pid}">删除</span>
    </div>`).join('');

  list.querySelectorAll('.saved-key-del').forEach(btn =>
    btn.addEventListener('click', () => deleteKey(btn.dataset.pid))
  );
}

async function deleteKey(providerId) {
  const apiKeys = await getStoredApiKeys();
  delete apiKeys[providerId];
  await setStoredApiKeys(apiKeys);
  if (document.getElementById('provider').value === providerId) {
    document.getElementById('apiKey').value = '';
  }
  renderSavedKeys(apiKeys);
  showStatus('已删除', 'ok');
}

// ── 测试连接 ─────────────────────────────────────────────
async function testConnection() {
  const provider = document.getElementById('provider').value;
  const model    = document.getElementById('model').value;
  const storedKeys = await getStoredApiKeys();
  const apiKey   = document.getElementById('apiKey').value.trim() || getApiKeyForProvider(provider, storedKeys);
  if (!apiKey) { showStatus('当前提供商没有 API Key，请填写自己的 API Key 后再测试。', 'err'); return; }

  const btn = document.getElementById('testBtn');
  btn.textContent = '测试中…';
  btn.disabled = true;

  try {
    const content = await callLLM(apiKey, provider, model, [
      { role: 'user', content: '回复数字1' }
    ], 10);
    showStatus(`连接成功 ✓  模型回复：${content.trim().slice(0, 40)}`, 'ok');
  } catch (e) {
    showStatus(`连接失败：${e.message}`, 'err');
  } finally {
    btn.textContent = '测试连接';
    btn.disabled = false;
  }
}

// callLLM / buildToken 由 analyzer.js 提供

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── 事件绑定 ─────────────────────────────────────────────
document.getElementById('provider').addEventListener('change', async e => {
  const pid = e.target.value;
  updateModelSelect(pid);
  updateKeyHint(pid);
  const apiKeys = await getStoredApiKeys();
  document.getElementById('apiKey').value = apiKeys[pid] || '';
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const data = await dbExportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `知识图鉴_备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const viewCount = data.config?.asset_views?.length || 0;
    const projectCount = data.config?.projects?.length || 0;
    const clipCount = data.clips?.length || 0;
    showStatus(`已导出 ${data.articles.length} 篇文章、${data.nodes.length} 个节点、${clipCount} 条素材/立意、${projectCount} 个项目、${viewCount} 个视图`, 'ok');
  } catch (e) {
    showStatus(`导出失败：${e.message}`, 'err');
  }
});

document.getElementById('exportVaultBtn').addEventListener('click', async () => {
  if (!window.showDirectoryPicker) {
    showStatus('当前浏览器不支持文件夹导出，请使用新版 Chrome', 'err');
    return;
  }
  const btn = document.getElementById('exportVaultBtn');
  btn.textContent = '导出中…';
  btn.disabled = true;
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const { exported } = await dbExportObsidianVault(handle);
    showStatus(`已导出 ${exported} 篇 Markdown 到文件夹「${handle.name}」`, 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') showStatus(`Obsidian 导出失败：${e.message}`, 'err');
  } finally {
    btn.textContent = '导出 Obsidian Vault';
    btn.disabled = false;
  }
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await dbImportAll(data);
    new BroadcastChannel('zhijing_updates').postMessage({ type: 'data_changed' });
    const viewCount = data.config?.asset_views?.length || 0;
    const projectCount = data.config?.projects?.length || 0;
    const clipCount = data.clips?.length || 0;
    showStatus(`恢复成功：${data.articles?.length || 0} 篇文章、${data.nodes?.length || 0} 个节点、${clipCount} 条素材/立意、${projectCount} 个项目、${viewCount} 个视图`, 'ok');
  } catch (e) {
    showStatus(`导入失败：${e.message}`, 'err');
  } finally {
    e.target.value = '';
  }
});

document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('testBtn').addEventListener('click', testConnection);
document.getElementById('replayOptionsOnboardingBtn')?.addEventListener('click', replayOptionsOnboarding);
document.getElementById('clearAllBtn').addEventListener('click', async () => {
  if (!confirm('确定要清空全部数据吗？\n\n这将删除所有分析记录和知识图谱，此操作不可撤销。')) return;
  try {
    await dbClearAll();
    new BroadcastChannel('zhijing_updates').postMessage({ type: 'data_changed' });
    showStatus('已清空全部数据', 'ok');
  } catch (e) {
    showStatus(`清空失败：${e.message}`, 'err');
  }
});

// ── 本地文件夹 ────────────────────────────────────────────
function setFolderUI(name, permGranted) {
  const statusEl     = document.getElementById('localFolderStatus');
  const reAuthBtn    = document.getElementById('reAuthFolderBtn');
  const clearBtn     = document.getElementById('clearFolderBtn');
  if (permGranted) {
    statusEl.textContent = `已绑定：${name}`;
    statusEl.style.color = '';
    reAuthBtn.style.display = 'none';
  } else {
    statusEl.textContent = `已绑定：${name}（权限已失效，请点击「重新授权」）`;
    statusEl.style.color = '#883030';
    reAuthBtn.style.display = 'inline-block';
  }
  clearBtn.style.display = 'inline-block';
}

async function loadLocalFolder() {
  try {
    const handle = await dbGetConfig('local_folder');
    if (!handle) return;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    setFolderUI(handle.name, perm === 'granted');
  } catch { /* IndexedDB 尚未就绪时忽略 */ }
}

document.getElementById('pickFolderBtn').addEventListener('click', async () => {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await dbSetConfig('local_folder', handle);
    setFolderUI(handle.name, true);
    showStatus(`已选择文件夹：${handle.name}`, 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') showStatus(`选择失败：${e.message}`, 'err');
  }
});

document.getElementById('reAuthFolderBtn').addEventListener('click', async () => {
  try {
    const handle = await dbGetConfig('local_folder');
    if (!handle) return;
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    setFolderUI(handle.name, perm === 'granted');
    showStatus(perm === 'granted' ? '授权成功 ✓' : '未获得授权', perm === 'granted' ? 'ok' : 'err');
  } catch (e) {
    showStatus(`授权失败：${e.message}`, 'err');
  }
});

document.getElementById('clearFolderBtn').addEventListener('click', async () => {
  await dbDeleteConfig('local_folder');
  document.getElementById('localFolderStatus').textContent = '未设置';
  document.getElementById('localFolderStatus').style.color = '';
  document.getElementById('reAuthFolderBtn').style.display = 'none';
  document.getElementById('clearFolderBtn').style.display  = 'none';
  showStatus('已取消绑定', 'ok');
});

buildProviderSelect();
loadUiTheme();
loadSettings();
loadLocalFolder();
maybeStartOptionsOnboarding().catch(e => console.warn('[知识图鉴 options] 新手引导启动失败:', e.message));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[UI_THEME_KEY]) {
    applyUiTheme(changes[UI_THEME_KEY].newValue);
  }
  if (area === 'local' && changes[ONBOARDING_OPTIONS_PENDING_KEY]?.newValue) {
    startOptionsOnboarding(0);
  }
});
