// Photo preparation, reference playback and plan selection.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const dialog = document.createElement('dialog');
dialog.className = 'local-dialog';
dialog.innerHTML = '<h2>Plan Details</h2><p class="plan-summary"></p><p>Review the credits, billing period and validity for your chosen plan.</p><p><a href="/terms-of-service">Service terms</a> · <a href="/refund-policy">Refund policy</a> · <a href="mailto:support@burningbridgesaivideo.pro">Billing support</a></p><button type="button">Close</button>';
document.body.append(dialog);
$('button',dialog).onclick = () => dialog.close();
dialog.addEventListener('click', event => {if (event.target === dialog) dialog.close();});
const goToPricing = async () => {
  try { await window.BBCommerce?.saveDraft(); location.assign('/pricing'); }
  catch { alert('Your photo could not be saved. Please keep this page open and try again.'); }
};
const showPlanDetails = button => {
  const card = button.closest('[data-slot="card"],article');
  const title = $('[data-slot="card-title"],h3',card)?.textContent.trim() || 'Credit Plan';
  const description = $('[data-slot="card-description"]',card)?.textContent.trim() || '';
  const price = $('.text-primary',card)?.textContent.trim() || '';
  $('.plan-summary',dialog).textContent = `${title} — ${price}. ${description}`;
  dialog.showModal();
};

const header = $('header');
if (header) {
  const loader = $('.lucide-loader-circle', header);
  if (loader) {
    const account = document.createElement('button');
    account.className = 'local-account'; account.textContent = 'View Pricing'; account.onclick = goToPricing;
    loader.parentElement.replaceChildren(account);
  }
  const blank = $('span[aria-hidden="true"]', header);
  if (blank) {
    const theme = document.createElement('button'); theme.className = 'local-theme'; theme.textContent=document.documentElement.classList.contains('dark')?'☀':'☾'; theme.setAttribute('aria-label','Toggle theme');
    theme.onclick = () => {document.documentElement.classList.toggle('dark');theme.textContent=document.documentElement.classList.contains('dark')?'☀':'☾';};
    blank.replaceWith(theme);
  }
  const toggle = $('button[aria-label="Open navigation"]', header);
  if (toggle) {
    const nav=document.createElement('nav');nav.className='local-mobile-nav';nav.hidden=true;nav.setAttribute('aria-label','Mobile navigation');
    const links=[...($('nav',header)?.children || [])];for(const link of links) nav.append(link.cloneNode(true));
    const pricing=document.createElement('button');pricing.className='local-account';pricing.textContent='View Pricing';pricing.onclick=goToPricing;nav.append(pricing);
    header.append(nav);
    toggle.onclick=()=>{nav.hidden=!nav.hidden;toggle.setAttribute('aria-expanded',String(!nav.hidden));};
    $$('a',nav).forEach(a=>a.onclick=()=>{nav.hidden=true;toggle.setAttribute('aria-expanded','false');});
  }
}

$$('[data-slot="accordion-trigger"]').forEach(button => {
  button.onclick=()=>{
    const panel=document.getElementById(button.getAttribute('aria-controls'));
    const open=button.getAttribute('aria-expanded')!=='true';
    const group=button.closest('section') || button.closest('[data-slot="accordion"]');
    if(group) $$('[data-slot="accordion-trigger"]',group).forEach(other=>{
      const content=document.getElementById(other.getAttribute('aria-controls'));
      other.setAttribute('aria-expanded','false');other.dataset.state='closed';
      if(content){content.hidden=true;content.dataset.state='closed';}
    });
    button.setAttribute('aria-expanded',String(open));button.dataset.state=open?'open':'closed';
    if(panel){panel.hidden=!open;panel.dataset.state=open?'open':'closed';}
  };
});

$$('video:not([data-reference-player]):not([data-home-media])').forEach(video=>{
  video.muted=true;video.loop=true;video.playsInline=true;
  video.play().catch(()=>{}); // Autoplay may be blocked by browser preferences.
});
$$('button[aria-label="Unmute video"],button[aria-label="Mute video"]').forEach(button=>{
  const video=$('video',button.parentElement);
  if(video) button.onclick=()=>{
    video.muted=!video.muted;
    button.setAttribute('aria-label',video.muted?'Unmute video':'Mute video');
    button.setAttribute('aria-pressed',String(!video.muted));
    video.play().catch(()=>{});
  };
});

