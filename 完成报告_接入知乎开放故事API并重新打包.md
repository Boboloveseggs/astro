# 完成报告：接入知乎开放故事 API 并重新打包

## 本次改动

- 只修改比赛镜像版：
  - `C:\参赛文档\zhijing_v4_competition`
- 新增知乎开放 API 客户端：
  - `zhihu_openapi.js`
  - `zhihu_openapi_defaults.js`
- 新增本机私有配置示例：
  - `release_assets/zhihu_openapi.local.example.json`
- 面板分析页新增「知乎黑客松故事素材」入口：
  - 读取故事列表
  - 选择故事
  - 读取故事详情
  - 转换成可分析文章
  - 复用现有“开始分析 → 入资产库 → 素材/立意/知识地图”链路
- `manifest.json` 新增知乎开放 API host 权限：
  - `https://openapi.zhihu.com/*`
- 打包脚本 `release_assets/build_competition_release.ps1` 支持注入知乎开放 API 比赛凭证。
- 新增测试：
  - `tests/zhihu_openapi.test.js`

## 未做内容

- 没有接入发布想法。
- 没有接入评论创建/删除。
- 没有接入点赞/取消点赞。
- 没有接入 OAuth 登录。
- 没有修改 IndexedDB schema。
- 没有修改 Markdown 写入格式。
- 没有修改原始开发版 `zhijing_v4`。

## 验收标准

- 知乎 API 只读故事内容，避免社区写入风险。
- 评委安装比赛包后，可以直接读取知乎黑客松开放故事素材。
- 故事详情能进入现有分析流程，不另造一套数据结构。
- 智谱默认 AI Key 和知乎开放 API 凭证都只在比赛发布包里启用。
- 发布包不能包含：
  - `KEY.txt`
  - `competition_key.local.json`
  - `zhihu_openapi.local.json`
  - `tests`
  - `docs`
  - `node_modules`
  - `.env`
  - `.ps1`

## 实际验收

- 单元测试：`133 passed / 0 failed`
- 知乎开放 API 实测：
  - `GET /openapi/hackathon_story/list`
  - 返回 `status=0`
  - 返回故事数量：`9`
- 重新生成比赛发布包：
  - `C:\参赛文档\astro.release.zip`
- 发布包检查：
  - 智谱默认通道已启用
  - 知乎开放 API 默认通道已启用
  - `manifest.json` 已包含 `https://openapi.zhihu.com/*`
  - 未发现本机私有 Key 文件、测试目录、文档目录或脚本文件

## 注意事项

- 这是比赛演示专用方案，凭证会被写进最终插件包。
- 比赛结束后，请停用或更换本次使用的智谱 Key 和知乎开放 API app_secret。
- 本机保留：
  - `C:\参赛文档\competition_key.local.json`
  - `C:\参赛文档\zhihu_openapi.local.json`
  用于后续重新打包，不要发给别人。
