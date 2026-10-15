// Exit-intent offer: one display per tab session, with the site's actual pack price.
const shownKey = 'bb:offer-popup-shown:v1';
const excluded = ['/pricing', '/privacy-policy', '/terms-of-service', '/refund-policy', '/create', '/login', '/auth', '/result', '/account', '/admin'];
const pathname = location.pathname.replace(/\/+$/, '') || '/';
const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  ? new URLSearchParams(location.search).get('offer-preview') : null;

if (!excluded.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
  let shown = false;
  try { shown = sessionStorage.getItem(shownKey) === '1'; }
  catch { /* Storage may be unavailable; still limit this document to one display. */ }
  if (localPreview === '1') createOffer();
  else if (localPreview === 'teaser') createTeaser();
  else if (!shown) setupOffer();
}

function setupOffer() {
  let displayed = false;
  let previousScroll = Math.max(0, window.scrollY);
  let readEnough = false;
  let upwardDistance = 0;
  let upwardStarted = 0;
  let foregroundMs = 0;
  let visibleSince = null;
  const isMobile = () => window.matchMedia('(max-width: 767px), (hover: none)').matches;
  const active = () => document.visibilityState === 'visible' && document.hasFocus();
  const elapsed = () => foregroundMs + (visibleSince === null ? 0 : performance.now() - visibleSince);

  function updateForeground() {
    if (visibleSince !== null) foregroundMs += performance.now() - visibleSince;
    visibleSince = active() ? performance.now() : null;
    previousScroll = Math.max(0, window.scrollY);
    upwardDistance = 0;
  }
  function stopListening() {
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', updateForeground);
    window.removeEventListener('focus', updateForeground);
    window.removeEventListener('blur', updateForeground);
  }
  function onMouseLeave(event) {
    if (!isMobile() && elapsed() >= 8000 && event.clientY <= 0) showOffer(false);
  }
  function onScroll() {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const currentScroll = Math.min(maxScroll, Math.max(0, window.scrollY));
    if (maxScroll > 0 && currentScroll / maxScroll >= .4) readEnough = true;
    const delta = previousScroll - currentScroll;
    previousScroll = currentScroll;
    if (!isMobile() || !active() || elapsed() < 10000 || !readEnough || delta <= 0) {
      upwardDistance = 0;
      return;
    }
    const now = performance.now();
    if (!upwardDistance || now - upwardStarted > 600) {
      upwardStarted = now;
      upwardDistance = 0;
    }
    upwardDistance += delta;
    // Require an intentional upward gesture: at least 120px within 600ms.
    if (upwardDistance >= 120) showOffer(true);
  }
  function showOffer(mobile) {
    if (displayed || !active()) return;
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    displayed = true;
    stopListening();
    try { sessionStorage.setItem(shownKey, '1'); }
    catch { /* The in-memory displayed guard still prevents repeated offers. */ }
    if (mobile) createTeaser();
    else createOffer('exit_top');
  }
  updateForeground();
  document.addEventListener('visibilitychange', updateForeground);
  window.addEventListener('focus', updateForeground);
  window.addEventListener('blur', updateForeground);
  document.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('scroll', onScroll, {passive: true});
}

function createTeaser() {
  const teaser = document.createElement('aside');
  teaser.className = 'bb-offer-teaser';
  teaser.setAttribute('aria-label', 'Credit pack offer');
  teaser.innerHTML = `
    <button type="button" class="bb-offer-teaser-open" aria-haspopup="dialog">
      <span><strong>Credit packs from $9.90</strong><span>100 credits · No subscription required</span></span>
      <span class="bb-offer-teaser-action">View offer <span aria-hidden="true">→</span></span>
    </button>
    <button type="button" class="bb-offer-teaser-close" aria-label="Dismiss credit offer">×</button>`;
  teaser.querySelector('.bb-offer-teaser-open').addEventListener('click', () => {
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    // Keep the teaser in place so closing the dialog restores focus to its button.
    trackOffer('open', {surface:'teaser', trigger:'scroll_up'});
    createOffer('teaser_click');
  });
  teaser.querySelector('.bb-offer-teaser-close').addEventListener('click', () => {
    trackOffer('close', {surface:'teaser', trigger:'scroll_up', reason:'close_button'});
    teaser.remove();
  });
  document.body.append(teaser);
  trackOffer('view', {surface:'teaser', trigger:'scroll_up'});
  prefetchPricing();
}

function trackOffer(action, details) {
  try { window.BBAnalytics?.offer(action, details); } catch { /* Tracking must never delay or break the offer. */ }
}

function prefetchPricing() {
  if (navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || '') || document.querySelector('link[data-bb-pricing-prefetch]')) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';link.href = '/pricing';link.as = 'document';link.dataset.bbPricingPrefetch = '';
  document.head.append(link);
}

function createOffer(trigger = 'exit_top') {
  const analyticsDetails = {surface:'modal', trigger};
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
        <a class="bb-offer-cta" href="/pricing">View credit packs</a>
        <button type="button" class="bb-offer-dismiss">No thanks, close this</button>
      </div>
      <p class="bb-offer-error" role="alert" hidden></p>
    </div>`;
  let closeReason = 'escape';
  const close = reason => { closeReason = reason; dialog.close(); };
  const cta = dialog.querySelector('.bb-offer-cta');
  dialog.querySelector('.bb-offer-close').addEventListener('click', () => close('close_button'));
  dialog.querySelector('.bb-offer-dismiss').addEventListener('click', () => close('dismiss_button'));
  dialog.addEventListener('click', event => { if (event.target === dialog) close('backdrop'); });
  dialog.addEventListener('cancel', () => { closeReason = 'escape'; });
  dialog.addEventListener('close', () => {
    trackOffer('close', {...analyticsDetails, reason:closeReason});
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
  cta.addEventListener('click', event => {
    if (navigating) { event.preventDefault(); return; }
    trackOffer('click', analyticsDetails);
    // Ordinary and modified links stay native when there is no unsaved photo.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let pending;
    try {
      const commerce = window.BBCommerce;
      pending = commerce?.preparePricingNavigation ? commerce.preparePricingNavigation() : commerce?.saveDraft?.();
    } catch (error) { pending = Promise.reject(error); }
    if (!pending) return;
    event.preventDefault();
    navigating = true;
    cta.setAttribute('aria-disabled', 'true');
    cta.setAttribute('aria-busy', 'true');
    const error = dialog.querySelector('.bb-offer-error');
    error.hidden = true;
    const originalLabel = cta.textContent;
    cta.textContent = 'Saving photo…';
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Draft save timed out')), 1500); });
    Promise.race([pending, timeout]).then(() => {
      location.assign('/pricing');
    }).catch(() => {
      navigating = false;
      cta.removeAttribute('aria-disabled');
      cta.removeAttribute('aria-busy');
      cta.textContent = originalLabel;
      error.textContent = 'Your photo could not be saved yet. Keep this page open and try again.';
      error.hidden = false;
    }).finally(() => clearTimeout(timer));
  });
  cta.addEventListener('auxclick', event => { if (event.button === 1) trackOffer('click', analyticsDetails); });
  document.body.append(dialog);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  trackOffer('view', analyticsDetails);
  prefetchPricing();
}
