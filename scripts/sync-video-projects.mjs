import {readFile, writeFile, access} from 'node:fs/promises';
import {syncPageSchema} from './sync-page-schema.mjs';
import {syncTrendGuides} from './sync-trend-guides.mjs';
const catalog = JSON.parse(await readFile('public/video-projects.json', 'utf8'));
const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categoryIds = new Set(catalog.categories.map(c => c.id));
if (categoryIds.size !== catalog.categories.length || new Set(catalog.projects.map(p=>p.id)).size !== catalog.projects.length) throw Error('Duplicate catalog IDs');
for (const project of catalog.projects) {
  if (!categoryIds.has(project.category) || !config.routes.includes(project.url)) throw Error('Invalid project category or route');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(project.publishedAt ?? '') || !Number.isFinite(Date.parse(project.publishedAt))) throw Error(`Invalid publication date: ${project.id}`);
  await access('public'+project.image);
}
// Keep publication order independent of category/navigation order and later edits.
const newestProjects = [...catalog.projects].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
const categoryName = id => catalog.categories.find(c => c.id === id).name;
const homeDirectory = `<section class="home-trend-directory" aria-labelledby="home-trends-heading"><div class="home-trend-directory-inner"><h2 id="home-trends-heading">Explore AI Video Trends</h2><p class="home-trend-intro">Explore video ideas across music, dance, football and stories. Choose a scene, prepare your photos and follow its creation guide.</p><div class="home-trend-groups">${catalog.categories.map(category=>`<section aria-labelledby="home-trend-${escape(category.id)}"><h3 id="home-trend-${escape(category.id)}">${escape(category.name)}</h3><ul>${catalog.projects.filter(p=>p.category===category.id).map(p=>`<li><a href="${escape(p.url)}">${escape(p.name)}</a><span class="home-trend-status">${escape(p.label)}</span><p>${escape(p.description)}</p></li>`).join('')}</ul></section>`).join('')}</div><a class="home-trend-all" href="/examples">Browse all video references →</a></div></section>`;
const dropdown = `<div class="video-project-nav"><a href="/examples">Trends</a><button type="button" class="video-project-toggle" aria-label="Show video categories" aria-expanded="false"><svg class="video-project-chevron" aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button><div class="video-project-menu" hidden><a class="video-project-all" href="/examples">Explore all trends →</a>${catalog.categories.map(category=>`<div class="video-project-group"><strong>${escape(category.name)}</strong>${catalog.projects.filter(p=>p.category===category.id).map(p=>`<a href="${escape(p.url)}">${escape(p.name)}</a>`).join('')}</div>`).join('')}</div></div>`;
const filters = `<div class="video-filters" role="group" aria-label="Filter video categories"><button type="button" data-video-filter="all" aria-pressed="true">All trends</button>${catalog.categories.map(c=>`<button type="button" data-video-filter="${escape(c.id)}" aria-pressed="false">${escape(c.name)}</button>`).join('')}</div>`;
const cards = `<div class="video-project-grid">${newestProjects.map(p=>`<article class="video-project-card" data-video-category="${escape(p.category)}"><a class="video-project-image" href="${escape(p.url)}" tabindex="-1" aria-hidden="true"><img src="${escape(p.image)}" alt="${escape(p.imageAlt)}" width="640" height="400" loading="lazy"></a><div class="video-project-copy"><p class="video-category-label">${escape(categoryName(p.category))}</p><h2><a href="${escape(p.url)}">${escape(p.name)}</a></h2><p>${escape(p.description)}</p><div class="video-project-bottom"><span>${escape(p.label)}</span><a href="${escape(p.url)}">Explore trend <span aria-hidden="true">↗</span></a></div></div></article>`).join('')}</div><p class="video-results" role="status" aria-live="polite">${catalog.projects.length} trends</p>`;
for (const route of config.routes) {
  const file=`public${route==='/'?'':route}/index.html`;
  let html=await readFile(file,'utf8');
  if (!html.includes('src="/video-navigation.js"')) html=html.replace('</body>','<script defer src="/video-navigation.js"></script>\n</body>');
  if (!html.includes('href="/video-navigation.css"')) html=html.replace('</head>','<link rel="stylesheet" href="/video-navigation.css">\n</head>');
  html=html.replace(/<header\b[\s\S]*?<\/header>/,header=>{
    if (header.includes('<!-- VIDEO NAV START -->')) return header.replace(/<!-- VIDEO NAV START -->[\s\S]*?<!-- VIDEO NAV END -->/g,'<!-- VIDEO NAV START -->'+dropdown+'<!-- VIDEO NAV END -->');
    const old=/<a\b[^>]*href="\/examples"[^>]*>[\s\S]*?<\/a>/g;
    const entry='<!-- VIDEO NAV START -->'+dropdown+'<!-- VIDEO NAV END -->';
    return old.test(header)?header.replaceAll(old,entry):header.replace(/<nav\b[^>]*>/,match=>match+entry);
  });
  if(route==='/examples') {
    html=html.replace(/<!-- VIDEO CATALOG START -->[\s\S]*?<!-- VIDEO CATALOG END -->/,'<!-- VIDEO CATALOG START -->'+filters+cards+'<!-- VIDEO CATALOG END -->');
    const schema={'@context':'https://schema.org','@type':'CollectionPage',headline:'Explore AI Video Trends',description:'Explore AI video trends across music, dance, football and stories. Watch references, prepare photos and check which video templates are supported.',mainEntityOfPage:config.origin+'/examples',mainEntity:{'@type':'ItemList',itemListElement:newestProjects.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:config.origin+p.url}))}};
    html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  }
  if(route==='/') {
    const marker = /<!-- HOME VIDEO DIRECTORY START -->[\s\S]*?<!-- HOME VIDEO DIRECTORY END -->/;
    if (!marker.test(html)) throw Error('Missing homepage video directory markers');
    html=html.replace(marker,'<!-- HOME VIDEO DIRECTORY START -->'+homeDirectory+'<!-- HOME VIDEO DIRECTORY END -->');
  }
  await writeFile(file,html);
}
await syncPageSchema(catalog, config);
await syncTrendGuides(catalog, config);
console.log(`Synced ${catalog.projects.length} projects across ${config.routes.length} page navigation menus, detail breadcrumbs and guide hub schema`);
