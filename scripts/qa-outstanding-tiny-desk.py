"""Browser acceptance for Tiny Desk content and photo modes; never starts a video job or payment."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:3084')
parser.add_argument('--output',required=True)
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
topic=next(t for t in json.loads((root/'public/video-projects.json').read_text(encoding='utf-8'))['projects']if t['id']=='outstanding-tiny-desk-ai')
routes=[topic['url'],*topic['guides'].values()];layouts=[];errors=[];bad_resources=[]
with sync_playwright()as p:
 browser=p.chromium.launch(headless=True);page=browser.new_page()
 page.on('pageerror',lambda error:errors.append({'url':page.url,'error':str(error)}))
 page.on('response',lambda r:bad_resources.append({'url':r.url,'status':r.status})if r.status>=400 and '/api/'not in r.url else None)
 for index,route in enumerate(routes):
  r=page.goto(args.base_url+route,wait_until='networkidle');assert r.status==200,route
  assert page.locator('h1').count()==1
  assert page.locator('header nav').count()>0
  assert page.locator('link[rel=canonical]').get_attribute('href')=='https://burningbridgesaivideo.pro'+route
  peers=page.locator('.trend-related a').evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))')
  assert len(peers)==3 and set(peers)==set(routes)-{route},(route,peers)
  for anchor in page.locator('main a[href^="#"]').all():assert page.locator('[id="'+anchor.get_attribute('href')[1:]+'"]').count()
  for width in [320,390,768,1280]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('document.fonts.ready');page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width,'overflow')
   if index==0:
    hero=page.locator('.unified-hero').bounding_box();workspace=page.locator('.site-operation').bounding_box();assert workspace['y']>=hero['y']+hero['height']-2
    video=page.locator('.phone-screen').bounding_box();assert abs(video['width']/video['height']-9/16)<.01
    if width<701:
     copy=page.locator('.hero-copy').bounding_box();media=page.locator('.hero-media').bounding_box();assert media['y']>=copy['y']+copy['height']-2
    page.locator('[data-desk-mode=individual]').click();assert page.locator('input[type=file]:enabled').count()==5
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,'role-grid overflow')
    page.locator('[data-desk-mode=group]').click();assert page.locator('input[type=file]:enabled').count()==1
   if width in [390,1280]:
    page.evaluate("scrollTo({top:0,behavior:'instant'})");page.screenshot(path=str(out/f'{index}-{width}.png'),full_page=True)
    page.screenshot(path=str(out/f'{index}-{width}-preview.png'))
   layouts.append({'route':route,'width':width})
  if index>0:
   page.set_viewport_size({'width':390,'height':844});toggle=page.get_by_role('button',name='Open navigation',exact=True);toggle.click()
   menu=page.get_by_role('navigation',name='Mobile navigation',exact=True);menu.locator('.video-project-toggle').click()
   assert menu.locator('a[href="'+topic['url']+'"]').is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  print('PAGE PASS',route,flush=True)
 page.goto(args.base_url+topic['url'],wait_until='networkidle');page.set_viewport_size({'width':390,'height':844})
 workspace=page.locator('[data-tiny-desk-workspace]');action=workspace.locator('[data-generate-video]')
 hero_action=page.locator('.hero-copy a.button');assert hero_action.get_attribute('href')=='#photo-workspace';hero_action.click();assert page.url.endswith('#photo-workspace')
 action.click();assert page.url.endswith('#photo-workspace');assert 'Group photo'in workspace.locator('[data-generation-feedback]').inner_text()
 png=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=c.height=600;const x=c.getContext('2d');x.fillStyle='#888';x.fillRect(0,0,600,600);return c.toDataURL('image/png').split(',')[1]}''')
 fixture={'name':'portrait.png','mimeType':'image/png','buffer':base64.b64decode(png)}
 group=page.locator('#desk-group');group.set_input_files(fixture);page.wait_for_function('document.querySelector("#desk-group").dataset.generationReady==="true"')
 previous=workspace.locator('[data-desk-panel=group] [data-photo-preview]').get_attribute('src');group.set_input_files({**fixture,'name':'replacement.png'})
 page.wait_for_function('(old)=>document.querySelector("[data-desk-panel=group] [data-photo-preview]").src!==old',arg=previous)
 page.locator('[data-desk-mode=individual]').click();assert page.locator('#desk-group').is_disabled()
 action.click();assert page.url.endswith('#photo-workspace');assert 'Lead / frontman'in workspace.locator('[data-generation-feedback]').inner_text()
 page.locator('#desk-keyboard').set_input_files(fixture);page.wait_for_function('document.querySelector("#desk-keyboard").dataset.generationReady==="true"')
 action.click();assert 'Lead / frontman'in workspace.locator('[data-generation-feedback]').inner_text(),'optional photo cannot replace lead'
 lead=page.locator('#desk-lead');lead.set_input_files(fixture);page.wait_for_function('document.querySelector("#desk-lead").dataset.generationReady==="true"')
 page.wait_for_function('document.querySelector("[data-desk-panel=individual] [data-photo-status]").textContent.includes("1 of 4 optional")')
 page.locator('[data-desk-mode=group]').click();assert group.get_attribute('data-generation-ready')=='true';assert page.locator('[data-desk-panel=group] [data-photo-preview]').is_visible()
 page.locator('[data-desk-mode=individual]').click();assert lead.get_attribute('data-generation-ready')=='true';assert page.locator('[data-desk-panel=individual] [data-photo-preview]').first.is_visible()
 page.locator('[data-photo-remove][aria-label="Remove Keyboard photo"]').click()
 assert page.locator('#desk-keyboard').get_attribute('data-generation-ready')is None;page.wait_for_function('document.querySelector("[data-desk-panel=individual] [data-photo-status]").textContent.includes("0 of 4 optional")')
 action.click();page.wait_for_url('**/pricing')
 # Group mode with an empty hidden individual panel must also continue.
 page.goto(args.base_url+topic['url'],wait_until='networkidle');group=page.locator('#desk-group')
 group.set_input_files({'name':'invalid.txt','mimeType':'text/plain','buffer':b'not an image'})
 assert 'JPG'in page.locator('[data-desk-panel=group] [data-photo-status]').inner_text()
 workspace=page.locator('[data-tiny-desk-workspace]');workspace.locator('[data-generate-video]').click();assert page.url.endswith(topic['url'])
 group.set_input_files(fixture);page.wait_for_function('document.querySelector("#desk-group").dataset.generationReady==="true"');workspace.locator('[data-generate-video]').click();page.wait_for_url('**/pricing')
 page.goto(args.base_url+topic['url'],wait_until='networkidle')
 hero_video=page.locator('.phone-screen video');hero_video.evaluate('(v)=>v.play()');page.wait_for_function('document.querySelector(".phone-screen video").currentTime>.15');hero_video.evaluate('(v)=>v.pause()')
 page.locator('[data-shorts-like]').click();assert page.locator('[data-shorts-like]').get_attribute('aria-pressed')=='true'
 page.locator('[data-shorts-sound]').click();assert hero_video.evaluate('(v)=>!v.muted');page.locator('[data-shorts-sound]').click()
 page.locator('[data-shorts-fullscreen]').click();page.wait_for_function('!!document.fullscreenElement');page.evaluate('document.exitFullscreen()')
 for video in page.locator('.desk-example-grid video').all():
  video.evaluate('(v)=>v.play()');page.wait_for_function('(v)=>v.currentTime>.15',arg=video.element_handle());video.evaluate('(v)=>v.pause()')
 page.goto(args.base_url+'/blog',wait_until='networkidle')
 for kind,route in topic['guides'].items():
  page.locator(f'[data-guide-filter="{kind}"]').click();page.locator('#guide-topic').select_option(topic['id']);cards=page.locator('.guide-hub-card:visible');assert cards.count()==1;assert cards.get_attribute('href')==route
 page.goto(args.base_url+'/examples',wait_until='networkidle');assert page.locator('.video-project-card h2 a[href="'+topic['url']+'"]').count()==1
 browser.close()
assert not errors,errors
assert not bad_resources,bad_resources
(out/'results.json').write_text(json.dumps({'layouts':layouts,'sameTopicLinks':12,'photoModesAndPricing':True,'photoReplaceRemoveInvalid':True,'hiddenInputsDoNotBlock':True,'optionalPhotosCannotReplaceLead':True,'videoControls':True,'threeVideosPlay':True,'blogFilters':3,'pageErrors':errors,'badResources':bad_resources},indent=2),encoding='utf-8')
print('PASS: four pages, 16 viewport checks, two photo modes, optional roles, pricing navigation, videos and topic links')
