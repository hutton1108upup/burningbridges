import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const catalog = JSON.parse(await readFile('public/video-projects.json', 'utf8'));
const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const sitemap = await readFile('public/sitemap.xml', 'utf8');
const hub = await readFile('public/blog/index.html', 'utf8');
const routes = new Set();

test('every topic has a how-to guide and distinct indexed articles with reciprocal detail links', async () => {
  for (const project of catalog.projects) {
    assert.ok(project.guides.how, `Missing how-to: ${project.id}`);
    assert.ok(Object.keys(project.guides).every(type => ['free','how','what'].includes(type)));
    assert.deepEqual(Object.keys(project.guides).sort(), ['free','how','what']);
    const group = [project.url, ...Object.values(project.guides)];
    for (const route of group) {
      assert.ok(!routes.has(route), `Route belongs to multiple topics: ${route}`);
      routes.add(route);
      assert.ok(config.routes.includes(route), route);
      assert.ok(sitemap.includes(`<loc>${config.origin}${route}</loc>`), route);
      const html = await readFile(`public${route}/index.html`, 'utf8');
      const blocks = [...html.matchAll(/<!-- TREND GUIDES START -->([\s\S]*?)<!-- TREND GUIDES END -->/g)];
      assert.equal(blocks.length, 1, route);
      assert.equal([...html.matchAll(/<section\b[^>]*class="trend-related(?:\s[^"]*)?"/g)].length, 1, `Duplicate topic panel: ${route}`);
      const linked = [...blocks[0][1].matchAll(/href="([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(linked.sort(), group.filter(other => other !== route).sort(), route);
      const styles = [...html.matchAll(/<link\b(?=[^>]*rel="stylesheet")(?=[^>]*href="([^"]+)")[^>]*>/g)].map(match => match[1]);
      assert.equal(styles.filter(style => style === '/trend-guides.css').length, 1, route);
      assert.ok(styles.indexOf('/trend-guides.css') < styles.indexOf('/site-theme.css'), route);
    }
  }
});

test('Blog filter metadata includes every topic article exactly once with its correct intent', () => {
  for (const project of catalog.projects) for (const [type, route] of Object.entries(project.guides)) {
    const cards = [...hub.matchAll(/<a\b[^>]*class="guide-hub-card"[^>]*>/g)].map(match => match[0]).filter(card => card.includes(`href="${route}"`));
    assert.equal(cards.length, 1, route);
    assert.ok(cards[0].includes(`data-guide-type="${type}"`), route);
    assert.ok(cards[0].includes(`data-guide-topic="${project.id}"`), route);
  }
});

test('topic pages do not expose worktree-specific generation restrictions as product copy', async () => {
  for (const project of catalog.projects.filter(project => project.id !== 'drake-burning-bridges')) {
    const html = await readFile(`public${project.url}/index.html`, 'utf8');
    for (const route of [project.url, ...Object.values(project.guides)]) {
      const content = route === project.url ? html : await readFile(`public${route}/index.html`, 'utf8');
      assert.doesNotMatch(content, /generation is not included|paid plans cover the separate|buying (?:them|those credits) does not unlock|this is a local preview, not a dance generator/i, route);
    }
  }
});


test('main Nicole pages survive integration and Cheba uses the PR 51 canonical route', () => {
  const nicole = catalog.projects.find(project => project.url === '/examples/nicole-kidman-dance-ai-video-maker');
  assert.ok(nicole);
  assert.equal(nicole.guides.how, '/blog/how-to-make-nicole-kidman-dance-ai-video');
  const cheba = catalog.projects.find(project => project.url === '/examples/cheba-man-ai-dance-maker');
  assert.equal(cheba.guides.how, '/blog/how-to-make-cheba-man-ai-dance-video');
  const oldRoute = '/blog/how-to-make-cheba-man-ai-video';
  assert.ok(!config.routes.includes(oldRoute));
  assert.ok(!sitemap.includes(`<loc>${config.origin}${oldRoute}</loc>`));
  assert.ok(!hub.includes(`href="${oldRoute}"`));
});
