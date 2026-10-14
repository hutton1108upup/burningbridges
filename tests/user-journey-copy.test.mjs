import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GENERATION_PROFILE} from '../src/generation-policy.mjs';
test('the public photo form exposes only the supported provider format and resolution',async()=>{
 const home=await readFile('public/index.html','utf8');
 for(const [id,expected] of [['format',['16:9']],['resolution',['720']]]){
  const select=home.match(new RegExp(`<select\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/select>`))[1];
  assert.deepEqual([...select.matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(m=>m[1]),expected);
 }
 assert.equal(GENERATION_PROFILE.aspectRatio,'16:9');assert.equal(GENERATION_PROFILE.height,720);
 assert.match(home,/100 credits per generation/);
});
test('the four-step guide retains the Drake title and optional external route',async()=>{
 const html=await readFile('public/blog/how-to-make-burning-bridges-video/index.html','utf8');
 assert.ok(html.includes('<h1>How to Make a Drake Burning Bridges AI Video</h1>'));
 const steps=html.match(/<section id="site-steps">([\s\S]*?)<\/section>/)[1];
 assert.equal((steps.match(/<li>/g)||[]).length,4);
 for(const phrase of ['Sign in and buy credits if','100 credits per generation','Generate Video','download your video'])assert.ok(steps.includes(phrase),phrase);
 assert.ok(html.includes('Optional alternative workflows'));
});
test('homepage title and new Drake FAQ survive journey integration',async()=>{
 const home=await readFile('public/index.html','utf8');
 assert.equal(home.match(/<title>\s*([^<]+?)\s*<\/title>/)[1],'Burning Bridges AI Video Generator | Party Clip');
 for(const phrase of ['Is this an official Drake website?','How can I make a Drake Burning Bridges AI video?','id="drake-burning-bridges-trend"'])assert.ok(home.includes(phrase));
 const steps=home.match(/id="how-it-works"[\s\S]*?<\/section>/)[0];
 assert.equal((steps.match(/<article\b/g)||[]).length,4);
});
