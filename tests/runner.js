'use strict';

var Suite = (() => {
  const queue = [];
  let passed = 0, failed = 0;
  let keepAlive = null;

  function test(name, fn) { queue.push({ name, fn }); }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
  }

  function assertEqual(a, b, msg) {
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) throw new Error(msg || `\n  期望: ${sb}\n  实际: ${sa}`);
  }

  async function run() {
    keepAlive = setInterval(() => {}, 50);
    const el      = document.getElementById('results');
    const summary = document.getElementById('summary');
    try {
      for (const { name, fn } of queue) {
        try {
          await fn();
          passed++;
          const d = document.createElement('div');
          d.className = 'test pass';
          d.textContent = '✓ ' + name;
          el.appendChild(d);
        } catch (e) {
          failed++;
          const d = document.createElement('div');
          d.className = 'test fail';
          d.innerHTML = `✗ ${name}<div class="error">${e.message.replace(/</g,'&lt;')}</div>`;
          el.appendChild(d);
        }
      }
      summary.textContent = `${passed} passed  /  ${failed} failed`;
      summary.className   = 'summary ' + (failed ? 'fail' : 'pass');
    } finally {
      clearInterval(keepAlive);
      keepAlive = null;
    }
  }

  return { test, assert, assertEqual, run };
})();

globalThis.Suite = Suite;
