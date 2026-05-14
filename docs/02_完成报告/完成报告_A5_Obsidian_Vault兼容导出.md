# A5 完成报告 · Obsidian Vault 兼容导出

## 做了什么

### db.js
- 新增 `buildObsidianMarkdown(record, projectName)`：把单篇资产导出为 Obsidian 友好的 Markdown。
- 新增 YAML front-matter 字段：`title`、`created`、`source`、`author`、`type`、`project`、`domain`、`sub_domain`、`perspective`、`tags`、`nodes`。
- 新增 Wikilink 输出：知识节点正文里以 `[[节点名]]` 形式写出，方便 Obsidian 自动建立反链。
- 新增 `dbExportObsidianVault(handle, filter)`：把全部文章导出到用户选择的本地文件夹，每篇文章一个 `.md` 文件。
- 自动生成 `知境图鉴索引.md`：列出本次导出的所有文章链接和所属项目。

### options.html
- 在「数据备份」区域新增按钮：`导出 Obsidian Vault`。
- 保留原来的 JSON「导出备份」和「从备份恢复」，不改变旧备份机制。

### options.js
- 新增 `exportVaultBtn` 点击处理：
  - 检查浏览器是否支持 `showDirectoryPicker`
  - 让用户选择导出文件夹
  - 调用 `dbExportObsidianVault()`
  - 导出中禁用按钮并显示状态
  - 导出完成后显示导出文章数量

### tests/db.test.js
- 新增 `buildObsidianMarkdown` front-matter 测试。
- 新增 tags / nodes YAML 数组与正文 Wikilink 测试。

### 完成报告_A4_最小单元测试.md
- 更新测试数量：`db.test.js` 从 12 个用例变为 14 个，总测试数从 21 个变为 23 个。

## 验收标准

| 步骤 | 预期结果 |
|------|----------|
| 打开扩展设置页 | 「数据备份」区域出现「导出 Obsidian Vault」按钮 |
| 点击「导出 Obsidian Vault」并选择一个文件夹 | 文件夹里生成每篇文章对应的 `.md` 文件 |
| 查看导出的 `.md` 文件 | 文件顶部有 YAML front-matter，包含标题、项目、领域、标签、节点等字段 |
| 查看「知识节点」段落 | 节点名称以 `[[节点名]]` 形式出现 |
| 查看导出目录 | 存在 `知境图鉴索引.md`，里面列出所有导出文章 |
| 用 Obsidian 打开该文件夹 | Markdown 文件可直接浏览，front-matter 可被 Obsidian/Dataview 读取 |
| 打开 `chrome-extension://[ID]/tests/test.html` | 底部显示 `23 passed / 0 failed` |

## 与预期相比

- 达成 A5 核心目标：导出结果已经是 Obsidian 可读的 Vault 风格 Markdown，不再只是 JSON 备份。
- 保守处理：没有替换现有 JSON 备份功能，也没有改变 A1 的本地双向同步 Markdown 格式，避免影响已稳定链路。
- 增强项：额外生成 `知境图鉴索引.md`，方便用户进入 Obsidian 后快速查看导出内容。
- 暂未实现：未按项目自动创建子文件夹；当前通过 front-matter 的 `project` 字段区分项目，后续可在 Dataview 或 B 阶段视图里继续增强。

## 涉及文件

- `db.js`
- `options.html`
- `options.js`
- `tests/db.test.js`
- `完成报告_A4_最小单元测试.md`

## 不动清单

- 不改变 `buildArticleMarkdown()` 的旧格式。
- 不改变 `parseMarkdownRecord()` 的本地反向同步规则。
- 不改变 JSON 备份/恢复逻辑。
- 不改变分析页、资产页、地图页、复盘页 UI。
- 不改变 IndexedDB schema。

