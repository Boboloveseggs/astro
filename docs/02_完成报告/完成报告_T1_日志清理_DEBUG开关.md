# 完成报告：T1 日志清理 + DEBUG 开关

日期：2026-05-07

## 做了什么

- 按 `任务下发_第二轮迭代清单.md` 的 T1 要求，清理发布前正常流程日志。
- 在以下文件加入默认关闭的 `DEBUG=false` 和 `debugLog(...)`：
  - `panel.js`
  - `background.js`
  - `content.js`
  - `db.js`
- 将诊断性 `console.log('[知境图鉴 ...] ...')` 改为 `debugLog(...)`。
- 保留 `console.warn` 和 `console.error`，用于失败提示和程序错误。
- 自查时发现 `db.js` 与 `panel.js` 都作为普通 script 加载，顶层 `const DEBUG` 会冲突；已改为 `var DEBUG=false`，避免 `Identifier 'DEBUG' has already been declared`。

## 验收标准

- 默认 `DEBUG=false` 时，正常打开 panel 不输出普通流程日志。
- `console.warn` / `console.error` 仍保留。
- 临时把 `DEBUG` 改为 `true` 后，原诊断日志可重新出现。
- `panel.html` 加载不出现 `Identifier 'DEBUG' has already been declared`。
- 不新增裸 `console.log`，除 `debugLog()` 函数内部外。

## 与预期相比

- 达成 T1 目标。
- 额外修复了普通 script 多文件共享全局作用域导致的 `const DEBUG` 冲突风险。
- 本次没有改功能行为，只改变调试日志输出路径。

## 涉及文件

- `panel.js`
  - 新增 `DEBUG` / `debugLog`。
  - panel 初始化日志改为 `debugLog`。
- `background.js`
  - 新增 `DEBUG` / `debugLog`。
  - 图标点击、捕获结果、注入页正常流程日志改为 `debugLog`。
- `content.js`
  - 新增 `DEBUG` / `debugLog`。
  - 手动捕获日志改为 `debugLog`。
- `db.js`
  - 新增 `DEBUG` / `debugLog`。
  - storage → IndexedDB 迁移完成日志改为 `debugLog`。
- `问题日志_Claude审核清单.md`
  - P2-004 标记为已修复。

## 不动清单

- 不改 IndexedDB schema。
- 不改文章、节点、项目、视图数据。
- 不改本地文件夹同步逻辑。
- 不改 Markdown 写入格式。
- 不改 JSON 备份格式。
- 不改 AI prompt、模型调用或错误解析。
- 不推进 T2-T10。

## 测试说明

- 自动化测试页：
  - 命令：`chrome --headless --dump-dom tests/test.html`
  - 结果：`42 passed / 0 failed`
- HTML 结构检查：
  - `panel.html` 无重复 id。
  - `options.html` 无重复 id。
- 语法冒烟：
  - `panel.html` 未发现 `SyntaxError`。
  - 已确认没有 `Identifier 'DEBUG' has already been declared`。
- 日志静态检查：
  - `panel.js` / `background.js` / `content.js` / `db.js` 中，裸 `console.log` 只存在于 `debugLog()` 函数内部。
  - `console.warn` / `console.error` 保留。

## 手动验收步骤

1. 以默认 `DEBUG=false` 加载扩展，打开 panel，正常流程不应出现普通 `console.log`。
2. 临时把对应文件的 `DEBUG` 改为 `true`，重新加载扩展。
3. 点击扩展图标或触发捕获，确认原诊断日志能重新出现。
4. 改回 `DEBUG=false`。

## 回答 Claude 审核固定问题

1. 本次改动是否触碰数据写入、删除、导入、同步或迁移？
   - 否。只改日志输出路径。
2. 是否可能造成旧数据被覆盖、丢失、重复、孤立引用？
   - 否。本次没有数据写入路径变化。
3. 是否维护了 `articles` 与 `nodes` 的一致性？
   - 本次不修改 `articles` / `nodes`。
4. 是否改变旧 Markdown 格式或 JSON 备份格式？
   - 否。
5. 是否改变 IndexedDB schema？迁移路径是什么？
   - 否，无迁移。
6. 是否影响 A1-A5 已有能力？
   - 未影响；测试仍为 `42 passed / 0 failed`。
7. 自动化测试覆盖什么？不能覆盖的手动验收是什么？
   - 自动化测试覆盖现有解析、同步保护、导出等核心逻辑；DEBUG 开关需要按手动验收步骤临时切换确认。
8. 三天后 Claude 只看完成报告，是否能复现验收？
   - 可以。本报告列出改动文件、静态检查、测试结果和手动步骤。