let photoURL;
const upload=$('#photo-upload'),preview=$('#photo-preview'),uploadButton=$('#upload-button'),remove=$('#remove-photo');
if(upload){
  uploadButton.onclick=()=>upload.click();
  upload.onchange=()=>{
    const file=upload.files[0];if(!file)return;
    if(!file.type.startsWith('image/') || file.size>8*1024*1024){
      upload.value='';alert('Choose an image smaller than 8MB.');return;
    }
    if(photoURL)URL.revokeObjectURL(photoURL);
    photoURL=URL.createObjectURL(file);preview.src=photoURL;preview.hidden=false;uploadButton.hidden=true;remove.hidden=false;
    const count=$('.tabular-nums',$('#burning-bridges-ai-generator'));if(count)count.textContent='1 / 1';
  };
  remove.onclick=()=>{
    if(photoURL)URL.revokeObjectURL(photoURL);photoURL=undefined;upload.value='';preview.removeAttribute('src');preview.hidden=true;uploadButton.hidden=false;remove.hidden=true;
    const count=$('.tabular-nums',$('#burning-bridges-ai-generator'));if(count)count.textContent='0 / 1';
  };
}
const resolution=$('#resolution');
if(resolution)resolution.onchange=()=>{const credits=$('#required-credits');if(credits)credits.textContent=({'480':50,'720':100,'1080':200})[resolution.value];};

const examples=$('#examples');
if(examples && !examples.hasAttribute('data-home-gallery')){
  const video=$('video',examples);
  $$('button',examples).filter(button=>$('img',button)).forEach((button,index)=>{
    button.onclick=()=>{
      const image=$('img',button);video.poster=image.src;
      const names=['template-16x9-crop','example-1','example-2'];
      fetch('/media.json').then(r=>{if(!r.ok)throw Error(`Video manifest failed: ${r.status}`);return r.json();}).then(assets=>{
        const src=assets[names[index]];
        if(!src)throw Error('Example video is missing');
        video.src=src;video.play().catch(()=>{});
        $$('button',examples).filter(b=>$('img',b)).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        const label=$('img',button).alt.replace(' Burning Bridges AI video example','');
        const caption=video.parentElement.parentElement.nextElementSibling;
        if(caption && !caption.contains(button)){
          const title=$('.truncate.text-sm',caption);if(title)title.textContent=label;
          const kind=$('span.truncate',caption);if(kind)kind.textContent=index===0?'Source template':'Finished render';
        }
      }).catch(error=>{console.error(error);});
    };
  });
}

$$('button').forEach(button=>{
  if(button.hasAttribute('data-local-account'))button.onclick=goToPricing;
  if(/^(Buy \d+ credits|Subscribe Monthly|Choose Plan)$/.test(button.textContent.trim()))button.onclick=()=>showPlanDetails(button);
  if(button.hasAttribute('data-local-preview') || button.textContent.trim()==='Make yours')button.onclick=()=>location.assign('/pricing');
});
$$('[role="tab"]').forEach(button=>{
  button.tabIndex=button.getAttribute('aria-selected')==='true'?0:-1;
  button.onclick=()=>{
    const group=button.closest('section')||document;
    $$('[role="tab"]',group).forEach(other=>{const selected=other===button;other.setAttribute('aria-selected',String(selected));other.dataset.state=selected?'active':'inactive';other.tabIndex=selected?0:-1;});
    $$('[data-local-panel]',group).forEach(panel=>panel.hidden=panel.id!==button.getAttribute('aria-controls'));
  };
  button.onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=$$('[role="tab"]',button.parentElement);let next=tabs.indexOf(button)+(event.key==='ArrowRight'?1:-1);
    if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    const target=tabs[(next+tabs.length)%tabs.length];target.click();target.focus();
  };
});
