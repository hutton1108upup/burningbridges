import {readFile, writeFile} from 'node:fs/promises';

const decode = value => value.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos|#39);/g, entity => ({
  '&amp;':'&', '&lt;':'<', '&gt;':'>', '&quot;':'"', '&apos;':"'", '&#39;':"'"
}[entity])).replace(/\s+/g, ' ').trim();
const script = value => `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
const replaceSchema = (html, type, value) => {
  let found = false;
  const updated = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (tag, raw) => {
    if (JSON.parse(raw)['@type'] !== type) return tag;
    if (found) throw Error(`Duplicate ${type} schema`);
    found = true;
    return script(value);
  });
  return found ? updated : updated.replace('</head>', `${script(value)}\n</head>`);
};

// Use visible navigation and cards as facts, so schema cannot drift from them.
export async function syncPageSchema(catalog, config) {
  for (const project of catalog.projects) {
    const file = `public${project.url}/index.html`;
    const html = await readFile(file, 'utf8');
    const nav = html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    if (!nav) throw Error(`Missing visible breadcrumb: ${project.url}`);
    const parents = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const current = nav.match(/<span\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/span>/)?.[1]
      ?? [...nav.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].at(-1)?.[1];
    if (!parents.length || !current) throw Error(`Incomplete visible breadcrumb: ${project.url}`);
    const items = parents.map((match, index) => ({
      '@type':'ListItem', position:index + 1, name:decode(match[2]), item:new URL(match[1], config.origin).href
    }));
    items.push({'@type':'ListItem', position:items.length + 1, name:decode(current), item:config.origin + project.url});
    await writeFile(file, replaceSchema(html, 'BreadcrumbList', {
      '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:items
    }));
  }

  const file = 'public/blog/index.html';
  const html = await readFile(file, 'utf8');
  const cards = [...html.matchAll(/<a\b[^>]*class="guide-hub-card"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  if (!cards.length) throw Error('Missing visible guide hub cards');
  const items = cards.map((match, index) => {
    const title = match[2].match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    if (!title || !config.routes.includes(match[1])) throw Error(`Invalid guide card: ${match[1]}`);
    return {'@type':'ListItem', position:index + 1, name:decode(title), url:config.origin + match[1]};
  });
  const headline = decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const descriptionTag = html.match(/<meta\b(?=[^>]*name="description")[^>]*>/)?.[0] ?? '';
  const description = decode(descriptionTag.match(/content="([^"]*)"/)?.[1] ?? '');
  if (!headline || !description) throw Error('Missing guide hub metadata');
  await writeFile(file, replaceSchema(html, 'CollectionPage', {
    '@context':'https://schema.org', '@type':'CollectionPage',
    '@id':config.origin + '/blog#webpage', url:config.origin + '/blog',
    name:headline, headline, description,
    mainEntity:{'@type':'ItemList', itemListElement:items}
  }));
}
