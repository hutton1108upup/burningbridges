import {readFile, access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {findWorktreeRestriction} from './product-copy-policy.mjs';

const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const developmentCopy = /preview version|not connected|not yet available|unavailable|unverified|illustrative|demo balance|sample credit|preview info|this preview|before paid generation launches|before checkout becomes available|currently paused|being connected|future generation service|flow test result|simulated flow tests|current test workflow|before (?:real )?generation is enabled|before enabling real AI generation|Test checkout/i;
const retiredPlans = /annual plans|subscribe annually|\$74\.90|1,500 credits|up to 30 videos/i;
let faqAnswers = 0;
for (const route of config.routes) {
  const file = path.join('public', route, 'index.html');
  const html = await readFile(file, 'utf8');
  assert.ok(!findWorktreeRestriction(html), `Worktree restriction leaked into product copy: ${route}`);
  assert.ok(!developmentCopy.test(html), `Development copy: ${route}`);
  assert.ok(!/\bnot yet\b|\bcoming soon\b/i.test(html), `Staged rollout copy: ${route}`);
  assert.ok(!retiredPlans.test(html), `Removed plan reappeared: ${route}`);
  assert.ok(html.includes('Prepare a Burning Bridges party-video idea with one portrait, a reference performance and a credit plan.'), `Brand copy mismatch: ${route}`);
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  for (const link of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${link[1]}"`), `Broken anchor ${route}#${link[1]}`);
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)) {
    const schema = JSON.parse(match[1]);
    if (schema['@type'] === 'FAQPage') for (const item of schema.mainEntity) {
      assert.ok(visible.includes(item.acceptedAnswer.text), `FAQ/schema mismatch: ${route} ${item.name}`);
      faqAnswers++;
    }
    if (schema['@type'] === 'HowTo') assert.equal(schema.totalTime, undefined, 'Unverified fixed task duration');
    async function verifyMedia(value, key) {
      if (typeof value === 'string' && ['contentUrl','thumbnailUrl'].includes(key)) {
        const url = new URL(value);
        assert.equal(url.origin, config.origin, `External reference media: ${value}`);
        await access(path.join('public', url.pathname));
      } else if (Array.isArray(value)) for (const item of value) await verifyMedia(item, key);
      else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) await verifyMedia(v, k);
    }
    await verifyMedia(schema, '');
  }
}
const pricing = await readFile('public/pricing/index.html', 'utf8');
assert.equal((pricing.match(/role="tab"/g) || []).length, 2);
assert.equal((pricing.match(/role="tabpanel"/g) || []).length, 2);
for (const price of ['$19','$39','$79','$5.90','$13.90','$29.90']) assert.ok(pricing.includes(price), `Missing plan ${price}`);
assert.equal((pricing.match(/>\s*Choose Plan\s*</g) || []).length, 6);
for (const route of ['/terms-of-service','/refund-policy']) {
  const html = await readFile(`public${route}/index.html`, 'utf8');
  for (const phrase of ['$19','$39','$79','$5.90','$13.90','$29.90','30 days','90 days']) assert.ok(html.includes(phrase), `Policy/plan mismatch: ${route} ${phrase}`);
}
const script = await readFile('public/local.js', 'utf8');
const commerce = await readFile('public/commerce.js', 'utf8');
// Internal error identifiers are not user-facing copy.
assert.ok(!developmentCopy.test(commerce.replace(/\b[A-Z][A-Z0-9_]+\b/g,'')), 'Development progress leaked into commerce copy');
assert.ok(!commerce.includes('commerce-mode'), 'Retired public environment banner');
assert.ok(!developmentCopy.test(script), 'Development dialog copy');
assert.ok(!script.includes('showAccount'), 'Retired placeholder account handler');
assert.ok(script.includes("location.assign('/pricing')"), 'Missing pricing entry');
console.log(`PASS: ${config.routes.length} routes use consistent public copy; ${faqAnswers} FAQ answers match schema; local media, anchors, six plans and policy amounts checked`);
