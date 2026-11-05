import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PLANS} from '../src/catalog.mjs';

test('pricing cards show catalog credits without promising a universal video count', async () => {
  const html = await readFile('public/pricing/index.html', 'utf8');
  const titles = [...html.matchAll(/data-slot="card-title">\s*<h3[^>]*>(.*?)<\/h3>/gs)]
    .map(match => match[1].trim());
  const plans = ['starter', 'creator', 'studio', 'pack100', 'pack200', 'pack500'];
  assert.equal(titles.length, plans.length);
  plans.forEach((id, index) => {
    const claimed = Number(titles[index].match(/\b([\d,]+) Credits\b/)?.[1].replaceAll(',', ''));
    assert.equal(claimed, PLANS[id].credits, id);
  });
  assert.doesNotMatch(html, /fixed 720P, 16:9 output|per 720P video/i);
  assert.match(html, /credit cost of each generation/i);
});

test('Flying Entrance related-scene cards lead to those scenes, not generic pricing', async () => {
  const html = await readFile('public/flying-entrance/index.html', 'utf8');
  const related = html.match(/<div class="related">(.*?)<\/div>/s)?.[1];
  assert.ok(related);
  const destinations = [...related.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(destinations, ['/gas-station-dance-ai', '/zombie-love-story-ai', '/burning-bridges-video-ai']);
});
