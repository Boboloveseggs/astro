# 完成报告 · V2.1 T8 3D 星云 PPT 式精细化

完成时间：2026-05-09

## 一、这次要解决什么

用户反馈：3D 宇宙已经接近方向，但仍然粗糙，希望“像 PPT 动画一样”更精细。

本次目标：

- 星云画面减少硬颗粒、硬线条和工程草图感。
- 进入宇宙时有淡入和镜头入场，而不是静态出现。
- 点击星点时有类似 PPT 演示的镜头推进缓动。
- 锁定星点使用柔光放大，不出现硬边框。
- 整体动画更慢、更稳、更有编排感。

## 二、实际改动

### `panel.js`

- 新增 `clamp01()` / `easeOutCubic()` / `easeInOutCubic()`，用于统一镜头和淡入缓动。
- 优化 `universeGalaxyTexture()`：
  - 星云臂从 5 层提升到 7 层。
  - 降低硬线条透明度。
  - 增加轻微 blur。
  - 星尘纹理数量从 1600 降到 1200，避免画面过噪。
- `createUniversePointCloud()` / `createUniverseGalaxyPlane()` / `createUniverseGlow()` 增加 `baseOpacity` 记录，方便按入场进度统一淡入。
- 新增 `universeCameraTargetForObject()` / `startUniverseCameraTween()` / `applyUniverseCameraTween()`：
  - 进入宇宙时从远处镜头推进。
  - 点击星点时用 2.4s cubic 缓动推进。
  - 解锁时用 1.8s 缓动回到全局宇宙。
- `startUniverseRenderLoop()`：
  - 增加 2.6s 入场动画。
  - 星云、星尘、远景星点、核心光晕分层淡入。
  - 星点按顺序轻微 stagger 浮现。
  - 星云旋转速度进一步降低。
  - 锁定星点增加无边框柔光 `focusGlow`。
- `renderUniverseThreeView()`：
  - 保存 `galaxyPlane`、`dustCloud`、`farStars`、`focusGlow`、`glowSprites` 等层，用于动画编排。
  - 星点 `userData` 增加 `revealDelay`，支持逐个浮现。

### `panel.html`

- `.universe-canvas-wrap::before`：增加暗角和轻微色调罩，让画面更像完整演示页而不是裸 canvas。
- `.universe-canvas-wrap::after`：新增 `universeSlideSheen`，非常轻的演示式光扫。
- `.universe-star-tooltip` 增加 scale 过渡，hover 出现更像 PPT 浮层。

### `tests/universe_fixture.html`

- 同步宇宙容器、光扫、tooltip 相关 CSS。

### `tests/panel_map.test.js`

- 增加断言：
  - 存在程序生成的星云纹理层 `galaxyPlane`。
  - 存在锁定星点柔光推进层 `focusGlow`。
  - 进入宇宙时存在 `cameraTween`，证明不是瞬间跳镜头。

## 三、验收结果

| 验收项 | 结果 |
|---|---|
| 进入宇宙有镜头入场 | 通过 |
| 点击星点有缓动推进，不是瞬切 | 通过 |
| 星点无边框，锁定时用柔光强调 | 通过 |
| 星云更柔和，降低硬颗粒感 | 通过 |
| 原金色知识球入口保留 | 通过 |
| 3D canvas 不黑屏 | 通过 |

## 四、截图

截图目录：`screenshots_V21_T8_ppt_refine/`

- `ppt_universe_default_15.png`：默认 15 星点宇宙。
- `ppt_universe_locked_history.png`：锁定“历史”星点后的推进视角。
- `ppt_universe_links_8.png`：带跨球关系线的宇宙。
- `ppt_universe_single_inside.png`：再次进入后的原金色知识球。

## 五、测试

已运行 Chrome headless 测试页：

```text
95 passed / 0 failed
```

## 六、画布非空检查

对最终截图做了像素亮度采样：

| 截图 | 明亮采样点 / 总采样点 | 比例 |
|---|---:|---:|
| `ppt_universe_default_15.png` | 983 / 8820 | 0.1115 |
| `ppt_universe_links_8.png` | 964 / 8820 | 0.1093 |
| `ppt_universe_locked_history.png` | 2137 / 8820 | 0.2423 |
| `ppt_universe_single_inside.png` | 134 / 8820 | 0.0152 |

## 七、不动清单

- 未修改 IndexedDB schema。
- 未修改 `db.js` 数据迁移。
- 未修改 Markdown 写入 / 解析格式。
- 未修改 AI prompt / analyzer schema。
- 未修改文章、节点、素材库的数据写入逻辑。
- 未修改 `chrome.storage.local.zhj_map_state` 的字段结构。
- 原金色知识球内部视图保留。

## 八、与预期相比

这次主要提升“动画质感”，不是改产品结构。相比上一版：

- 从直接渲染改为“远景入场 → 星点浮现 → 缓慢旋转”。
- 从线性跟随改为 cubic 镜头缓动。
- 从硬星尘改为更柔的分层淡入。
- 从选中星点放大改为柔光聚焦。

后续如果继续精修，建议只调 3 个审美参数：星云亮度、镜头推进距离、星点大小，不再重写架构。

## 九、回滚路径

如需回滚本次精细化：

1. 还原 `panel.js` 中本次新增的 easing、cameraTween、focusGlow、分层淡入逻辑。
2. 还原 `panel.html` 和 `tests/universe_fixture.html` 中 `universeSlideSheen`、canvas 遮罩和 tooltip scale 改动。
3. 还原 `tests/panel_map.test.js` 新增的 `galaxyPlane` / `focusGlow` / `cameraTween` 断言。
4. 删除 `screenshots_V21_T8_ppt_refine/`。
