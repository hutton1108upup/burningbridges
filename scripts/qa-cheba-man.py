from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path.cwd(); evidence=root/'docs/qa/cheba-man'; evidence.mkdir(parents=True,exist_ok=True)
base='http://localhost:4199'; route='/examples/cheba-man-ai-dance-maker'
results=[]; errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1280,'height':950})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+route); page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
 for i in range(page.locator('video').count()):
  v=page.locator('video').nth(i);v.scroll_into_view_if_needed();v.evaluate('(v)=>v.play()')
  page.wait_for_function('(i)=>document.querySelectorAll("video")[i].currentTime>0.2',arg=i)
  results.append({'video':i,**v.evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration})')})
  v.evaluate('(v)=>{v.muted=false;v.pause()}')
 field=page.locator('#cheba-photo')
 field.set_input_files(str(root/'public/assets/cheba-man/original.jpg'))
 page.wait_for_function('document.querySelectorAll("[data-photo-ready]").length===1')
 field.set_input_files(str(root/'public/assets/cheba-man/ai-example.webp'))
 page.wait_for_function('document.querySelector("[data-photo-preview]").naturalWidth>0 && document.querySelectorAll("[data-photo-ready]").length===1')
 page.get_by_role('button',name='Remove your portrait',exact=True).click()
 assert page.locator('[data-photo-ready]').count()==0
 field.set_input_files({'name':'invalid.txt','mimeType':'text/plain','buffer':b'invalid'})
 assert 'choose a JPG' in page.locator('[data-photo-status]').inner_text()
 field.set_input_files({'name':'oversize.jpg','mimeType':'image/jpeg','buffer':b'0'*(10*1024*1024+1)})
 assert 'up to 10 MB' in page.locator('[data-photo-status]').inner_text()
 field.set_input_files(str(root/'public/assets/cheba-man/original.jpg'))
 page.wait_for_function('document.querySelectorAll("[data-photo-ready]").length===1')
 page.get_by_role('button',name='Remove your portrait',exact=True).click()
 theme=page.get_by_role('button',name='Toggle theme',exact=True)
 theme.click();assert not page.locator('html').evaluate('(e)=>e.classList.contains("dark")')
 theme.click();assert page.locator('html').evaluate('(e)=>e.classList.contains("dark")')
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':950});page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(150)
  size=page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
  assert size['scroll']<=size['client'],(width,size)
  boxes=page.locator('.hero-copy,.hero-media,#photo-workspace').evaluate_all('(es)=>es.map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}))')
  assert boxes[2]['top']>=max(boxes[0]['bottom'],boxes[1]['bottom'])
  if width<700:assert boxes[1]['top']>=boxes[0]['bottom']
  page.screenshot(path=str(evidence/f'width-{width}.png'),full_page=True)
  if width in [390,1280]:page.screenshot(path=str(evidence/f'viewport-{width}.png'))
  results.append({'width':width,'overflow':False,'layoutOrder':'passed'})
 ctas=page.locator('a').filter(has_text='Generate video')
 assert ctas.count()>=7
 for cta in ctas.all():assert cta.get_attribute('href')=='/pricing'
 page.locator('.hero-copy a[href="#photo-workspace"]').click();assert page.locator('#photo-workspace').is_visible()
 page.set_viewport_size({'width':390,'height':950});page.evaluate('window.scrollTo(0,0)')
 toggle=page.locator('.video-project-toggle');toggle.click();assert toggle.get_attribute('aria-expanded')=='true'
 assert page.locator('.video-project-menu').is_visible();toggle.click()
 page.locator('.hero-copy a[href="/pricing"]').click();page.wait_for_url('**/pricing')
 page.goto(base+route)
 buttons=page.locator('button').evaluate_all('(es)=>es.map(e=>({label:e.getAttribute("aria-label"),text:e.textContent}))')
 results.append({'buttons':buttons})
 page.goto(base+'/examples');page.wait_for_load_state('networkidle')
 assert page.locator('a[href="'+route+'"]').count()>0
 filter_button=page.locator('[data-video-filter="dance"]')
 if filter_button.count():
  filter_button.click();assert page.locator('a[href="'+route+'"]').last.is_visible()
 assert not errors,errors
 browser.close()
(evidence/'results.json').write_text(json.dumps({'checks':results,'photoSelectReplaceRemoveInvalidOversize':'passed','mobileMenu':'passed','pricingCTA':'passed','directoryEntry':'passed','themeToggle':'passed','errors':errors},indent=2),encoding='utf8')
print(json.dumps(results,indent=2))
