'use strict';

// 比赛演示专用默认通道（供评委一键填入,源 key 仅限本届比赛演示使用）。
// 用户在 API 设置页点击"比赛专用密钥 供评委使用"按钮后,会把这里的 provider/model/apiKey 写入本机存储。
window.COMPETITION_DEFAULTS = {
  enabled: true,
  provider: 'zhipu',
  model: 'glm-4.5-air',
  apiKey: 'e40825118f204b5e8ba7765708a5bb8e.KvH8SnuJPRP7f5hk',
  note: 'competition-only disposable key',
};
