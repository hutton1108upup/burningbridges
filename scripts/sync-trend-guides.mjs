import {readFile, writeFile} from 'node:fs/promises';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const marker = /<!-- TREND GUIDES START -->[\s\S]*?<!-- TREND GUIDES END -->/;
const labels = {what:'WHAT IS', how:'HOW TO', free:'FREE OPTIONS', detail:'REFERENCES & PHOTO'};

// The project catalog owns topic membership; titles come from each actual page.
export async function syncTrendGuides(catalog, config) {
  const claimed = new Set();
  for (const project of catalog.projects) {
    if (!project.guides?.how || Object.keys(project.guides).some(type => !['what','how','free'].includes(type)) || Object.values(project.guides).some(route => typeof route !== 'string' || !route)) throw Error(`Invalid guide group: ${project.id}`);
    const entries = Object.entries(project.guides).map(([type, route]) => ({type, route}));
    entries.push({type:'detail', route:project.url});
    for (const entry of entries) {
      if (!config.routes.includes(entry.route) || claimed.has(entry.route)) throw Error(`Invalid or shared topic route: ${entry.route}`);
      claimed.add(entry.route);
      entry.file = `public${entry.route}/index.html`;
      entry.html = await readFile(entry.file, 'utf8');
      const title = entry.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
      if (!title) throw Error(`Missing guide heading: ${entry.route}`);
      entry.title = title.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    }
    for (const entry of entries) {
      const pt = /<html[^>]*lang="pt-BR"/.test(entry.html);
      const localLabels = pt ? {what:'O QUE É',how:'COMO FAZER',free:'OPÇÕES GRÁTIS',detail:'GERAR VÍDEO'} : labels;
      const detailLabel = pt ? localLabels.detail : project.id === 'drake-burning-bridges' ? 'MAKE A PARTY VIDEO' : labels.detail;
      const group = `<section class="trend-related" aria-label="${escape(project.name)} ${pt ? 'guias' : 'guides'}"><h2>${pt ? 'Explore este tema' : 'Explore this topic'}</h2><div class="trend-guide-links">${entries.filter(other => other !== entry).map(other => `<a href="${escape(other.route)}"><span>${other.type === 'detail' ? detailLabel : localLabels[other.type]}</span><strong>${escape(other.title)}</strong></a>`).join('')}</div></section>`;
      const block = `<!-- TREND GUIDES START -->${group}<!-- TREND GUIDES END -->`;
      let html = entry.html;
      html = html.replace(marker, '');
      // Detail pages also contain small <article> cards. Never insert the whole topic group inside one.
      html = html.replace(/<section\b(?=[^>]*class="trend-related(?: section wrap)?")[^>]*>[\s\S]*?<\/section>/g, '');
      if (entry.type !== 'detail' && /<article\b[^>]*class="guide-article(?:\s|"|$)/.test(html)) html = html.replace('</article>', `${block}</article>`);
      else html = html.replace('</main>', `${block}</main>`);
      if (!html.includes('href="/trend-guides.css"')) {
        const theme = /<link\b(?=[^>]*href="\/site-theme.css")[^>]*>/;
        if (!theme.test(html)) throw Error(`Missing shared theme: ${entry.route}`);
        html = html.replace(theme, match => `<link rel="stylesheet" href="/trend-guides.css">\n${match}`);
      }
      if (!html.includes('<!-- TREND GUIDES START -->')) throw Error(`Guide group not inserted: ${entry.route}`);
      if (html !== entry.html) await writeFile(entry.file, html);
    }
  }
}
