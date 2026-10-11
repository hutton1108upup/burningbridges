import {readFile, access, readdir} from 'node:fs/promises';
import path from 'node:path';
const manifest = JSON.parse(await readFile('site.config.json','utf8'));
let count = 0;
async function walk(dir) {
  for (const item of await readdir(dir,{withFileTypes:true})) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) await walk(file);
    else if (file.endsWith('.html')) {
      count++;
      const html = await readFile(file,'utf8');
      const canonical = html.match(/<link\b(?=[^>]*rel="canonical")(?=[^>]*href="([^"]+)")[^>]*>/)?.[1];
      if (!canonical?.startsWith(manifest.origin)) throw Error(`Wrong canonical in ${file}`);
      for (const match of html.matchAll(/(?:src|poster|href)="(\/[^"]+)"/g)) {
        const ref = match[1].split('#')[0].split('?')[0];
        if (!ref) continue;
        await access(path.join('public',ref));
      }
      if (/self\.__next_f|<script[^>]+src="https?:|<script[^>]+src="\/_next/.test(html)) throw Error(`Original runtime left in ${file}`);
    }
  }
}
await walk('public');
for (const ref of manifest.assets) await access(path.join('public',ref));
for (const route of manifest.routes) await access(path.join('public',route,'index.html'));
if (count !== manifest.routes.length+1) throw Error('Unexpected public HTML page count'); // Includes 404.html.
for (const media of Object.values(JSON.parse(await readFile('public/media.json','utf8')))) await access(path.join('public',media));
console.log(`PASS: ${manifest.routes.length} pages + 404, ${manifest.assets.length} local assets, canonical URLs, links and runtime isolation`);
