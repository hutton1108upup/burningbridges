"""Verify Hero -> required photos -> Pricing without submitting paid tasks."""
import argparse
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:4197')
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
catalog = json.loads((root / 'public/video-projects.json').read_text(encoding='utf-8'))
pages = [{'id': 'home', 'url': '/'}] + catalog['projects']
counts = {'babydoll-dance': (3, 2), 'nicole-kidman-dance': (2, 1),
          'alors-on-danse': (2, 0), 'smalltown-boy': (2, 0),
          'flying-entrance': (2, 0), 'zombie-pet': (2, 0),
          'zombie-love-story': (2, 0), 'gas-station-dance': (3, 0)}
results, errors, writes = [], [], []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Neutral 600px fixture satisfies existing 300px/512px minimum-size rules.
    fixture_page = browser.new_page()
    encoded = fixture_page.evaluate('''() => {const c=document.createElement('canvas');c.width=c.height=600;
      c.getContext('2d').fillRect(0,0,600,600);return c.toDataURL('image/png').split(',')[1]}''')
    fixture_page.close()
    fixture = {'name': 'portrait.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(encoded)}
    for entry in pages:
        context = browser.new_context()
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.dismiss())
        page.on('request', lambda request: writes.append(request.url) if request.method == 'POST'
                and ('/api/generation/' in request.url or '/api/checkout' in request.url) else None)
        # Verify the navigation destination without starting checkout or rendering.
        page.route(args.base_url + '/pricing', lambda route: route.fulfill(
            status=200, content_type='text/html', body='<h1>Pricing navigation verified</h1>'))
        page.goto(args.base_url + entry['url'], wait_until='domcontentloaded')
        page.evaluate('Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))])')
        workspace = page.locator('[data-generation-workspace]')
        workspace_id = workspace.get_attribute('id')
        hero = page.locator('[data-hero-generate]')
        assert hero.count(), entry['id']
        for link in hero.all():
            assert link.get_attribute('href') == '#' + workspace_id, entry['id']
        hero.first.click()
        page.wait_for_url(args.base_url + entry['url'] + '#' + workspace_id)
        page.wait_for_function("id => {const y=document.getElementById(id).getBoundingClientRect().top;return y>=0&&y<300}", arg=workspace_id)
        action = workspace.locator('[data-generate-video]').first
        assert action.inner_text().strip() == 'Generate video', entry['id']
        inputs = workspace.locator('input[type=file]')
        expected_count, optional_count = counts.get(entry['id'], (1, 0))
        assert inputs.count() == expected_count, entry['id']
        assert workspace.locator('input[data-generation-optional]').count() == optional_count, entry['id']
        required = workspace.locator('input[type=file]:not([data-generation-optional])')
        feedback = workspace.locator('[data-generation-feedback]')

        def blocked():
            action.click()
            assert '/pricing' not in page.url, entry['id']
            assert feedback.inner_text(), entry['id']

        def select(input):
            input.set_input_files(fixture)
            input.evaluate("el => new Promise((resolve,reject) => {const end=Date.now()+5000;const timer=setInterval(()=>{if(el.dataset.generationReady==='true'){clearInterval(timer);resolve()}else if(Date.now()>end){clearInterval(timer);reject(Error('Photo not ready'))}},20)})")

        blocked()
        first = required.first
        first.set_input_files({'name': 'bad.txt', 'mimeType': 'text/plain', 'buffer': b'bad'})
        blocked()
        first.set_input_files({'name': 'broken.png', 'mimeType': 'image/png', 'buffer': b'broken'})
        page.wait_for_function("![...document.querySelectorAll('[data-generation-workspace] input[type=file]')].some(i=>i.dataset.generationReady==='true')")
        blocked()
        # An optional side portrait must never satisfy the required lead role.
        if optional_count:
            optional = workspace.locator('input[data-generation-optional]').first
            select(optional)
            blocked()
        for i, input in enumerate(required.all()):
            select(input)
            if i < required.count() - 1:
                blocked()
        # Replacement must reset readiness synchronously, including invalid replacements.
        first.set_input_files({'name': 'bad.txt', 'mimeType': 'text/plain', 'buffer': b'bad'})
        blocked()
        select(first)
        remove = workspace.locator('[data-photo-remove], [data-remove], .remove, .remove-photo, #remove-photo, #toc-photo-remove').first
        remove.click()
        blocked()
        select(first)

        if entry['id'] == 'gas-station-dance':
            workspace.locator('input[name=cast][value=solo]').check()
            assert inputs.evaluate_all('(xs)=>xs.filter(x=>!x.disabled).length') == 1
            workspace.locator('input[name=cast][value=trio]').check()
            blocked()
            for input in required.all()[1:]:
                select(input)
        if entry['id'] == 'alors-on-danse':
            # Existing drag-and-drop uploads do not populate input.files; use validated readiness.
            remove.click()
            blocked()
            page.locator('.portrait-slot').first.evaluate('''(slot, data) => {
              const bytes=Uint8Array.from(atob(data), c=>c.charCodeAt(0));
              const transfer=new DataTransfer();transfer.items.add(new File([bytes],'dropped.png',{type:'image/png'}));
              slot.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));
            }''', encoded)
            first.evaluate("el => new Promise(resolve=>{const t=setInterval(()=>{if(el.dataset.generationReady==='true'){clearInterval(t);resolve()}},20)})")
        for width in [320, 390, 768, 1280]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (entry['id'], width)
        if entry['id'] in ['rumpelstiltskin', 'alors-on-danse', 'gas-station-dance', 'babydoll-dance']:
            workspace.scroll_into_view_if_needed()
            page.screenshot(path=str(out / (entry['id'] + '-desktop.png')))
            page.set_viewport_size({'width': 390, 'height': 900})
            workspace.scroll_into_view_if_needed()
            page.screenshot(path=str(out / (entry['id'] + '-mobile.png')))
        action.click()
        page.wait_for_url(args.base_url + '/pricing')
        # Both optional-photo pages must also accept just the required lead.
        # Gas Station must support a one-photo solo in addition to the trio tested above.
        if optional_count or entry['id'] == 'gas-station-dance':
            page.goto(args.base_url + entry['url'], wait_until='domcontentloaded')
            if entry['id'] == 'gas-station-dance':
                workspace.locator('input[name=cast][value=solo]').check()
                assert inputs.evaluate_all('(xs)=>xs.filter(x=>!x.disabled).length') == 1
            select(required.first)
            action.click()
            page.wait_for_url(args.base_url + '/pricing')
        if entry['id'] in ['home', 'drake-burning-bridges']:
            assert page.evaluate("new Promise((resolve,reject)=>{const r=indexedDB.open('burning-bridges-drafts',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('drafts').objectStore('drafts').get('current');q.onsuccess=()=>{resolve(Boolean(q.result?.blob));db.close()};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error)})"), entry['id']
        results.append({'id': entry['id'], 'route': entry['url'], 'inputs': expected_count,
                        'optional': optional_count, 'viewport_checks': 4, 'flow': 'pass'})
        context.close()
        print('PASS', entry['id'], flush=True)
    browser.close()
assert not errors, errors
assert not writes, writes
(out / 'results.json').write_text(json.dumps({'pages': results, 'errors': errors, 'paid_requests': writes}, indent=2), encoding='utf-8')
print('PASS', len(results), 'generation flows,', len(results) * 4, 'viewport checks; no paid tasks submitted')
