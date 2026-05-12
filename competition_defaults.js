'use strict';

// Public GitHub build: no API key is included.
// The competition zip may inject a disposable local key during release packaging.
window.COMPETITION_DEFAULTS = {
  enabled: false,
  provider: 'zhipu',
  model: 'glm-4-flash',
  apiKey: '',
  note: 'public-source-build-no-key',
};
