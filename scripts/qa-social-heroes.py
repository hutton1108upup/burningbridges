"""Browser acceptance for the shared single-video Hero; does not submit jobs or payments."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://localhost:4196')
parser.add_argument('--output', required=True)
parser.add_argument('--route', action='append', help='Limit verification to a changed route; repeat for multiple routes.')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
routes = ['/', '/burning-bridges-video-ai', '/flying-entrance', '/gas-station-dance-ai',
          '/ozil-goal-ai-video', '/zombie-love-story-ai', '/zombie-pet-ai-video',
          '/examples/babydoll-dance-ai-video', '/examples/toc-toc-dance', '/examples/ai-smalltown-boy']
if args.route:
    routes = args.route
results = []
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    for index, route in enumerate(routes):
        checks = {'route': route, 'viewports': []}
        page.set_viewport_size({'width':1366, 'height':768})
        response = page.goto(args.base_url + route)
        assert response.status == 200, route
        page.wait_for_load_state('networkidle')
        page.evaluate('document.fonts.ready')
        screen = page.locator('.phone-screen')
        video = screen.locator('video')
        video.evaluate('(v)=>v.play()')
        page.wait_for_function('document.querySelector(".phone-screen video").currentTime > 0.2')
        video.evaluate('(v)=>v.pause()')
        checks['playback'] = True
        like = page.locator('[data-shorts-like]')
        like.click()
        assert like.get_attribute('aria-pressed') == 'true'
        like.click()
        assert like.get_attribute('aria-pressed') == 'false'
        sound = page.locator('[data-shorts-sound]')
        video.evaluate('(v)=>v.muted=true')
        sound.click()
        assert video.evaluate('(v)=>!v.muted')
        video.evaluate('(v)=>v.muted=true')
        page.wait_for_function('document.querySelector("[data-shorts-sound]").getAttribute("aria-pressed")==="false"')
        page.locator('[data-shorts-fullscreen]').click()
        page.wait_for_function('!!document.fullscreenElement')
        page.evaluate('document.exitFullscreen()')
        page.wait_for_function('!document.fullscreenElement')
        checks['playerActions'] = True
        for width, height in [(320,740),(390,844),(768,1024),(1280,800),(1366,768),(1440,900)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate("document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(120)
            assert page.evaluate('scrollY===0'), (route,width,'viewport not at page top')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (route, width, 'overflow')
            box = screen.bounding_box()
            assert abs(box['width']/box['height']-9/16)<.005, (route, width, box)
            video_box = video.bounding_box()
            assert abs(video_box['height']-box['height'])<2, (route,width,'video controls do not reach screen bottom')
            assert abs(video_box['width']-box['width'])<2, (route,width,'video does not fill phone width')
            copy = page.locator('.social-hero-copy').bounding_box()
            workspace = page.locator('.site-operation').first.bounding_box()
            if width < 701:
                assert box['y'] >= copy['y'] + copy['height'] - 1, (route,width,'order')
            if width >= 1280:
                assert workspace['y'] <= height-35, (route,width,workspace['y'],'next section hidden')
            checks['viewports'].append({'width':width,'height':height,'nextSectionTop':round(workspace['y'])})
            if width in [390,1366]:
                page.screenshot(path=str(out/f'{index}-{width}.png'))
                if width == 390: screen.screenshot(path=str(out/f'{index}-phone.png'))
        # The existing portrait component must still react to a selection.
        first_input = page.locator('.site-operation input[type=file]').first
        first_input.set_input_files(str(Path('public/assets/smalltown-boy/reference.webp').resolve()))
        page.wait_for_function('''()=>[...document.querySelectorAll('.site-operation img')].some(i=>i.src.startsWith('blob:')&&!i.hidden&&i.getBoundingClientRect().width>0)''')
        checks['photoPreview'] = True
        if route == '/examples/toc-toc-dance':
            second = page.locator('[data-toc-clip]').nth(1)
            second.click()
            page.wait_for_function('document.querySelector("#toc-player").currentTime>0.2')
            assert second.get_attribute('aria-pressed') == 'true'
            assert video.evaluate('(v)=>v.currentSrc').endswith('toc-toc-dance-template.mp4')
            assert 'template-poster.webp' in screen.get_attribute('style')
            assert page.locator('#toc-video-title').inner_text() == 'Home Take'
            checks['referenceSwitch'] = True
        cta = page.locator('.social-hero-copy a[href="/pricing"]')
        if cta.count():
            cta.first.click()
            page.wait_for_url('**/pricing')
            checks['pricingLink'] = True
        results.append(checks)
        print('PASS',route,flush=True)
    # Dual-reference pages retain both videos in the shared App presentation.
    for route in ['/bulin-47-ai-video-maker','/examples/alors-on-danse-ai-video-generator','/examples/cheba-man-ai-dance-maker']:
        page.goto(args.base_url+route)
        assert page.locator('.unified-hero video').count()==2
        assert page.locator('.dual-social-hero .phone-screen').count()==2
    assert not errors, errors
    browser.close()
(out/'results.json').write_text(json.dumps({'routes':results,'pageErrors':errors},indent=2),encoding='utf-8')
print('PASS: single-video Heroes and dual-reference structure')
