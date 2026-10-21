import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Examples cards and structured data follow publication order, newest first', async () => {
  const catalog = JSON.parse(await readFile('public/video-projects.json','utf8'));
  const html = await readFile('public/examples/index.html','utf8');
  const dates = new Map(catalog.projects.map(project => [project.url, Date.parse(project.publishedAt)]));
  assert.ok([...dates.values()].every(Number.isFinite), 'Every project needs a publication date');
  const cards = [...html.matchAll(/<article class="video-project-card"[\s\S]*?<h2><a href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(cards.length, catalog.projects.length);
  assert.equal(new Set(cards).size, cards.length);
  for (let i = 1; i < cards.length; i++) {
    assert.ok(dates.get(cards[i - 1]) >= dates.get(cards[i]), `${cards[i]} must not follow an older page`);
  }
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(schema.mainEntity.itemListElement.map(item => new URL(item.url).pathname), cards);
  assert.deepEqual(schema.mainEntity.itemListElement.map(item => item.position), cards.map((_, i) => i + 1));
});

test('every catalog project is reachable from the directory and each page menu', async () => {
  const catalog = JSON.parse(await readFile('public/video-projects.json','utf8'));
  const config = JSON.parse(await readFile('site.config.json','utf8'));
  const directory = await readFile('public/examples/index.html','utf8');
  const schema = JSON.parse(directory.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.mainEntity.itemListElement.length,catalog.projects.length);
  for (const route of config.routes) {
    const html = await readFile(`public${route==='/'?'':route}/index.html`,'utf8');
    const nav = html.match(/<!-- VIDEO NAV START -->([\s\S]*?)<!-- VIDEO NAV END -->/)?.[1];
    assert.ok(nav,`Missing menu: ${route}`);
    for (const project of catalog.projects) {
      assert.ok(nav.includes(`href="${project.url}"`),`${route}: ${project.id}`);
      assert.ok(directory.includes(`data-video-category="${project.category}"`));
      assert.ok(directory.includes(`href="${project.url}"`));
    }
  }
});

test('moving the reference library preserves all clips on the Drake detail page', async () => {
  const directory = await readFile('public/examples/index.html','utf8');
  const detail = await readFile('public/burning-bridges-video-ai/index.html','utf8');
  assert.equal((directory.match(/<video\b/g)||[]).length,0);
  assert.equal((detail.match(/<video data-reference-player/g)||[]).length,3);
  assert.equal((detail.match(/id="reference-library"/g)||[]).length,1);
  for(const filename of ['7deb9d22ede5-burning-bridges-template-16x9-crop.mp4','6d6c14be4081-burning-bridges-example-1.mp4','395f7931679b-burning-bridges-example-2.mp4']) assert.ok(detail.includes(filename));
});
