import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
// Only the generated output under this project may be cleared.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw Error('Invalid output directory');
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
const localOnly = new Set(['site-data.json','reference-assets.json']);
await cp(path.join(root, 'public'), output, {
  recursive:true,
  filter: source => !localOnly.has(path.basename(source)),
});
let revision = process.env.GITHUB_SHA || 'uncommitted';
try {revision = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();} catch { /* First local build before Git initialization. */ }
await writeFile(path.join(output,'release.json'),JSON.stringify({revision,builtAt:new Date().toISOString(),site:'https://burningbridgesaivideo.pro',mode:'commerce-worker'},null,2)+'\n');
console.log(`Build complete: dist/ (commerce Worker assets, revision ${revision})`);
