import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PLANS, COSTS} from '../src/catalog.mjs';

test('pricing card video counts agree with actual plan credits and party cost', async () => {
  const html = await readFile('public/pricing/index.html', 'utf8');
  const titles = [...html.matchAll(/data-slot="card-title">\s*<h3[^>]*>(.*?)<\/h3>/gs)]
    .map(match => match[1].trim());
  const plans = ['starter', 'creator', 'studio', 'pack100', 'pack200', 'pack500'];
  assert.equal(titles.length, plans.length);
  plans.forEach((id, index) => {
    const claimed = Number(titles[index].match(/\b(\d+) Videos?\b/)?.[1]);
    assert.equal(claimed, Math.floor(PLANS[id].credits / COSTS['720']), id);
  });
});

test('Flying Entrance related-scene cards lead to those scenes, not generic pricing', async () => {
  const html = await readFile('public/flying-entrance/index.html', 'utf8');
  const related = html.match(/<div class="related">(.*?)<\/div>/s)?.[1];
  assert.ok(related);
  const destinations = [...related.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(destinations, ['/gas-station-dance-ai', '/zombie-love-story-ai', '/burning-bridges-video-ai']);
});
