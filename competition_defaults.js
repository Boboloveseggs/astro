'use strict';

// 比赛演示专用默认通道。
// 开发版默认关闭；打包 astro.release.zip 时可由本机脚本替换为一次性比赛 Key。
window.COMPETITION_DEFAULTS = {
  enabled: false,
  provider: 'zhipu',
  model: 'glm-4-flash',
  apiKey: '',
  note: 'competition-only disposable key',
};
