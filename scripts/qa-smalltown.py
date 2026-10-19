import json, base64
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path.cwd()
evidence = root/'docs/qa/smalltown-boy'
evidence.mkdir(parents=True, exist_ok=True)
results = []
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1280,'height':1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://localhost:4197/examples/ai-smalltown-boy')
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    assert page.locator('[data-photo-slot]').count() == 2
    assert page.locator('[data-photo-slot] [data-photo-slot]').count() == 0
    videos = page.locator('video')
    for i in range(videos.count()):
        video = videos.nth(i)
        video.scroll_into_view_if_needed()
        video.evaluate('(v)=>v.play()')
        page.wait_for_function('(i)=>document.querySelectorAll("video")[i].currentTime>0.2', arg=i)
        info = video.evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,playing:!v.paused})')
        results.append({'video':i,**info})
        video.evaluate('(v)=>v.pause()')
        if i > 0:
            poster = root/f'public/assets/smalltown-boy/example-{i}.png'
            data = video.evaluate('''v=>{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/png').split(',')[1]}''')
            poster.write_bytes(base64.b64decode(data))
    sample = str(root/'public/assets/smalltown-boy/expression.png')
    replacement = str(root/'public/assets/smalltown-boy/duo.png')
    first = page.locator('#smalltown-photo-1')
    second = page.locator('#smalltown-photo-2')
    first.set_input_files(sample)
    second.set_input_files(sample)
    page.wait_for_function('document.querySelectorAll("[data-photo-ready]").length===2')
    first.set_input_files(replacement)
    page.wait_for_function('document.querySelectorAll("[data-photo-ready]").length===2')
    page.get_by_role('button',name='Remove first character',exact=True).click()
    assert page.locator('[data-photo-ready]').count() == 1
    first.set_input_files({'name':'invalid.txt','mimeType':'text/plain','buffer':b'no image'})
    assert 'choose a JPG' in page.locator('[data-photo-status]').inner_text()
    assert page.locator('[data-photo-ready]').count() == 1
    page.get_by_role('button',name='Remove second character',exact=True).click()
    assert page.locator('[data-photo-ready]').count() == 0
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':950})
        page.evaluate('window.scrollTo(0,0)')
        page.wait_for_timeout(150)
        sizes=page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
        assert sizes['scroll']<=sizes['client'], (width,sizes)
        boxes=page.locator('.hero-copy,.hero-media,#photo-workspace').evaluate_all('(els)=>els.map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}))')
        assert boxes[2]['top'] >= max(boxes[0]['bottom'],boxes[1]['bottom'])
        if width<700: assert boxes[1]['top']>=boxes[0]['bottom']
        if width in [390,1280]:
            page.screenshot(path=str(evidence/f'viewport-{width}.png'))
        page.screenshot(path=str(evidence/f'width-{width}.png'),full_page=True)
        results.append({'viewport':width,'overflow':False,'order':True})
    for a in page.locator('a').all():
        if a.inner_text().strip().startswith('Generate video'):
            assert a.get_attribute('href')=='/pricing'
    toggle=page.locator('.video-project-toggle')
    page.set_viewport_size({'width':390,'height':850})
    toggle.click()
    assert toggle.get_attribute('aria-expanded')=='true'
    assert page.locator('.video-project-menu').is_visible()
    toggle.click()
    page.locator('.hero-copy a[href="/pricing"]').click()
    page.wait_for_url('**/pricing')
    page.goto('http://localhost:4197/examples')
    assert page.locator('a[href="/examples/ai-smalltown-boy"]').count()>0
    assert not errors, errors
    browser.close()
(evidence/'results.json').write_text(json.dumps({'checks':results,'photoSelectReplaceRemoveInvalid':'passed','mobileMenu':'passed','pricingCTA':'passed','directoryEntry':'passed','pageErrors':errors},indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
