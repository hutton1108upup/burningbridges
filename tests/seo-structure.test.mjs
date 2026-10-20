import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = file => readFile(file, 'utf8');
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
function* nodes(value) {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value)) yield value;
  for (const child of Object.values(value)) yield* nodes(child);
}

test('homepage video list resolves to one complete party video entity and has a website identity', async () => {
  const data = schemas(await read('public/index.html'));
  const all = [...nodes(data)];
  const videos = all.filter(x => x['@type'] === 'VideoObject');
  assert.equal(new Set(videos.map(x => x.contentUrl)).size, videos.length, 'Duplicated video definitions');
  for (const video of videos) {
    for (const field of ['name', 'thumbnailUrl', 'uploadDate', 'contentUrl']) assert.ok(video[field], field);
    assert.ok(Number.isFinite(Date.parse(video.uploadDate)));
  }
  const list = data.find(x => x['@type'] === 'ItemList');
  const id = list.itemListElement[0].item['@id'];
  assert.ok(id);
  assert.equal(videos.filter(x => x['@id'] === id).length, 1);
  assert.equal(data.filter(x => x['@type'] === 'WebSite').length, 1);
  assert.equal(data.some(x => x['@type'] === 'BreadcrumbList'), false);
});

test('guide collection lists exactly the visible guide cards in order', async () => {
  const html = await read('public/blog/index.html');
  const links = [...html.matchAll(/<a\b[^>]*class="guide-hub-card"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  const collection = schemas(html).find(x => x['@type'] === 'CollectionPage');
  assert.ok(collection);
  assert.deepEqual(collection.mainEntity.itemListElement.map(x => new URL(x.url).pathname), links);
  assert.deepEqual(collection.mainEntity.itemListElement.map(x => x.position), links.map((_, i) => i + 1));
});

test('all catalog details have matching visible breadcrumb URLs and no skipped heading levels', async () => {
  const catalog = JSON.parse(await read('public/video-projects.json'));
  for (const project of catalog.projects) {
    const html = await read(`public${project.url}/index.html`);
    const nav = html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav, project.url);
    const parents = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m => m[1]);
    const crumbs = schemas(html).filter(x => x['@type'] === 'BreadcrumbList');
    assert.equal(crumbs.length, 1, project.url);
    assert.deepEqual(crumbs[0].itemListElement.map(x => new URL(x.item).pathname), [...parents, project.url]);
    const headings = [...html.matchAll(/<h([1-6])\b/g)].map(m => Number(m[1]));
    assert.equal(headings.filter(x => x === 1).length, 1, project.url);
    headings.forEach((level, i) => {
      if (i) assert.ok(level <= headings[i - 1] + 1, `Skipped heading on ${project.url}`);
    });
  }
});
