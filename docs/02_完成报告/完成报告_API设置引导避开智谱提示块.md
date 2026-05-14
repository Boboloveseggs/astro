# 完成报告：API 设置引导避开智谱提示块

完成时间：2026-05-10 20:26

## 问题

设置页里，API Key 引导卡片放在上方时，会和「第一次使用？推荐先用智谱 AI」这个黄色提示块重叠。

## 修复内容

1. `options.html`
   - 只调整设置页的新手引导浮层位置：
     - 从上方改回底部；
     - `align-items: flex-end`；
     - `padding: 18px`。
   - 面板页的新手引导仍保持上方，继续避开地图 / 知识星球区域。

## 验收标准

| 标准 | 结果 |
| --- | --- |
| API 设置引导不再盖住智谱 AI 黄色提示块 | 通过 |
| 面板引导仍保持上方，不影响地图 / 星球底部 | 通过 |
| 不改 DB schema / Markdown 格式 / 地图宇宙逻辑 | 通过 |
| 全量测试 | 通过，`123 passed / 0 failed` |

## 视觉验证

截图：

```text
C:\参赛文档\zhijing_v4\screenshots_onboarding\options_onboarding_bottom_no_overlap.png
```

## 自查

静态检查：

```text
rg -n "importScripts|WEEKLY_REPORT_ALARM|chrome\.alarms|球球" background.js panel.js panel.html tests
无命中
```

测试：

```text
123 passed / 0 failed
```

## 备份

```text
C:\参赛文档\backups\zhijing_v4_20260510_2026.zip
```
