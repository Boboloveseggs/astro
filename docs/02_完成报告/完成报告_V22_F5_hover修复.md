# 完成报告：V22 F5 hover 修复

时间：2026-05-09

## 本次改动

- `panel.js`
  - 保持 `NODE_HOVER_SHOW_DELAY = 1000` 不变。
  - `startEarthSphereDrag()` 拖拽结束后新增 `resumeNodeHoverAfterDrag(e)`。
  - 拖拽结束时主动用 `document.elementFromPoint()` 检查鼠标下是否是 `.sphere-node`。
  - 如果停在节点上，立刻重新启动 1 秒 hover 倒计时。
  - `scheduleShowNodeHoverCard()` 增加拖拽中保护：拖拽期间不触发 hover。

- `tests/panel_map.test.js`
  - 新增回归测试：拖拽结束后停在节点上，等待 `NODE_HOVER_SHOW_DELAY + 40ms`，hover 卡必须出现。

## 验收标准

- hover 延迟仍为 1 秒。
- 拖拽期间不弹 hover 卡。
- 拖拽结束后，如果鼠标停在节点上，hover 能在 1 秒内恢复显示。
- 不改知识球视觉、不改自转/缩放参数、不改宇宙视觉。

## 实际结果

- 已符合：拖拽结束后会重新检测节点并恢复 hover。
- 已符合：测试真实等待 1 秒后确认 hover 卡可见。
- 未改动：宇宙颜色、旋转、螺旋臂、星云粒子参数。

## 验证记录

- 前端测试：`103 passed / 0 failed`
- 新增测试：`startEarthSphereDrag: 拖拽结束停在节点上时 1 秒内恢复 hover`

## 风险与回滚

- 风险：如果浏览器环境不支持 `elementFromPoint()`，该逻辑会自动跳过，不影响原 hover。
- 回滚路径：删除 `resumeNodeHoverAfterDrag()` 调用与函数，恢复 `scheduleShowNodeHoverCard()` 原逻辑。
