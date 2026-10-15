// Exit-intent offer: one display per tab session, with the site's actual pack price.
const shownKey = 'bb:offer-popup-shown:v1';
const excluded = ['/pricing', '/privacy-policy', '/terms-of-service', '/refund-policy', '/create', '/login', '/auth', '/result', '/account', '/admin'];
const pathname = location.pathname.replace(/\/+$/, '') || '/';
const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  && new URLSearchParams(location.search).get('offer-preview') === '1';

if (!excluded.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
  let shown = false;
  try { shown = sessionStorage.getItem(shownKey) === '1'; }
  catch { /* Storage may be unavailable; still limit this document to one display. */ }
  if (localPreview) createOffer();
  else if (!shown) setupOffer();
}

function setupOffer() {
  let armed = false;
  let displayed = false;
  let previousScroll = window.scrollY;
  let scrolledDown = false;
  const timer = window.setTimeout(() => { armed = true; }, 4000);

  function stopListening() {
    window.clearTimeout(timer);
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('scroll', onScroll);
  }
  function onMouseLeave(event) {
    if (armed && event.clientY <= 50) showOffer();
  }
  function onScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > window.innerHeight * .6) scrolledDown = true;
    if (armed && scrolledDown && previousScroll - currentScroll > 36 && currentScroll < window.innerHeight * .4) showOffer();
    previousScroll = currentScroll;
  }
  function showOffer() {
    if (displayed || document.visibilityState !== 'visible') return;
    // Leave sign-in, plan details and other active dialogs undisturbed.
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    displayed = true;
    stopListening();
    try { sessionStorage.setItem(shownKey, '1'); }
    catch { /* The in-memory displayed guard still prevents repeated offers. */ }
    createOffer();
  }
  document.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('scroll', onScroll, {passive: true});
}

function createOffer() {
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  const dialog = document.createElement('dialog');
  dialog.className = 'bb-offer-dialog';
  dialog.setAttribute('aria-labelledby', 'bb-offer-title');
  dialog.setAttribute('aria-describedby', 'bb-offer-description');
  dialog.innerHTML = `
    <div class="bb-offer-card" tabindex="-1" autofocus>
      <button type="button" class="bb-offer-close" aria-label="Close offer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <span class="bb-offer-gift" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/></svg>
      </span>
      <h2 class="bb-offer-title" id="bb-offer-title">Wait — credit packs from $9.90</h2>
      <p class="bb-offer-description" id="bb-offer-description">The <strong>$9.90</strong> pack includes <strong>100 credits</strong> for one 720P, 16:9 party video. No subscription required. This pack’s credits are valid for 30 days.</p>
      <div class="bb-offer-actions">
        <a class="bb-offer-cta" href="/pricing">Create my first video</a>
        <button type="button" class="bb-offer-dismiss">No thanks, close this</button>
      </div>
      <p class="bb-offer-error" role="alert" hidden></p>
    </div>`;
  const close = () => dialog.close();
  const cta = dialog.querySelector('.bb-offer-cta');
  dialog.querySelector('.bb-offer-close').addEventListener('click', close);
  dialog.querySelector('.bb-offer-dismiss').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    dialog.remove();
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({preventScroll: true});
  }, {once: true});
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const first = dialog.querySelector('.bb-offer-close');
    const last = dialog.querySelector('.bb-offer-dismiss');
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.querySelector('.bb-offer-card'))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  let navigating = false;
  cta.addEventListener('click', async event => {
    // Preserve ordinary new-tab and modified-link behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    cta.setAttribute('aria-disabled', 'true');
    const error = dialog.querySelector('.bb-offer-error');
    error.hidden = true;
    try {
      await window.BBCommerce?.saveDraft();
      location.assign('/pricing');
    } catch {
      navigating = false;
      cta.removeAttribute('aria-disabled');
      error.textContent = 'Your photo could not be saved. Keep this page open and try again.';
      error.hidden = false;
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
