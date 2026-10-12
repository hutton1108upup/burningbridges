import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await readFile('public/analytics.js', 'utf8');
function run(url) {
  const scripts = [];
  const window = {};
  const context = vm.createContext({window, URL, location: new URL(url), document: {
    referrer: 'https://example.com/source?email=private@example.com#private',
    createElement: () => ({}), head: {append: script => scripts.push(script)},
  }});
  vm.runInContext(source, context);
  vm.runInContext(source, context); // Reinitialization must not duplicate tags.
  return {window, scripts};
}
for (const host of ['http://localhost:3000/', 'http://127.0.0.1:3000/', 'https://burningbridges.duckweed1014.workers.dev/']) {
  const result = run(host);
  assert.equal(result.scripts.length, 0);
  assert.equal(result.window.dataLayer, undefined);
}
const production = run('https://burningbridgesaivideo.pro/pricing#private');
assert.equal(production.scripts.length, 2);
const config = production.window.dataLayer.find(args => args[0] === 'config');
assert.equal(config[1], 'G-LSG4H51443');
assert.equal(config[2].page_location, 'https://burningbridgesaivideo.pro/pricing');
assert.equal(config[2].page_referrer, 'https://example.com/source');
assert.equal(config[2].allow_google_signals, false);
assert.equal(config[2].allow_ad_personalization_signals, false);
assert.equal(production.window.dataLayer.filter(args => args[0] === 'config').length, 1);
const query = run('https://burningbridgesaivideo.pro/?email=private@example.com');
assert.equal(query.scripts.length, 1);
assert.match(query.scripts[0].src, /^https:\/\/www\.googletagmanager\.com\//);
assert.equal(query.window.dataLayer.find(args => args[0] === 'config')[2].page_location, 'https://burningbridgesaivideo.pro/');
const manifest = JSON.parse(await readFile('site.config.json', 'utf8'));
for (const route of manifest.routes) {
  const html = await readFile(`public${route === '/' ? '' : route}/index.html`, 'utf8');
  assert.equal((html.match(/src="\/analytics.js"/g) || []).length, 1, route);
}
const home = await readFile('public/index.html', 'utf8');
for (const id of ['burning-bridges-ai-generator', 'photo-preview', 'photo-upload']) {
  assert.match(home, new RegExp(`<[^>]+data-clarity-mask="true"[^>]+id="${id}"`));
}
console.log('PASS: production-only analytics, single initialization, sanitized GA4 URLs, query-page Clarity exclusion, photo masking, all pages covered');
