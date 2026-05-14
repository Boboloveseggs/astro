# 完成报告：P0 同 URL 项目隔离与 shortId 收紧

日期：2026-05-04

## 做了什么

- 修复 P0-003「同 URL 全局覆盖」。
- `dbSaveArticle()` 从“同 URL 全局唯一”改为“同项目内 URL 唯一”：
  - 同一个项目里再次保存同 URL，会覆盖该项目内旧记录。
  - 不同项目保存同一个 URL，会保留为两条独立记录。
- 本地文件夹反向同步改为 shortId 优先匹配：
  - 文件名 shortId 命中时，直接更新对应文章。
  - URL 只在全库唯一时作为兜底匹配。
  - 如果同 URL 存在多条跨项目记录，URL 不再兜底，避免误写到别的项目。
- 自我审查补强：
  - shortId 命中也必须唯一；如果多个记录末 6 位碰撞，不再兜底更新任意一条。
  - 备份导入时会把备份 articleId 映射为实际保存后的 articleId，并重建该文章节点引用，避免 nodes 表引用旧 id。
- 修复 P2-002「shortId 解析过松」：
  - shortId 必须至少 6 位，且只能是字母数字。
  - `a_b.md` 不再把 `b` 当 shortId。
  - 更长 id 会取末 6 位匹配库内记录。
- 保存分析结果后，节点表维护从 `dbUpdateNodes()` 改为 `dbReplaceArticleNodes()`，避免同项目同 URL 覆盖旧文章时留下旧节点引用。
- 更新设置页备份说明，从“同 URL 文章以备份为准”改成“同项目内同 URL 文章以备份为准”。

## 验收标准

- 在项目 A 保存 URL `https://example.com/x`，再在项目 B 保存同 URL，不应覆盖项目 A 的记录。
- 在项目 A 再次保存同 URL，应覆盖项目 A 内旧记录，而不是新增重复记录。
- 同 URL 跨项目存在多条记录时，本地 Markdown 反向同步不能仅凭 URL 更新任意一条记录。
- 文件名 `a_b.md` 的 shortId 应被忽略，并产生 warning。
- 文件名 `2024-03-10_文章_test000abc123.md` 应取末 6 位 `abc123` 匹配库内记录。
- 如果多个记录末 6 位 shortId 碰撞，本地反向同步不应凭 shortId 随机更新其中一条。
- 备份导入同项目同 URL 覆盖时，`nodes.articles` 应引用实际保存后的 articleId，而不是备份里的旧 articleId。
- 同项目同 URL 覆盖后，节点表应按新 `nodes_hit` 重建，不保留旧节点引用。

## 与预期相比

- 符合问题日志中“项目隔离优先”的修复方向。
- 同步匹配比原计划更稳：不仅修了 `dbSaveArticle()`，也同步收紧了本地文件夹回读的 URL 兜底规则。
- 顺手完成了 P2-002，因为它直接影响本地同步匹配安全，属于同一条数据安全链路。

## 涉及文件

- `db.js`
  - 新增 `sameProjectId()` 和 `findUniqueUrlRecord()`。
  - 自查补强新增 `findUniqueShortIdRecord()`。
  - 修改 `dbSaveArticle()` 的 URL 覆盖逻辑。
  - 收紧 `parseMarkdownRecord()` 的 shortId 解析。
  - 修改 `syncFromLocalFolder()` 为 shortId 优先、唯一 URL 兜底。
  - 修改 `dbImportAll()`，导入时维护 articleId 映射并重建节点引用。
- `panel.js`
  - `saveToLibrary()` 改用 `dbReplaceArticleNodes()` 维护节点引用。
- `options.html`
  - 更新备份导入说明文案。
- `tests/db.test.js`
  - 新增项目隔离 URL helper 测试。
  - 新增 shortId 过短忽略和长 id 取末 6 位测试。
  - 自查补强新增 shortId 碰撞不兜底测试。
- `问题日志_Claude审核清单.md`
  - P0-003 标记为已修复。
  - P2-002 标记为已修复。
  - A4 测试数量更新为 `42 passed / 0 failed`。

## 不动清单

- 不改 IndexedDB schema。
- 不迁移旧数据。
- 不改 Markdown 正文格式。
- 不改 JSON 备份结构。
- 不改 AI prompt、模型调用和解析校验。
- 不改资产页、地图页、复盘页的渲染逻辑。
- 不改 Obsidian Vault 导出格式。

## 测试说明

- 自动化测试页：
  - 命令：`chrome --headless --dump-dom tests/test.html`
  - 结果：`42 passed / 0 failed`
- 新增覆盖：
  - `sameProjectId()`：确认缺失项目视为 `default`，不同项目不相等。
  - `findUniqueUrlRecord()`：确认跨项目同 URL 重复时不返回兜底记录。
  - `findUniqueShortIdRecord()`：确认 shortId 碰撞时不返回兜底记录。
  - `parseMarkdownRecord()`：确认过短 shortId 被忽略。
  - `parseMarkdownRecord()`：确认更长 id 取末 6 位。
- 静态检查：
  - `panel.html`：无重复 id。
  - `options.html`：无重复 id。
  - `options.html` 语法冒烟：未发现 `SyntaxError`。

## 手动验收步骤

1. 新建两个项目 A、B。
2. 在项目 A 保存一篇网页文章。
3. 切到项目 B，保存同一个网页 URL。
4. 回到资产页确认 A、B 各自都有一条记录，互不覆盖。
5. 在项目 A 再保存同一个 URL，确认项目 A 内记录被更新，项目 B 不变。
6. 对项目 A 的本地 Markdown 文件改一个可解析字段，点击重新扫描，确认更新的是 shortId 对应记录。
7. 如果同 URL 跨项目有多条记录，删除文件名里的 shortId 后再扫描，确认不会凭 URL 随机改写某个项目。

## 回答 Claude 审核固定问题

1. 本次改动是否触碰数据写入、删除、导入、同步或迁移？
   - 是。触碰文章保存和本地反向同步匹配；未做迁移。
2. 是否可能造成旧数据被覆盖、丢失、重复、孤立引用？
   - 修复目标就是降低跨项目覆盖风险。同项目同 URL 仍会按产品规则覆盖；不同项目同 URL 不再覆盖。保存覆盖时节点表改为重建，降低孤立引用风险。
3. 是否维护了 `articles` 与 `nodes` 的一致性？
   - 是。`saveToLibrary()` 改用 `dbReplaceArticleNodes()`，同 URL 覆盖时会清理旧节点引用并写入新节点。
4. 是否改变旧 Markdown 格式或 JSON 备份格式？
   - 否。只改变匹配规则和提示文案。
5. 是否改变 IndexedDB schema？迁移路径是什么？
   - 否，无迁移。
6. 是否影响 A1-A5 已有能力？
   - A1 反向同步匹配更安全；A4 测试增至 `42 passed / 0 failed`；其余能力未改。
7. 自动化测试覆盖什么？不能覆盖的手动验收是什么？
   - 自动化测试覆盖项目隔离匹配 helper、URL 唯一兜底、shortId 解析。实际 IndexedDB 中跨项目保存行为需按手动验收步骤在扩展环境确认。
8. 三天后 Claude 只看完成报告，是否能复现验收？
   - 可以。本报告列出了改动文件、规则、自动测试和手动验收路径。
