# 知识图鉴：知乎回答日期筛选版

这是 `2026-06-04` 的知识图鉴 Chrome 扩展发布包分支，来源于：

```text
C:\参赛文档\知识图鉴_知乎回答日期筛选版_20260604
```

当前 manifest 版本为 `2.0.0`。这个分支的重点是把「知乎回答批量导出」补进侧边栏，并支持按回答创建日期筛选导出范围。

## 主要更新

- 新增侧边栏「导出回答」页签。
- 新增起始日期和结束日期输入框。
- 默认起始日期为 `2026-05-17`，结束日期留空表示导出到现在。
- 两个日期都留空时导出全部回答。
- 新增日期格式校验和起止顺序校验。
- 新增 `export_zhihu_answers.js`，通过已登录的知乎页面读取当前账号回答列表。
- 导出时按回答 `created_time` 过滤。
- 日期筛选导出文件名形如 `zhihu_answers_2026-05-17_to_2026-06-04.json`。

## 安装方法

1. 下载或解压本分支文件。
2. 打开 Chrome / Edge 的扩展程序页面。
3. 开启「开发者模式」。
4. 点击「加载已解压的扩展程序」。
5. 选择本目录作为扩展目录。

## 导出回答

1. 在同一个浏览器中先登录 `https://www.zhihu.com/`。
2. 打开插件侧边栏，进入「导出回答」。
3. 选择起始日期和结束日期。
4. 点击「批量导出我的回答」。

导出的 JSON 文件保存位置由浏览器下载设置决定，通常是系统「下载」文件夹。插件没有写死保存到 `C:\我的回答`。

## 本次校验

已对以下脚本执行基础语法检查：

```text
node --check analyzer.js
node --check background.js
node --check competition_defaults.js
node --check content.js
node --check db.js
node --check export_zhihu_answers.js
node --check options.js
node --check panel.js
node --check providers.js
```

同时已确认 `manifest.json` 可解析，插件名为「知识图鉴」，侧栏入口为 `panel.html`。

## 说明

这个分支保存的是 2026-06-04 日期筛选发布包。若要合并到 `main`，需要先人工复核主线里后续新增的知乎开放平台和文档改动，避免被这个发布包覆盖。
