import {readFile, writeFile, access} from 'node:fs/promises';
const catalog = JSON.parse(await readFile('public/video-projects.json', 'utf8'));
const config = JSON.parse(await readFile('site.config.json', 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categoryIds = new Set(catalog.categories.map(c => c.id));
if (categoryIds.size !== catalog.categories.length || new Set(catalog.projects.map(p=>p.id)).size !== catalog.projects.length) throw Error('Duplicate catalog IDs');
for (const project of catalog.projects) {
  if (!categoryIds.has(project.category) || !config.routes.includes(project.url)) throw Error('Invalid project category or route');
  await access('public'+project.image);
}
const categoryName = id => catalog.categories.find(c => c.id === id).name;
const dropdown = `<div class="video-project-nav"><a href="/examples">Examples</a><button type="button" class="video-project-toggle" aria-label="Show video categories" aria-expanded="false"><svg class="video-project-chevron" aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button><div class="video-project-menu" hidden><a class="video-project-all" href="/examples">Explore all videos →</a>${catalog.categories.map(category=>`<div class="video-project-group"><strong>${escape(category.name)}</strong>${catalog.projects.filter(p=>p.category===category.id).map(p=>`<a href="${escape(p.url)}">${escape(p.name)}</a>`).join('')}</div>`).join('')}</div></div>`;
const filters = `<div class="video-filters" role="group" aria-label="Filter video categories"><button type="button" data-video-filter="all" aria-pressed="true">All videos</button>${catalog.categories.map(c=>`<button type="button" data-video-filter="${escape(c.id)}" aria-pressed="false">${escape(c.name)}</button>`).join('')}</div>`;
const cards = `<div class="video-project-grid">${catalog.projects.map(p=>`<article class="video-project-card" data-video-category="${escape(p.category)}"><a class="video-project-image" href="${escape(p.url)}" tabindex="-1" aria-hidden="true"><img src="${escape(p.image)}" alt="${escape(p.imageAlt)}" width="640" height="400" loading="lazy"></a><div class="video-project-copy"><p class="video-category-label">${escape(categoryName(p.category))}</p><h2><a href="${escape(p.url)}">${escape(p.name)}</a></h2><p>${escape(p.description)}</p><div class="video-project-bottom"><span>${escape(p.label)}</span><a href="${escape(p.url)}">Explore project <span aria-hidden="true">↗</span></a></div></div></article>`).join('')}</div><p class="video-results" role="status" aria-live="polite">${catalog.projects.length} projects</p>`;
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
    const schema={'@context':'https://schema.org','@type':'CollectionPage',headline:'Popular AI Video Projects',description:'Browse music, dance, football, pet stories and romance video projects.',mainEntityOfPage:config.origin+'/examples',mainEntity:{'@type':'ItemList',itemListElement:catalog.projects.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:config.origin+p.url}))}};
    html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  }
  await writeFile(file,html);
}
console.log(`Synced ${catalog.projects.length} projects across ${config.routes.length} page navigation menus`);
