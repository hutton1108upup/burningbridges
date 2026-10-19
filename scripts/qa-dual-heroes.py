"""Verify two independent App players without generation or payment requests."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://localhost:4196')
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
routes = ['/bulin-47-ai-video-maker', '/examples/cheba-man-ai-dance-maker', '/examples/alors-on-danse-ai-video-generator']
results, errors = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    for index, route in enumerate(routes):
        page.set_viewport_size({'width':1366,'height':768})
        page.goto(args.base_url+route)
        page.wait_for_load_state('networkidle')
        page.evaluate('document.fonts.ready')
        screens = page.locator('.dual-social-hero .phone-screen')
        assert screens.count()==2
        for i in range(2):
            screen = screens.nth(i)
            other = screens.nth(1-i)
            video = screen.locator('video')
            video.evaluate('(v)=>v.play()')
            page.wait_for_function('(i)=>document.querySelectorAll(".dual-social-hero video")[i].currentTime>0.3',arg=i)
            assert other.locator('video').evaluate('(v)=>v.paused')
            video.evaluate('(v)=>v.pause()')
            like = screen.locator('[data-shorts-like]')
            like.click()
            assert like.get_attribute('aria-pressed')=='true'
            assert other.locator('[data-shorts-like]').get_attribute('aria-pressed')=='false'
            like.click()
            sound = screen.locator('[data-shorts-sound]')
            sound.click()
            assert video.evaluate('(v)=>!v.muted')
            assert other.locator('video').evaluate('(v)=>v.muted')
            video.evaluate('(v)=>v.muted=true')
            page.wait_for_function('(i)=>document.querySelectorAll("[data-shorts-sound]")[i].getAttribute("aria-pressed")==="false"',arg=i)
            screen.locator('[data-shorts-fullscreen]').click()
            page.wait_for_function('!!document.fullscreenElement')
            page.evaluate('document.exitFullscreen()')
            page.wait_for_function('!document.fullscreenElement')
        checks = {'route':route,'independentActions':True,'singleActivePlayback':True,'viewports':[]}
        for width,height in [(320,740),(390,844),(768,1024),(1280,800),(1366,768),(1440,900)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate("document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width,'body overflow')
            boxes=[]
            for i in range(2):
                box=screens.nth(i).bounding_box()
                video_box=screens.nth(i).locator('video').bounding_box()
                assert abs(box['width']/box['height']-9/16)<.005
                assert abs(box['height']-video_box['height'])<2
                boxes.append(box)
            if width>=1051:
                assert abs(boxes[0]['y']-boxes[1]['y'])<1
                assert boxes[1]['x']>=boxes[0]['x']+boxes[0]['width']
                assert page.locator('.site-operation').first.bounding_box()['y']<height-35,(route,width,'next section hidden')
            if width<701:
                grid=page.locator('.dual-phone-grid')
                assert grid.evaluate('(e)=>e.scrollWidth>e.clientWidth')
                screens.nth(1).scroll_into_view_if_needed()
                grid_box=grid.bounding_box()
                second_box=screens.nth(1).bounding_box()
                assert second_box['x']>=grid_box['x']-1
                assert second_box['x']+second_box['width']<=grid_box['x']+grid_box['width']+1
                grid.evaluate("(e)=>e.scrollTo({left:0,behavior:'instant'})")
                page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            checks['viewports'].append(width)
            if width in [390,1366]:
                page.screenshot(path=str(out/f'{index}-{width}.png'))
                if width==390:
                    page.locator('.dual-phone-grid').screenshot(path=str(out/f'{index}-compare.png'))
        inputs=page.locator('.site-operation input[type=file]')
        sample=str(Path('public/assets/smalltown-boy/reference.webp').resolve())
        for i in range(inputs.count()): inputs.nth(i).set_input_files(sample)
        page.wait_for_function('''()=>[...document.querySelectorAll('.site-operation img')].some(i=>i.src.startsWith('blob:')&&!i.hidden)''')
        if 'alors-on-danse' in route:
            page.wait_for_function('document.querySelector("#pair-status").textContent.includes("2/2")')
            page.locator('.portrait-slot .remove-photo').first.click()
            assert '1/2' in page.locator('#pair-status').inner_text()
            checks['pairedPortraits']=True
        checks['photoPreview']=True
        if page.locator('.social-hero-copy a[href="/pricing"]').count():
            page.locator('.social-hero-copy a[href="/pricing"]').click()
            page.wait_for_url('**/pricing')
            checks['pricingLink']=True
        results.append(checks)
        print('PASS',route,flush=True)
    assert not errors, errors
    browser.close()
(out/'results.json').write_text(json.dumps({'routes':results,'pageErrors':errors},indent=2),encoding='utf-8')
print('PASS: dual-reference layout, independent controls, swipe and photo previews')
