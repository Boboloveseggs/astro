# C1 完成报告 · 轻量 Markdown 编辑器

## 做了什么

### db.js
- 新增 `dbPutArticle(record)`：
  - 按 `id` 直接更新已有记录。
  - 避免编辑已有资产时触发 `dbSaveArticle()` 的同 URL 全局覆盖逻辑。
- `parseMarkdownRecord()` 增加 `warnings`：
  - `文章优势`、`知识节点`、`下一步选题` 如果存在格式异常行，会返回可提示用户的 warning。
  - 异常列表段落仍不写回，继续保护旧数据。
- 新增 `mergeParsedMarkdownRecord(existing, parsed)`：
  - 合并 Markdown 解析结果与已有记录。
  - 支持 H1 标题回写。
  - 支持普通文章分析字段回写。
  - 支持速记标题和正文回写。
  - 普通文章即使写了 `## 速记`，也不会被误改成速记。
- `syncFromLocalFolder()` 改用 `mergeParsedMarkdownRecord()` 和 `dbPutArticle()` 更新已有记录：
  - 本地 Markdown 改标题也能回写。
  - 更新已有记录时不再走 URL 覆盖路径。

### panel.js
- 资产详情页新增「编辑 Markdown」按钮。
- 速记详情页新增「编辑 Markdown」按钮。
- 新增 `showMarkdownEditor(rec)`：
  - 使用 textarea 作为轻量 Markdown 编辑器。
  - 内容来自 `buildArticleMarkdown(rec)`。
  - 支持取消、返回详情。
- 新增 `saveMarkdownEdit(original)`：
  - 用 `parseMarkdownRecord()` 解析编辑后的 Markdown。
  - 用 `mergeParsedMarkdownRecord()` 生成安全补丁。
  - 用 `dbPutArticle()` 按 id 保存。
  - 如果更新了 `nodes_hit`，同步调用 `dbReplaceArticleNodes()` 维护节点表。
  - 保存后尝试 `writeArticleToLocalFolder()`，保持本地文件夹同步。
  - 如果有解析 warning，会保留在编辑器中提示用户。

### panel.html
- 新增编辑器样式：
  - `.detail-action-row`
  - `.markdown-editor-actions`
  - `.markdown-editor-head`
  - `.markdown-editor-title`
  - `.markdown-editor-input`
  - `.markdown-editor-status`
- 调整详情页操作按钮布局，让「编辑 Markdown」和「删除」并排显示。

### tests/db.test.js
- 新增 3 个测试：
  - `mergeParsedMarkdownRecord: 合并标题和分析补丁`
  - `mergeParsedMarkdownRecord: 普通文章不被速记段落改成 idea`
  - `mergeParsedMarkdownRecord: 速记正文可回写`
- 增强原有“知识节点部分异常”测试，确认会返回 warning。

### 文档
- 更新 `完成报告_A4_最小单元测试.md`：
  - `db.test.js` 从 20 个用例变为 25 个。
  - 总测试数从 29 变为 34。
- 更新 `问题日志_Claude审核清单.md`：
  - C1 状态改为「已完成」。
  - A4 最新测试结果改为 `37 passed / 0 failed`。

## 验收标准

| 步骤 | 预期结果 |
|------|----------|
| 打开任意资产详情 | 底部出现「编辑 Markdown」按钮 |
| 点击「编辑 Markdown」 | 进入 textarea 编辑器，内容为当前资产 Markdown |
| 修改 H1 标题并保存 | 资产标题更新 |
| 修改 `**核心判断**` 并保存 | 资产详情里的核心判断更新 |
| 修改 `## 编辑评语` 并保存 | 编辑评语更新 |
| 修改 `## 知识节点` 并保存 | 资产详情更新，节点表同步更新 |
| 知识节点有格式异常行 | 不半截覆盖旧节点，并提示 warning |
| 打开速记详情并编辑 | 可修改速记标题和正文 |
| 普通文章里误写 `## 速记` | 不会把普通文章改成速记类型 |
| 保存成功且已绑定本地文件夹 | 尝试写回本地 Markdown 文件 |
| 打开 `tests/test.html` | 显示 `37 passed / 0 failed` |

## 与预期相比

- 达成 C1 的保守可用版本：不是完整 CodeMirror，而是 textarea + 现有 Markdown 解析闭环。
- 优先保证数据安全：编辑已有记录时按 `id` 更新，不走 URL 覆盖路径。
- 与本地优先方向一致：编辑保存后会尝试同步写回本地 Markdown。
- 暂未实现：
  - Markdown 预览。
  - 语法高亮。
  - Wikilink 自动补全。
  - 节点重命名/合并。
  - 正文全文编辑；当前仍主要编辑分析 Markdown 与速记正文。

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
- 不改变 Obsidian Vault 导出格式。
- 不新增第三方依赖。
- 不改变文章捕获与分析流程。
- 不改变地图和复盘主逻辑。

## 测试说明

- 已运行 Chrome headless：
  - `file:///C:/参赛文档/zhijing_v4/tests/test.html`
- 实际结果：
  - `37 passed / 0 failed`
- 已做静态检查：
  - `panel.html` 无重复 `id`。
  - `panel.html` 可被浏览器加载，未发现语法错误；在 file 模式下出现 `chrome.storage` 不存在报错，属于非扩展环境预期。
- 仍需真实扩展手动验收：
  - 编辑资产 Markdown 并保存。
  - 编辑速记 Markdown 并保存。
  - 修改节点后查看节点库/地图是否同步。

## Claude 审核风险回应

- 本次触碰数据写入，按 P0 处理。
- 编辑保存使用 `dbPutArticle()` 按 id 更新，降低同 URL 全局覆盖风险。
- `nodes_hit` 修改后同步调用 `dbReplaceArticleNodes()`，维护 `articles` 与 `nodes` 一致性。
- Markdown 解析异常不会覆盖旧数组；编辑器会提示 warning。
- 不改变 DB schema，不需要迁移。
