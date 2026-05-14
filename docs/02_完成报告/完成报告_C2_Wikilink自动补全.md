# C2 完成报告 · Wikilink 自动补全

## 做了什么

### db.js
- 新增 `extractWikilinks(text)`：
  - 从全文提取 `[[节点]]`。
  - 支持 `[[节点|别名]]`。
  - 支持 `[[节点#标题]]`。
  - 自动去重。
- `parseMarkdownRecord()` 现在会写入 `analysis.wikilinks`。
- `buildArticleMarkdown()` 支持输出 `## Wikilinks` 段落，避免链接只存在内存里。
- `buildObsidianMarkdown()` 支持：
  - front-matter 输出 `wikilinks` 数组。
  - 正文输出 `## Wikilinks`，并保持 Obsidian `[[节点]]` 格式。
- `mergeParsedMarkdownRecord()` 已支持 `wikilinks` 的增删改：
  - 删除全部 wikilinks 也能产生 patch。
  - 空数组与未定义在无旧链接时视为无变化，避免同步误报。

### panel.js
- `ROLE_MAP` 增加 `linked: '链接'`。
- 新增 `recordNodeMentions(rec)`：
  - 合并 `analysis.nodes_hit` 和 `analysis.wikilinks`。
  - 如果同一节点已经在 `nodes_hit` 中出现，wikilink 不重复计入。
  - wikilink 作为轻量节点：`type = concept`，`role = linked`。
- 节点库 `buildNodeIndex()` 改为使用 `recordNodeMentions()`：
  - 节点库能显示由 `[[节点]]` 产生的链接型节点。
- 节点详情 `showNodeDetail()` 改为使用 `recordNodeMentions()`：
  - `[[节点]]` 会出现在反链作品里。
- Markdown 编辑器新增 `initWikilinkAutocomplete(input)`：
  - 输入 `[[` 后显示候选节点。
  - 候选来自已有节点表和所有文章中的节点/链接。
  - 点击候选会插入 `[[节点名]]`。
  - 支持继续输入关键词筛选候选。

### panel.html
- 新增 `.badge-linked` 样式。
- 新增 Wikilink 候选列表样式：
  - `.wikilink-suggest`
  - `.wikilink-suggest-item`

### tests/db.test.js
- 新增 3 个测试：
  - `extractWikilinks: 解析并去重 Obsidian 链接`
  - `parseMarkdownRecord: 提取全文 wikilinks`
  - `mergeParsedMarkdownRecord: 删除 wikilinks 可产生 patch`

### 问题日志_Claude审核清单.md
- 将 C2「Wikilink 自动补全」状态更新为「已完成」。
- A4 当前测试结果更新为 `37 passed / 0 failed`。

## 验收标准

| 步骤 | 预期结果 |
|------|----------|
| 打开资产详情并点击「编辑 Markdown」 | 进入 Markdown 编辑器 |
| 在编辑器中输入 `[[` | 出现已有节点候选 |
| 继续输入关键词 | 候选按节点名过滤 |
| 点击候选 | 自动插入 `[[节点名]]` |
| 保存 Markdown | `[[节点名]]` 写入 `analysis.wikilinks` |
| 打开「资产」Tab 的「节点」入口 | 链接型节点出现在节点库中 |
| 点击该节点 | 节点详情显示包含该 Wikilink 的作品 |
| 导出 Obsidian Vault | front-matter 和正文保留 wikilinks |
| 打开 `tests/test.html` | 显示 `37 passed / 0 failed` |

## 与预期相比

- 达成 C2 的最小可用目标：输入 `[[` 可以补全已有节点，链接会进入节点反链。
- 保守实现：不新增依赖，不接入 CodeMirror，不改 IndexedDB schema。
- 与 Obsidian 方向一致：保留 `[[节点]]` 明文格式，导出 Vault 后也能识别。
- 暂未实现：
  - 键盘上下选择候选。
  - 新建未知节点时的专门确认流程。
  - 节点重命名、合并。
  - Wikilink 对地图/复盘高频节点的权重影响。

## 涉及文件

- `db.js`
- `panel.js`
- `panel.html`
- `tests/db.test.js`
- `完成报告_A4_最小单元测试.md`
- `问题日志_Claude审核清单.md`

## 不动清单

- 不改变 IndexedDB schema。
- 不改变 AI prompt。
- 不改变 JSON 备份格式。
- 不新增第三方依赖。
- 不改变文章捕获与分析流程。
- 不改变 `nodes_hit` 的 AI 分析结构。

## 测试说明

- 已运行 Chrome headless：
  - `file:///C:/参赛文档/zhijing_v4/tests/test.html`
- 实际结果：
  - `37 passed / 0 failed`
- 已做静态检查：
  - `panel.html` 无重复 `id`。
  - `panel.html` 可被浏览器加载，未发现语法错误；在 file 模式下出现 `chrome.storage` 不存在报错，属于非扩展环境预期。
- 仍需真实扩展手动验收：
  - 输入 `[[` 是否弹出候选。
  - 点击候选是否正确插入。
  - 保存后节点库和节点详情是否显示链接反链。

## Claude 审核风险回应

- 本次触碰数据写入，但只新增 `analysis.wikilinks` 字段，不改 DB schema。
- `wikilinks` 不覆盖 `nodes_hit`，AI 节点结构仍保持不变。
- 链接型节点只作为轻量反链参与节点库/节点详情，不污染 AI 节点角色。
- 删除 wikilinks 有测试覆盖，避免旧链接残留。
- 导出 Obsidian Vault 保留 `[[节点]]` 语法，符合本地 Markdown/Obsidian 方向。
