# API 设置分支与主引导续接修正完成报告

完成时间：2026-05-10

## 本次目标

修正新手引导里 API 设置段落和面板主引导割裂的问题：

- 设置页的“先跳过”容易让用户误解为跳过全部新手引导。
- API 设置页和面板主引导像两套独立引导。
- 从面板跳去设置 API 后，回到面板时缺少明确续接。

## 实际改动

### 1. 按钮语义拆清楚

文件：`panel.html`

- 面板主引导左下角按钮从“先跳过”改为“退出新手引导”。
- 这里确实是退出整段主引导，所以文案改得更诚实。

文件：`options.html`

- 设置页 API 引导左下角按钮从“先跳过”改为“暂不设置 API”。
- 这个按钮只关闭 API 设置这一段，不再让用户误以为会跳过全部产品引导。

### 2. API 设置页改成主引导的分支

文件：`options.js`

- 设置页引导首屏文案改为“这是新手引导里的 API 设置这一段”。
- 步骤标识从 `API 设置 · 第 x 步` 改为 `主引导 · API 设置 · 第 x 步`。
- 结束按钮从“完成 API 设置引导”改为“回到面板继续”。
- 结束文案说明：回到面板后会从“分析第一篇文章”继续。

### 3. 面板记录 API 设置后的续接位置

文件：`panel.js`

- 新增 `onboardingResumeIndex` 存储键。
- 用户在面板主引导中点击“去设置 API Key”时：
  - 写入 `onboardingOptionsPending: true`
  - 写入 `onboardingResumeIndex`
  - 打开设置页
- 用户下次打开面板时，如果主引导未完成且存在续接位置，会从 API 后的下一步继续，而不是重新开始，也不是直接消失。
- 续接只触发一次，触发后会移除 `onboardingResumeIndex`，避免以后每次打开都重复弹。

### 4. 增加防回归测试

文件：`tests/panel_cleanup.test.js`

- 新增测试：点击 API 设置分支时，必须只标记 `onboardingOptionsPending`，并记录 `onboardingResumeIndex`。
- 确认打开 API 设置不会把 `onboardingComplete` 写成完成。

## 验收标准对照

| 验收项 | 结果 |
| --- | --- |
| 设置页不再出现含糊的“先跳过” | 通过，改为“暂不设置 API” |
| 面板主引导退出按钮语义清楚 | 通过，改为“退出新手引导” |
| API 设置页不再像独立第二套引导 | 通过，标识改为“主引导 · API 设置” |
| 从 API 设置回到面板后能继续主引导 | 通过，新增 `onboardingResumeIndex` |
| 跳去设置 API 不会把整段引导标记为完成 | 通过，测试覆盖 |
| 不改宇宙/知识球视觉 | 通过，未触碰地图渲染函数和视觉参数 |
| 不改 DB schema / Markdown 格式 | 通过 |
| 测试通过 | 通过，Chrome headless 跑出 `124 passed / 0 failed` |

## 验证记录

- Chrome headless 测试：`124 passed / 0 failed`
- 静态检查：
  - 已无可见按钮文案“先跳过”
  - 未发现 `importScripts`
  - 未发现 `WEEKLY_REPORT_ALARM`
  - 未发现 `chrome.alarms`
  - 未发现可见文案 `球球`
- 截图记录：
  - `screenshots_onboarding/options_api_skip_branch_label.png`

## 回滚路径

如需回滚本次修改：

1. 将 `panel.html` 的“退出新手引导”改回原按钮文案。
2. 将 `options.html` 的“暂不设置 API”改回原按钮文案。
3. 删除 `panel.js` 中的 `ONBOARDING_RESUME_INDEX_KEY` 及相关 `chrome.storage.local.set/remove/get` 逻辑。
4. 恢复 `options.js` 的 API 设置引导标题、步骤标识和结束文案。
5. 删除 `tests/panel_cleanup.test.js` 中新增的 API 分支续接测试。

