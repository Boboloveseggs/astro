# 完成报告：P2 API Key 本机存储

日期：2026-05-04

## 做了什么

- 修复 P2-005「API Key 存储在 chrome.storage.sync」。
- `apiKeys` 改为保存到 `chrome.storage.local`，不再跟随 Chrome 账号同步。
- 保留 `provider` / `model` 在 `chrome.storage.sync`，这些只是偏好设置，不包含密钥。
- 增加兼容迁移：
  - 如果旧版本已经把 `apiKeys` 存在 `chrome.storage.sync`，设置页或面板读取时会自动合并到 `chrome.storage.local`。
  - 迁移成功后会执行 `chrome.storage.sync.remove('apiKeys')`。
- 设置页文案更新为「API Key 仅保存在本机浏览器」，并补充说明密钥不跟随 Chrome 账号同步。
- 面板页监听逻辑改为同时响应：
  - `local.apiKeys` 变化。
  - `sync.provider` 变化。

## 验收标准

- 保存 API Key 后，应写入 `chrome.storage.local.apiKeys`。
- `chrome.storage.sync.apiKeys` 应被移除。
- 旧用户如果已有 `sync.apiKeys`，打开设置页或面板后应自动迁移到 local。
- 面板分析时能从 local 读取当前 provider 对应的 key。
- 设置页切换 provider 时，能读取 local 中对应 provider 的 key。
- 删除 key 时，只删除 local 中对应 provider 的 key。
- provider/model 偏好仍可跨设备同步。

## 与预期相比

- 达到问题日志里的安全目标：API Key 不再跟随 Chrome 账号同步。
- 没有引入额外 UI 开关，采用更保守的默认策略：密钥只存在本机。
- 为旧数据做了自动迁移，用户不需要重新填 key。

## 涉及文件

- `options.js`
  - 新增 `getStoredApiKeys()` / `setStoredApiKeys()`。
  - `loadSettings()` / `saveSettings()` / `deleteKey()` / provider 切换改为读写 local key。
  - 保存设置时只把 `provider` / `model` 写入 sync。
- `panel.js`
  - 新增 `getStoredApiKeys()`。
  - `checkApiKey()` 和 `analyze()` 改为从 local 读取 key。
  - storage change 监听从 `sync.apiKeys` 改为 `local.apiKeys`。
- `options.html`
  - 设置页标题与 hint 明确说明 API Key 仅保存在本机。
- `问题日志_Claude审核清单.md`
  - P2-005 标记为已修复。

## 不动清单

- 不改 IndexedDB schema。
- 不改文章、节点、项目、视图数据。
- 不改 Markdown / JSON 备份格式。
- 不改 AI provider 列表和模型调用协议。
- 不改 A1-A5、B1-B4、C1-C4 的核心数据逻辑。

## 测试说明

- 自动化测试页：
  - 命令：`chrome --headless --dump-dom tests/test.html`
  - 结果：`42 passed / 0 failed`
- 静态检查：
  - `panel.html` 无重复 id。
  - `options.html` 无重复 id。
  - `options.html` 语法冒烟未发现 `SyntaxError`。
- 代码检查：
  - `panel.js` / `options.js` 不再有业务读取 `sync.apiKeys` 的路径；只保留迁移读取和迁移后删除。

## 手动验收步骤

1. 打开设置页，填写某个 provider 的 API Key，点击保存。
2. 在扩展调试环境检查：
   - `chrome.storage.local.get('apiKeys')` 能看到 key。
   - `chrome.storage.sync.get('apiKeys')` 为空或不存在。
3. 切换 provider，确认已保存 key 能正确回填。
4. 点击删除某个 key，确认 local 中对应 key 被删除。
5. 打开面板，确认没有 key 时显示设置提示，有 key 时不显示提示。
6. 用当前 provider 执行一次测试连接或分析，确认能正常读取 local key。

## 回答 Claude 审核固定问题

1. 本次改动是否触碰数据写入、删除、导入、同步或迁移？
   - 是。触碰 `chrome.storage` 设置迁移：`apiKeys` 从 sync 迁到 local；不触碰文章/节点数据。
2. 是否可能造成旧数据被覆盖、丢失、重复、孤立引用？
   - 不影响文章数据。密钥迁移采用 local 优先合并，旧 sync key 会合并后移除。
3. 是否维护了 `articles` 与 `nodes` 的一致性？
   - 本次不修改 `articles` / `nodes`。
4. 是否改变旧 Markdown 格式或 JSON 备份格式？
   - 否。
5. 是否改变 IndexedDB schema？迁移路径是什么？
   - 否。迁移只发生在 `chrome.storage.sync.apiKeys` 到 `chrome.storage.local.apiKeys`。
6. 是否影响 A1-A5 已有能力？
   - 不影响；测试仍为 `42 passed / 0 failed`。
7. 自动化测试覆盖什么？不能覆盖的手动验收是什么？
   - 自动化测试覆盖现有核心纯函数；Chrome storage 迁移需要按手动验收步骤在扩展环境确认。
8. 三天后 Claude 只看完成报告，是否能复现验收？
   - 可以。本报告列出迁移规则、涉及文件和手动验收步骤。

