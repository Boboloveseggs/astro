'use strict';

// 比赛镜像版的知乎开放 API 默认配置。
// 源码默认关闭；打包 astro.release.zip 时由本机脚本注入一次性比赛 app_key/app_secret。
window.ZHIHU_OPENAPI_DEFAULTS = {
  enabled: false,
  appKey: '',
  appSecret: '',
};
