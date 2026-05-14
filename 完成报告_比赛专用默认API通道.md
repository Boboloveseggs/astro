# 完成报告：比赛专用默认 API 通道

## 本次改动

- 新增 `competition_defaults.js`：源码默认关闭，不包含真实 Key。
- `panel.html`、`options.html` 接入 `competition_defaults.js`。
- `analyzer.js` 新增默认通道解析函数：
  - `getCompetitionDefaultConfig()`
  - `resolveProviderModel(settings)`
  - `getApiKeyForProvider(provider, apiKeys)`
- `panel.js` 的文章分析、追问对话、周复盘、写作指纹、复盘对话等 AI 调用统一改为：
  - 优先使用用户自己保存的 Key；
  - 没有用户 Key 时，比赛包才使用内置的一次性默认 Key。
- `options.js` 设置页支持显示“比赛演示版已内置默认分析通道”的提示；用户自己填写 Key 后仍然优先使用用户 Key。
- 新增 `release_assets/build_competition_release.ps1`：读取本机 `C:\参赛文档\competition_key.local.json`，生成比赛专用 `C:\参赛文档\astro.release.zip`。
- 新增 `release_assets/competition_key.local.example.json`：本机 Key 文件格式示例。

## 验收标准

- 不改 IndexedDB schema。
- 不改 Markdown 写入格式。
- 不改宇宙、知识星球、资产、复盘等视觉与数据结构。
- 开发源码中不写入真实 API Key。
- 比赛打包时才把一次性 Key 写入发布目录。
- 用户自己填写的 Key 优先级高于比赛默认 Key。
- 没有本机 Key 文件时，打包脚本必须停止，避免生成不可用包。

## 实际验收

- 浏览器测试：`130 passed / 0 failed`。
- 脚本自测：
  - 没有 `competition_key.local.json` 时，脚本明确报错并停止。
  - 使用临时假 Key 时，可生成发布目录与 zip。
  - 生成的 `competition_defaults.js` 只出现在发布目录中，源码默认仍为关闭。

## 当前状态

机制已完成，但最终比赛包还没有写入真实比赛 Key。

下一步：把一次性比赛 Key 放到本机文件 `C:\参赛文档\competition_key.local.json`，再运行打包脚本生成最终 `astro.release.zip`。

## 注意事项

- 这个方案只适合比赛演示，不适合作为长期生产方案。
- 内置 Key 会出现在浏览器插件代码里，评委安装后技术上可以看到。
- 请只放一次性、低额度、赛后可删除的 Key。
- 不要放主账号长期 Key，不要放知乎 App Secret，不要放任何不能公开暴露的凭证。
