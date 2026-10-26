import test from 'node:test';
import assert from 'node:assert/strict';
import {findVisibleMediaAttribution} from '../scripts/media-label-policy.mjs';

test('media provenance labels are caught in visible text and accessibility labels', () => {
  for (const html of ['<p>Source: Copy That Video / TikTok</p>','<figcaption>Third-party AI reference</figcaption>','<span>@theburnerfromhe11</span>','<img alt="Reference from NowStarring">']) {
    assert.ok(findVisibleMediaAttribution(html), html);
  }
});
test('research citations, input-photo instructions and support email are unaffected', () => {
  for (const html of ['<p>Source: Library of Congress, Michael Jackson’s Thriller.</p>','<p>Choose a clear source photo.</p>','<a href="mailto:support@burningbridgesaivideo.pro">support@burningbridgesaivideo.pro</a>','<p>Third-party scripts are described in our privacy policy.</p>']) {
    assert.equal(findVisibleMediaAttribution(html), undefined, html);
  }
});
test('internal asset paths and non-visible metadata do not become public source labels', () => {
  assert.equal(findVisibleMediaAttribution('<video src="/assets/nowstarring/example.mp4"></video><script type="application/ld+json">{"source":"Copy That Video"}</script>'), undefined);
});
