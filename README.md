# 知识图鉴

面向知乎创作者的作品资产库、写作指纹系统与个人知识宇宙。

知识图鉴会读取创作者的作品，把文章拆解成可复用素材、立意、相邻领域推荐、旧文章复利和下一篇知乎问题方向。它不是替你写文章的工具，而是帮助你从过去写过的内容里看见方向，让旧文章继续为下一篇创作工作。

## GitHub 公开版说明

本仓库是公开源码版，不包含任何 API Key、Access Secret、app_secret 或本机凭证。

- 公开源码包：<https://astro.r2049.cn/zhijing-github-safe-20260512.zip>
- SHA256：`B094A418D3075BB9D97EBD8AEBC9E984F299D2A926A8F3F335E5E0BC7A1E4209`
- 参赛体验包：<https://astro.r2049.cn/astro.release.zip>

## 源码导入

仓库已放入 `.github/workflows/import-source.yml`。如果 GitHub 没有自动展开完整源码，请在仓库页面执行：

1. 打开 **Actions**。
2. 选择 **Import GitHub safe source package**。
3. 点击 **Run workflow**。
4. 等它完成后，完整去密钥源码会自动提交到 `main`。

## 本地安装

1. 下载或克隆源码。
2. 打开 Chrome / Edge 扩展管理页。
3. 开启“开发者模式”。
4. 选择“加载已解压的扩展程序”。
5. 选择项目目录。
6. 打开扩展设置页，填写自己的 API Key。
7. 回到知乎文章页或扩展面板，载入文章并点击“开始分析”。

## 不要提交到 GitHub 的文件

- `competition_key.local.json`
- `zhihu_openapi.local.json`
- `.env` / `.env.*`
- `KIMIkey.docx`
- `知乎API.txt`
- `astro.release.zip`
- 含有真实密钥、账号、上传日志或本机调试数据的文件
