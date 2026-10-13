import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = await readFile('public/guides.js', 'utf8');
function copyFixture(writeText) {
  let click;
  const status = {textContent:''};
  const text = {textContent:'A permitted portrait and an original scene.', focus(){this.focused=true;}};
  const selection = {removeAllRanges(){this.cleared=true;},addRange(range){this.range=range;}};
  const button = {dataset:{copyPrompt:'prompt'},parentElement:{querySelector:()=>status},addEventListener(event,handler){assert.equal(event,'click');click=handler;}};
  const context = {navigator:{clipboard:{writeText}},window:{getSelection:()=>selection},document:{querySelectorAll:()=>[button],getElementById:()=>text,createRange:()=>({selectNodeContents(node){this.node=node;}})}};
  vm.runInNewContext(source, context);
  return {click,status,text,selection};
}
test('prompt copying is user-triggered and writes the complete visible text', async () => {
  const writes=[];
  const fixture=copyFixture(async text=>writes.push(text));
  assert.equal(writes.length,0);
  await fixture.click();
  assert.deepEqual(writes,[fixture.text.textContent]);
  assert.match(fixture.status.textContent,/Copied/);
});
test('denied clipboard access selects the prompt and gives a manual-copy instruction', async () => {
  const fixture=copyFixture(async()=>{throw Error('Permission denied');});
  await fixture.click();
  assert.equal(fixture.selection.range.node,fixture.text);
  assert.equal(fixture.text.focused,true);
  assert.match(fixture.status.textContent,/copy it manually/);
});
test('the sitemap covers exactly the public routes, and the hub exposes every new resource', async () => {
  const config=JSON.parse(await readFile('site.config.json','utf8'));
  const sitemap=await readFile('public/sitemap.xml','utf8');
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
  assert.deepEqual(urls.sort(),config.routes.map(route=>config.origin+route).sort());
  assert.equal(new Set(urls).size,urls.length);
  const hub=await readFile('public/blog/index.html','utf8');
  for (const route of ['/burning-bridges-ai-prompt','/guides/photo-guide','/blog/how-to-make-burning-bridges-video','/blog/burning-bridges-ai-tools-compared','/examples','/guides/troubleshooting','/burning-bridges-music-video-ai','/blog/burning-bridges-ai-free']) {
    assert.ok(hub.includes(`href="${route}"`),route);
    const html=await readFile(`public${route}/index.html`,'utf8');
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.mainEntityOfPage,config.origin+route);
    assert.ok(html.includes(`<h1>${schema.headline}</h1>`));
  }
});
