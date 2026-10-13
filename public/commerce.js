const $=selector=>document.querySelector(selector);
const costFor={'480':50,'720':100,'1080':200};
let session=null,draft=null,photoBlob=null,pollController=null,activeUser=null,photoReady=Promise.resolve();
const messages={
  CHECKOUT_PAUSED:'Checkout could not be opened. Your photo is saved; please try again.',
  CHECKOUT_FAILED:'We could not open checkout. No credits were issued. Please try again.',
  SIGN_IN_REQUIRED:'Sign in to purchase credits or view your videos.',
  SIGN_IN_FAILED:'Check your email and password and try again.',
  ACCOUNT_EXISTS_USE_SIGN_IN:'This email already has an account. Please sign in.',
  EMAIL_OR_PASSWORD_INVALID:'Enter a valid email and a password of 12–128 characters.',
  RECOVERY_INVALID:'Check your recovery code and enter a new password of 12–128 characters.',
  INSUFFICIENT_CREDITS:'You need more credits for this resolution. Choose a plan to continue.',
  SUBSCRIPTION_EXISTS:'You already have a monthly subscription. Manage billing or choose a one-time pack.',
  TRY_LATER:'Too many attempts. Please wait a few minutes before trying again.',
  GENERATION_PAUSED:'Your video could not be submitted. No credits were deducted. Please try again.',
  GOOGLE_LOGIN_UNAVAILABLE:'Google sign-in is not configured yet. You can use email and password.',
  GOOGLE_LOGIN_FAILED:'Google sign-in did not finish. Please try again.',
  GOOGLE_LOGIN_EXPIRED:'This Google sign-in request expired. Please start again.',
  GOOGLE_ACCOUNT_LINK_REQUIRED:'This email already has an account. Sign in with your password, then choose Link Google in Account to keep your credits and orders.',
  GOOGLE_LINK_SESSION_CHANGED:'Your account session changed. Sign in and start linking Google again.',
  GOOGLE_EMAIL_MISMATCH:'Choose the Google account with the same email as your existing account.',
  GOOGLE_ACCOUNT_ALREADY_LINKED:'This Google account is already linked to another account.',
};
async function api(path,body) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  let data;try {data=await response.json();}catch {throw Error('We could not reach your account. Please try again.');}
  if(!response.ok) {const error=Error(messages[data.error]||'We could not complete this request. Please try again.');error.code=data.error;throw error;}
  return data;
}
function status(text,error=false) {
  const node=$('#commerce-status');node.textContent=text;node.classList.toggle('commerce-error',error);
}
const dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open('burning-bridges-drafts',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function storage(action,value) {
  const db=await dbPromise;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts',action==='get'?'readonly':'readwrite'),store=tx.objectStore('drafts');
    const request=action==='get'?store.get('current'):action==='delete'?store.delete('current'):store.put(value,'current');
    tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
async function saveDraft() {
  await photoReady;
  if(!$('#photo-upload')) return;
  if(!photoBlob) return;
  draft={...draft,id:draft?.id||crypto.randomUUID(),blob:photoBlob,resolution:$('#resolution').value,format:$('#format').value,updatedAt:Date.now(),userId:session?.user?.id||draft?.userId||null};
  await storage('put',draft);
}
window.BBCommerce={saveDraft};
const panel=document.createElement('section');panel.className='commerce-panel';panel.setAttribute('data-clarity-mask','true');
panel.innerHTML=`<div class="commerce-bar"><strong id="commerce-account-label">Your account</strong><button type="button" id="commerce-account">Sign in / Create account</button><button type="button" id="commerce-billing" hidden>Manage billing</button><button type="button" id="commerce-logout" hidden>Sign out</button></div><p id="commerce-status" role="status" aria-live="polite"></p><div id="saved-draft" hidden></div><div id="payment-return" hidden><button type="button" id="check-payment">Check payment status</button><a href="/#burning-bridges-ai-generator">Return to your photo</a></div><div id="commerce-orders" hidden></div><button type="button" id="commerce-history" hidden>View last video</button>`;
const main=$('main')||document.body;
const generator=$('#burning-bridges-ai-generator');
const pricing=$('#pricing');
if(generator) generator.prepend(panel);
else if(pricing) pricing.append(panel);
else main.append(panel);
panel.setAttribute('aria-label','Activity and payment status');
const accountMenu=document.createElement('details');
accountMenu.className='commerce-account-menu';accountMenu.setAttribute('data-clarity-mask','true');
accountMenu.innerHTML='<summary id="commerce-account-summary">Sign in</summary><div class="commerce-account-popover"></div>';
accountMenu.querySelector('.commerce-account-popover').append(panel.querySelector('.commerce-bar'));
const header=$('header .container');
const pricingShortcut=$('header .local-account');
if(header) {pricingShortcut?.remove();header.lastElementChild.prepend(accountMenu);}
else main.prepend(accountMenu);
document.addEventListener('click',event=>{if(!accountMenu.contains(event.target))accountMenu.open=false;});
accountMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){accountMenu.open=false;$('#commerce-account-summary').focus();}});
const updatePanelVisibility=()=>{
  const empty=![...panel.children].some(child=>!child.hidden && (child.textContent.trim() || child.children.length));
  if(panel.hidden!==empty)panel.hidden=empty;
};
new MutationObserver(updatePanelVisibility).observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
updatePanelVisibility();
const resultPanel=document.createElement('section');resultPanel.id='commerce-result';resultPanel.hidden=true;resultPanel.setAttribute('aria-label','Video result');resultPanel.setAttribute('data-clarity-mask','true');
(generator||panel).append(resultPanel);
let latestJob=null;
$('#commerce-history').onclick=()=>{if(latestJob){accountMenu.open=false;pollJob(latestJob.id).then(()=>resultPanel.scrollIntoView({behavior:'smooth',block:'center'})).catch(error=>status(error.message,true));}};
const authDialog=document.createElement('dialog');authDialog.className='local-dialog commerce-auth';authDialog.setAttribute('data-clarity-mask','true');
authDialog.innerHTML=`<form id="commerce-auth-form"><h2 id="auth-heading">Sign in</h2><p>Use the same account to keep your credits and videos across devices.</p><label id="auth-email-label">Email<input id="auth-email" type="email" autocomplete="email" maxlength="254" required data-clarity-mask="true"></label><label id="auth-code-label" hidden>Recovery code<input id="auth-code" autocomplete="off" data-clarity-mask="true"></label><label>Password (12–128 characters)<input id="auth-password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required data-clarity-mask="true"></label><p id="auth-error" role="alert"></p><button type="submit" id="auth-submit">Sign in</button><button type="button" id="auth-switch">Create an account</button><button type="button" id="auth-recover">Use recovery code</button><button type="button" id="auth-close">Close</button></form><section id="recovery-save" hidden><h2>Save your recovery code</h2><p>Keep this code somewhere private. It restores access if you forget your password. We do not send password-reset emails.</p><code id="recovery-value"></code><button type="button" id="recovery-download">Download recovery code</button><button type="button" id="recovery-done">I have saved it</button></section>`;
document.body.append(authDialog);
const googleButton=document.createElement('button');googleButton.type='button';googleButton.id='auth-google';googleButton.className='commerce-google';googleButton.textContent='Continue with Google';googleButton.disabled=true;
const googleNote=document.createElement('p');googleNote.id='auth-google-note';googleNote.textContent='Checking Google sign-in availability…';
const emailDivider=document.createElement('p');emailDivider.className='commerce-auth-divider';emailDivider.textContent='or continue with email';
$('#auth-heading').after(googleButton,googleNote,emailDivider);
const linkGoogleButton=document.createElement('button');linkGoogleButton.type='button';linkGoogleButton.id='commerce-link-google';linkGoogleButton.textContent='Link Google';linkGoogleButton.hidden=true;
accountMenu.querySelector('.commerce-bar').append(linkGoogleButton);
async function googleSignIn(link=false) {
  await sessionReady;await saveDraft();
  const data=await api('/api/auth/google/start',{link,returnPath:location.pathname==='/pricing'?'/pricing':'/#burning-bridges-ai-generator'});
  const target=new URL(data.url);
  if(target.protocol!=='https:' || target.hostname!=='accounts.google.com')throw Error(messages.GOOGLE_LOGIN_FAILED);
  location.assign(target.href);
}
googleButton.onclick=async()=>{googleButton.disabled=true;try{await googleSignIn();}catch(error){$('#auth-error').textContent=error.message;googleButton.disabled=!session?.googleLoginEnabled;}};
linkGoogleButton.onclick=()=>busy(linkGoogleButton,()=>googleSignIn(true));
let authAction='signin',afterAuth=null,recoveryValue='';
function authMode(action) {
  authAction=action;$('#auth-heading').textContent=action==='signup'?'Create account':action==='recover'?'Recover account':'Sign in';
  $('#auth-submit').textContent=$('#auth-heading').textContent;
  $('#auth-switch').textContent=action==='signin'?'Create an account':'Sign in instead';
  $('#auth-password').autocomplete=action==='signin'?'current-password':'new-password';
  $('#auth-email-label').hidden=action==='recover';$('#auth-email').required=action!=='recover';
  $('#auth-code-label').hidden=action!=='recover';$('#auth-code').required=action==='recover';
  $('#auth-error').textContent='';
}
function openAuth(callback=null) {
  accountMenu.open=false;
  afterAuth=callback;authMode('signin');$('#commerce-auth-form').hidden=false;$('#recovery-save').hidden=true;authDialog.showModal();
}
$('#commerce-account').onclick=()=>openAuth();
$('#commerce-account-summary').onclick=event=>{if(!session?.user){event.preventDefault();openAuth();}};
$('#auth-switch').onclick=()=>authMode(authAction==='signin'?'signup':'signin');
$('#auth-recover').onclick=()=>authMode('recover');
$('#auth-close').onclick=()=>authDialog.close();
async function authDone() {
  authDialog.close();$('#auth-password').value='';$('#auth-code').value='';recoveryValue='';$('#recovery-value').textContent='';
  await refresh();const action=afterAuth;afterAuth=null;if(action) await action();
}
$('#recovery-done').onclick=()=>authDone().catch(error=>status(error.message,true));
$('#recovery-download').onclick=()=>{
  const blob=new Blob([`Burning Bridges account recovery\nEmail: ${$('#auth-email').value}\nRecovery code: ${recoveryValue}\nKeep private. This code gives access to your account.\n`],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='burning-bridges-recovery.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#commerce-auth-form').onsubmit=async event=>{
  event.preventDefault();$('#auth-submit').disabled=true;
  try {
    const data=await api(`/api/auth/${authAction}`,{email:$('#auth-email').value,password:$('#auth-password').value,code:$('#auth-code').value});
    if(data.recovery) {recoveryValue=data.recovery;$('#recovery-value').textContent=data.recovery;$('#commerce-auth-form').hidden=true;$('#recovery-save').hidden=false;}
    else await authDone();
  } catch(error) {$('#auth-error').textContent=error.message;} finally {$('#auth-submit').disabled=false;}
};
$('#commerce-logout').onclick=async()=>{
  try {await api('/api/auth/logout',{});accountMenu.open=false;clearPaymentReturn();pollController?.abort();await storage('delete');photoBlob=null;draft=null;$('#remove-photo')?.click();$('#commerce-result').hidden=true;await refresh();status('Signed out. Your saved photo has been cleared from this browser.');}
  catch(error){status(error.message,true);}
};
$('#commerce-billing').onclick=async()=>{
  try {const {portalUrl}=await api('/api/billing/portal',{});location.assign(portalUrl);}catch(error){status(error.message,true);}
};
function updateGenerator() {
  const button=$('[data-generator]'),balance=$('#credit-balance');
  $('#commerce-account-label').textContent=session?.user?`${session.user.email} · ${session.balance} ${session.mode==='test'?'test ':''}credits`:'Your account';
  $('#commerce-account-summary').textContent=session?.user?'Account':'Sign in';
  if(balance)balance.textContent=session?.user?String(session.balance):'—';
  if(button)button.textContent=session?.user && session.balance>=(costFor[$('#resolution').value]||100)?'Generate Video':'Continue to Pricing';
  document.querySelectorAll('a').forEach(link=>{
    if(['Create Video','Burning Bridges Generator'].includes(link.textContent.trim()))link.href=session?.user && session.balance>=50?'/#burning-bridges-ai-generator':'/pricing';
  });
}
async function refresh() {
  session=await api('/api/session');
  googleButton.disabled=!session.googleLoginEnabled;googleNote.hidden=Boolean(session.googleLoginEnabled);googleNote.textContent=messages.GOOGLE_LOGIN_UNAVAILABLE;
  linkGoogleButton.hidden=!session.user || !session.googleLoginEnabled || session.googleLinked;
  if(activeUser && session.user && activeUser!==session.user.id) {await storage('delete');draft=null;photoBlob=null;$('#remove-photo')?.click();$('#commerce-result').hidden=true;}
  activeUser=session.user?.id||null;
  $('#commerce-account-label').textContent=session.user?`${session.user.email} · ${session.balance} ${session.mode==='test'?'test ':''}credits`:'Your account';
  $('#commerce-account').hidden=Boolean(session.user);$('#commerce-logout').hidden=!session.user;$('#commerce-billing').hidden=!session.user;
  if(session.user && $('[data-generator]')) {const {jobs}=await api('/api/jobs');latestJob=jobs[0]||null;$('#commerce-history').hidden=!latestJob;}
  else {latestJob=null;$('#commerce-history').hidden=true;}
  updateGenerator();
  if(session.user && location.pathname==='/pricing') {
    const {orders}=await api('/api/orders');const list=$('#commerce-orders');list.replaceChildren();list.hidden=!orders.length;
    for(const order of orders.slice(0,5)) {const p=document.createElement('p');p.textContent=`${session.plans[order.plan_id]?.name||'Plan'} · ${order.status.replaceAll('_',' ')} · ${new Date(order.created_at).toLocaleDateString()}`;list.append(p);}
  }
}
function busy(button,task) {
  if(button.disabled)return;
  button.disabled=true;task().catch(error=>status(error.message,true)).finally(()=>button.disabled=false);
}
document.querySelectorAll('[data-plan]').forEach(button=>{
  button.onclick=()=>busy(button,async()=>{
    await sessionReady;if(!session?.user) {openAuth(()=>checkout(button));return;}await checkout(button);
  });
});
async function checkout(button) {
  await saveDraft();status('Opening secure checkout…');
  const data=await api('/api/checkout',{planId:button.dataset.plan,draftId:draft?.id||''});
  sessionStorage.setItem('bb-pending-order',data.orderId);location.assign(data.checkoutUrl);
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function paymentStatus(keepPolling=false) {
  const order=new URL(location.href).searchParams.get('checkout')||sessionStorage.getItem('bb-pending-order');
  if(!order || !/^[a-f0-9-]{36}$/.test(order))return;
  $('#payment-return').hidden=false;
  if(!session?.user) {status('Sign in to check your payment and return to your photo.');return;}
  for(let i=0;i<(keepPolling?20:1);i++) {
    let data;
    try {data=await api(`/api/orders/${order}`);} catch(error) {
      if(error.code==='ORDER_NOT_FOUND') {clearPaymentReturn();status('This order is no longer available for this account. Check your account or choose a plan.',true);return;}
      throw error;
    }
    if(data.credited) {clearPaymentReturn();session.balance=data.balance;updateGenerator();status(`Payment confirmed. ${data.balance} ${data.mode==='test'?'test ':''}credits are ready. Return to your photo to continue.`);await refresh();return;}
    if(['checkout_failed','failed','canceled','cancelled','expired','refunded'].includes(data.order?.status)) {clearPaymentReturn();status('This checkout has ended. Check your account or choose a plan to continue.');return;}
    status('Payment has not been confirmed yet. Credits are issued only after confirmation. You can return to your photo or check again.');
    if(i<19 && keepPolling)await pause(1500);
  }
}
function clearPaymentReturn() {
  sessionStorage.removeItem('bb-pending-order');$('#payment-return').hidden=true;
  const url=new URL(location.href);url.searchParams.delete('checkout');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}
$('#check-payment').onclick=()=>busy($('#check-payment'),()=>paymentStatus());
function renderResult(job) {
  const result=$('#commerce-result');result.replaceChildren();result.hidden=false;
  const close=document.createElement('button');close.type='button';close.className='commerce-result-close';close.textContent='Close result';close.onclick=()=>{pollController?.abort();result.hidden=true;};result.append(close);
  latestJob=job;$('#commerce-history').hidden=false;
  const title=document.createElement('h2');title.textContent=job.status==='succeeded'?(job.mock?'Reference video ready':'Your video is ready'):job.status==='failed'?'Generation failed':'Preparing your video…';result.append(title);
  const details=document.createElement('p');details.textContent=`Video ${job.id} · ${job.resolution}P · ${job.format} · ${job.credits} credits`;result.append(details);
  if(job.status==='succeeded') {
    const note=document.createElement('p');note.textContent='Review the video and audio before downloading or sharing.';
    const video=document.createElement('video');video.src=job.resultUrl;video.controls=true;video.playsInline=true;video.preload='metadata';
    const download=document.createElement('a');download.href=job.resultUrl;download.download='burning-bridges-video.mp4';download.textContent='Download video';
    result.append(note,video,download);
  } else if(job.status==='failed') {const note=document.createElement('p');note.textContent='The job did not deliver a result. Its credits have been returned.';result.append(note);}
}
async function pollJob(id) {
  pollController?.abort();const controller=new AbortController();pollController=controller;
  for(let attempt=0;attempt<25 && !controller.signal.aborted;attempt++) {
    const data=await api(`/api/jobs/${id}`);if(controller.signal.aborted)return;
    session.balance=data.balance;updateGenerator();renderResult(data.job);
    if(['succeeded','failed'].includes(data.job.status)) {
      if(draft) {delete draft.requestKey;await storage('put',draft);}return;
    }
    await pause(1200);
  }
  status('Your job is still being processed. Refresh this page to check its status.');
}
const generateButton=$('[data-generator]');
if(generateButton)generateButton.onclick=()=>busy(generateButton,async()=>{
  await sessionReady;
  await saveDraft();
  if(!session?.user || session.balance<costFor[$('#resolution').value]) {location.assign('/pricing');return;}
  if(!photoBlob) {status('Choose a photo before generating a video.',true);$('#upload-button').focus();return;}
  $('#commerce-result').hidden=true;status('Submitting your video…');
  draft.requestKey=draft.requestKey||crypto.randomUUID();await storage('put',draft);
  const data=await api('/api/jobs',{draftId:draft.id,requestKey:draft.requestKey,resolution:draft.resolution,format:draft.format});
  session.balance=data.balance;updateGenerator();renderResult(data.job);$('#commerce-result').scrollIntoView({behavior:'smooth',block:'center'});await pollJob(data.job.id);
});
$('#photo-upload')?.addEventListener('change',event=>{
  const file=event.target.files[0];if(!file || !file.type.startsWith('image/') || file.size>8*1024*1024)return;
  photoReady=(async()=>{
    try {const image=await createImageBitmap(file);image.close();pollController?.abort();$('#commerce-result').hidden=true;photoBlob=file;draft={id:crypto.randomUUID(),blob:file,resolution:$('#resolution').value,format:$('#format').value,updatedAt:Date.now(),userId:session?.user?.id||null};await storage('put',draft);status('Photo saved in this browser. It will be here when you return from checkout.');}
    catch {photoBlob=null;draft=null;$('#remove-photo').click();status('Choose a valid image that your browser can display.',true);throw Error('Choose a valid image before continuing.');}
  })();
  photoReady.catch(()=>{});
});
$('#remove-photo')?.addEventListener('click',()=>{
  pollController?.abort();$('#commerce-result').hidden=true;photoBlob=null;draft=null;storage('delete').catch(()=>status('We could not clear the saved photo. Try again.',true));
});
for(const id of ['resolution','format'])$(`#${id}`)?.addEventListener('change',()=>{
  if(draft)delete draft.requestKey;updateGenerator();saveDraft().catch(()=>status('Your settings could not be saved. Try again.',true));
});
async function restoreDraft() {
  draft=await storage('get');
  if(draft && (Date.now()-draft.updatedAt>7*86400000 || (draft.userId && session?.user && draft.userId!==session.user.id))) {await storage('delete');draft=null;}
  if(!draft?.blob)return;
  photoBlob=draft.blob;
  if($('#photo-preview')) {
    $('#photo-preview').src=URL.createObjectURL(photoBlob);$('#photo-preview').hidden=false;$('#upload-button').hidden=true;$('#remove-photo').hidden=false;
    const count=$('#burning-bridges-ai-generator .tabular-nums');if(count)count.textContent='1 / 1';
    $('#resolution').value=draft.resolution;$('#format').value=draft.format;$('#required-credits').textContent=costFor[draft.resolution];
  } else if(location.pathname==='/pricing') {
    const saved=$('#saved-draft');saved.hidden=false;const image=document.createElement('img');image.src=URL.createObjectURL(photoBlob);image.alt='Your saved photo';const text=document.createElement('p');text.textContent=`Photo saved · ${draft.resolution}P · ${draft.format} · ${costFor[draft.resolution]} credits per video`;saved.append(image,text);
  }
  updateGenerator();
}
async function start() {
  try {await sessionReady;
    const authUrl=new URL(location.href),authError=authUrl.searchParams.get('auth_error'),authSuccess=authUrl.searchParams.get('auth_success');
    if(authError || authSuccess) {
      authUrl.searchParams.delete('auth_error');authUrl.searchParams.delete('auth_success');history.replaceState(history.state,'',authUrl.pathname+authUrl.search+authUrl.hash);
      if(authError){openAuth();$('#auth-error').textContent=messages[authError]||messages.GOOGLE_LOGIN_FAILED;}
      else status(authSuccess==='linked'?'Google has been linked to your account. Your credits and orders are unchanged.':'Signed in with Google. Your account is ready.');
    }
    await restoreDraft();await paymentStatus(Boolean(new URL(location.href).searchParams.has('checkout')));
  } catch(error) {status(error.message,true);}
}
const sessionReady=refresh();
start();
