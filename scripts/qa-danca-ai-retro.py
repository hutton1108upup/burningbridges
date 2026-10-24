"""Check pt-BR reading pages, reference playback and localized UI without paid actions."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'docs/qa/danca-ai-retro'
out.mkdir(parents=True, exist_ok=True)
project = next(p for p in json.loads((root/'public/video-projects.json').read_text(encoding='utf-8'))['projects'] if p['id']=='danca-ai-retro')
routes = [project['url'], *project['guides'].values()]
errors, results, media = [], [], []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    for route in routes:
        response = page.goto('http://127.0.0.1:4197'+route, wait_until='networkidle')
        assert response.status == 200
        assert page.locator('html').get_attribute('lang')=='pt-BR'
        assert page.locator('h1').count()==1
        assert page.locator('[rel=canonical]').get_attribute('href')=='https://burningbridgesaivideo.pro'+route
        assert len(page.locator('.trend-guide-links a').all())==3
        assert page.locator('.trend-related h2').inner_text()=='Explore este tema'
        assert page.locator('a[href^="http"]').count()==0
        for width in [320,390,768,1280]:
            page.set_viewport_size({'width':width,'height':900})
            page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (route,width)
            if route==project['url']:
                assert page.locator('#photo-workspace').evaluate('(e)=>e.offsetTop')>page.locator('.hero').evaluate('(e)=>e.offsetTop+e.offsetHeight-1')
            if width in [390,1280]:
                page.screenshot(path=str(out/(route.split('/')[-1]+'-'+str(width)+'.png')),full_page=True)
            results.append({'route':route,'width':width,'overflow':False})
        page.locator('.video-project-toggle').click()
        assert page.locator('.video-project-menu').is_visible()
        assert 'tendências' in page.locator('.video-project-all').inner_text()
        page.keyboard.press('Escape')
        assert not page.locator('.video-project-menu').is_visible()
        page.locator('#faq details').first.locator('summary').click()
        assert page.locator('#faq details').first.get_attribute('open') is not None
        page.locator('.rumpelstiltskin-theme').click()
        assert page.locator('.rumpelstiltskin-theme').inner_text()=='Modo escuro'
        page.locator('.rumpelstiltskin-theme').click()
    page.goto('http://127.0.0.1:4197'+project['url'],wait_until='networkidle')
    for i,video in enumerate(page.locator('video').all()):
        video.scroll_into_view_if_needed()
        video.evaluate("v=> {v.preload='auto'; if(!v.hasAttribute('data-src')) v.load();}")
        page.wait_for_function("i => {const v=document.querySelectorAll('video')[i];return !v.hasAttribute('data-src') && v.readyState>=2}",arg=i)
        info=video.evaluate('''async v => {
          await v.play(); await new Promise((resolve,reject)=> {const end=Date.now()+8000;const t=setInterval(()=>{if(v.currentTime>0.1){clearInterval(t);resolve()}else if(v.error||Date.now()>end){clearInterval(t);reject(Error('Playback failed'))}},50)});
          v.pause(); return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,time:v.currentTime};
        }''')
        assert info['width']>0 and info['height']>0
        video.evaluate('v=>v.currentTime=Math.min(5,v.duration/2)')
        page.screenshot(path=str(out/('video-'+str(i)+'.png')))
        media.append(info)
    page.locator('[data-shorts-like]').click()
    assert page.locator('[data-shorts-like] span').inner_text()=='Curtido'
    page.locator('[data-shorts-sound]').click()
    assert page.locator('[data-shorts-sound] span').inner_text()=='Silenciar'
    page.locator('[data-generate-video]').click()
    assert page.locator('[data-generation-feedback]').inner_text()=='Escolha uma foto válida antes de gerar seu vídeo.'
    page.locator('input[type=file]').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'bad'})
    assert 'escolha uma foto JPG' in page.locator('[data-photo-status]').inner_text()
    assert not errors, errors
    browser.close()
(out/'pages.json').write_text(json.dumps({'viewports':results,'media':media,'errors':errors},indent=2),encoding='utf-8')
print('PASS: 4 pt-BR pages, 16 viewports, 3 playable references, localized controls and validation.')
