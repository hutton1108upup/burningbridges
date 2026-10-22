"""Local acceptance for topic guides, Blog filters and retained photo planners. No paid jobs."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:3084')
parser.add_argument('--output', required=True)
parser.add_argument('--interactive-only', action='store_true', help='Repeat interaction checks without the completed layout sweep.')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
catalog = json.loads((root/'public/video-projects.json').read_text(encoding='utf-8'))
topics = catalog['projects']
routes = ['/blog'] + [r for t in topics for r in [t['url'], *t['guides'].values()]]
results, errors = [], []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: errors.append({'url':page.url, 'error':str(error)}))
    for index, route in enumerate([] if args.interactive_only else routes):
        page.set_viewport_size({'width':1280,'height':900})
        response = page.goto(args.base_url+route, wait_until='networkidle')
        assert response.status == 200, route
        page.evaluate('document.fonts.ready')
        assert page.locator('h1').count() == 1, route
        for width in [320,390,768,1280]:
            page.set_viewport_size({'width':width,'height':900})
            page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (route,width,'horizontal overflow')
            group = page.locator('.trend-related')
            if group.count():
                assert group.locator('a').count()==3, route
                assert group.evaluate('(e)=>!e.closest("article.shot-card, article.step, article.toc-info-card")'), route
            results.append({'route':route,'width':width,'pass':True})
        if route != '/blog':
            for anchor in page.locator('main a[href^="#"]').all():
                assert page.locator('[id="'+anchor.get_attribute('href')[1:]+'"]').count(), (route,anchor.get_attribute('href'))
        if route in ['/blog','/blog/gas-station-dance-ai-trend-explained','/blog/how-to-make-alors-on-danse-ai-video','/blog/flying-entrance-ai-video-free']:
            page.screenshot(path=str(out/(route.strip('/').replace('/','-')+'-desktop.png')),full_page=True)
            page.set_viewport_size({'width':390,'height':900})
            page.screenshot(path=str(out/(route.strip('/').replace('/','-')+'-mobile.png')),full_page=True)
        if (index+1)%15==0: print(f'Checked {index+1}/{len(routes)} pages at four widths',flush=True)
        (out/'responsive.json').write_text(json.dumps(results,indent=2),encoding='utf-8')

    # Both dimensions combine, while clearing them restores the original catalog.
    page.goto(args.base_url+'/blog',wait_until='networkidle')
    all_count = page.locator('.guide-hub-card').count()
    for type in ['what','how','free']:
        page.locator(f'[data-guide-filter="{type}"]').click()
        assert page.locator('.guide-hub-card:visible').count()==len(topics), type
        for topic in topics:
            page.locator('#guide-topic').select_option(topic['id'])
            cards=page.locator('.guide-hub-card:visible')
            assert cards.count()==1,(type,topic['id'])
            assert cards.first.get_attribute('href')==topic['guides'][type]
        page.locator('#guide-topic').select_option('all')
    page.locator('[data-guide-filter="all"]').click()
    assert page.locator('.guide-hub-card:visible').count()==all_count
    for topic in topics:
        page.locator('#guide-topic').select_option(topic['id'])
        assert page.locator('.guide-hub-card:visible').count()==3,topic['id']
    page.locator('#guide-topic').select_option('all')
    page.set_viewport_size({'width':1280,'height':900})
    page.screenshot(path=str(out/'blog-overview.png'))

    # Use a browser-generated 600px image as a neutral fixture for all minimum-size rules.
    png=page.evaluate('''() => {const c=document.createElement('canvas');c.width=c.height=600;
        const x=c.getContext('2d');x.fillStyle='#888';x.fillRect(0,0,600,600);return c.toDataURL('image/png').split(',')[1]}''')
    import base64
    fixture={'name':'photo-check.png','mimeType':'image/png','buffer':base64.b64decode(png)}
    for topic in topics:
        if topic['id']=='drake-burning-bridges': continue  # Actual generation is covered by existing local tests.
        page.goto(args.base_url+topic['url'],wait_until='networkidle')
        page.set_viewport_size({'width':390,'height':900})
        for field in page.locator('main input[type=file]').all():
            if field.is_disabled():continue
            field.set_input_files(fixture)
            page.wait_for_function('[...document.querySelectorAll("main img")].some(i=>i.src.startsWith("blob:"))')
        images=page.locator('main img[src^="blob:"]')
        assert images.count()>0,topic['id']
        inputs=page.locator('main input[type=file]')
        enabled=next(field for field in inputs.all() if not field.is_disabled())
        previous=images.first.get_attribute('src')
        enabled.set_input_files({**fixture,'name':'replacement.png'})
        page.wait_for_function('(old)=>![...document.querySelectorAll("main img")].some(i=>i.src===old)',arg=previous)
        removers=page.locator('main [data-photo-remove], main [data-remove], main .remove-photo, main .remove, #toc-photo-remove')
        for button in removers.all():
            if button.is_visible():button.click()
        assert page.locator('main img[src^="blob:"]').count()==0, (topic['id'],'photo cleanup')
        if topic['id']=='gas-station-dance':
            page.locator('input[name=cast][value=solo]').check(force=True)
            assert page.locator('main input[type=file]:enabled').count()==1
            page.locator('input[name=cast][value=trio]').check(force=True)
            assert page.locator('main input[type=file]:enabled').count()==3
        toggle=page.locator('.video-project-toggle:visible').first
        if toggle.count():
            toggle.click();assert toggle.get_attribute('aria-expanded')=='true'
            toggle.click();assert toggle.get_attribute('aria-expanded')=='false'
        print('Photo planner passed: '+topic['id'],flush=True)

    # A non-JS visit retains crawlable article links and usable all-guide browsing.
    context=browser.new_context(java_script_enabled=False)
    static=context.new_page();static.goto(args.base_url+'/blog')
    assert static.locator('.guide-hub-card:visible').count()==all_count
    assert not static.locator('[data-guide-filters]').is_visible()
    context.close()
    assert not errors,errors
    browser.close()

(out/'results.json').write_text(json.dumps({'responsive':results,'blog_filter_combinations':3*len(topics),'photo_planners':len(topics)-1,'no_js_fallback':True,'page_errors':errors},indent=2),encoding='utf-8')
print(f'PASS: {len(routes)} pages / {len(results)} viewport checks, Blog filters, {len(topics)-1} photo planners, no page errors',flush=True)
