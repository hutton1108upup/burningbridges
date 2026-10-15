// Public project IDs, not credentials. Production traffic only.
(() => {
  'use strict';
  const origin = 'https://burningbridgesaivideo.pro';
  const measurementId = 'G-LSG4H51443';
  const clarityId = 'ywbipqd0b5';
  if (location.origin !== origin || window.__burningBridgesAnalytics) return;
  window.__burningBridgesAnalytics = true;

  const load = (src) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.append(script);
  };
  const cleanReferrer = () => {
    try { const url = new URL(document.referrer); return url.origin + url.pathname; }
    catch { return ''; }
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const attributionKey = 'bb:offer-attribution:v1';
  const purchaseKey = 'bb:ga4-purchases:v1';
  const knownPaths = new Set(['/', '/pricing', '/examples', '/blog', '/burning-bridges-video-ai', '/burning-bridges-music-video-ai', '/burning-bridges-ai-prompt', '/gas-station-dance-ai', '/ozil-goal-ai-video', '/zombie-pet-ai-video', '/zombie-love-story-ai', '/flying-entrance', '/guides/photo-guide', '/guides/troubleshooting', '/blog/burning-bridges-ai-free', '/blog/burning-bridges-ai-tools-compared', '/blog/burning-bridges-trend-explained', '/blog/how-to-make-burning-bridges-video', '/privacy-policy', '/terms-of-service', '/refund-policy']);
  const safePath = path => knownPaths.has(path) ? path : 'other';
  const surfaces = new Set(['modal', 'teaser']);
  const triggers = new Set(['exit_top', 'scroll_up', 'teaser_click']);
  const plans = new Set(['starter', 'creator', 'studio', 'pack100', 'pack200', 'pack500']);
  const memoryPurchases = new Set();
  let memoryAttribution = null;
  const readAttribution = () => {
    let value = memoryAttribution;
    try { value = JSON.parse(window.sessionStorage?.getItem(attributionKey) || 'null') || value; } catch { /* Analytics storage must not block navigation. */ }
    if (!value || !['viewed', 'clicked'].includes(value.engagement) || !surfaces.has(value.surface) || !triggers.has(value.trigger)
      || !knownPaths.has(value.source_path) || !Number.isFinite(value.at) || Date.now() - value.at > 1800000 || value.at > Date.now()) return null;
    return {engagement:value.engagement, surface:value.surface, trigger:value.trigger, source_path:value.source_path, at:value.at};
  };
  const context = () => {
    const value = readAttribution();
    return value ? {offer_id:'credit_pack_990', offer_engagement:value.engagement, offer_surface:value.surface, offer_trigger:value.trigger, offer_source_path:value.source_path} : {offer_engagement:'none'};
  };
  const emit = (name, params) => {
    try {
      // Queue immediately. Never wait for an analytics callback before navigating.
      window.gtag('event', name, {...params, send_to:measurementId, page_location:origin + (safePath(location.pathname) === 'other' ? '/' : location.pathname), page_referrer:cleanReferrer(), transport_type:'beacon'});
      return true;
    } catch { return false; }
  };
  const offer = (action, details = {}) => {
    if (!['view', 'close', 'click', 'open'].includes(action) || !surfaces.has(details.surface) || !triggers.has(details.trigger)) return;
    const params = {offer_id:'credit_pack_990', offer_surface:details.surface, offer_trigger:details.trigger, offer_source_path:safePath(location.pathname)};
    if (action === 'view' || action === 'click') {
      const previous = readAttribution();
      memoryAttribution = {engagement:action === 'click' || previous?.engagement === 'clicked' ? 'clicked' : 'viewed', surface:details.surface, trigger:details.trigger, source_path:params.offer_source_path, at:Date.now()};
      try { window.sessionStorage?.setItem(attributionKey, JSON.stringify(memoryAttribution)); } catch { /* Best effort; no cross-page attribution when storage is blocked. */ }
    }
    if (action === 'click') params.destination_path = '/pricing';
    if (action === 'close' && ['close_button', 'dismiss_button', 'backdrop', 'escape'].includes(details.reason)) params.close_method = details.reason;
    emit('offer_' + action, params);
  };
  const item = data => ({item_id:data.item_id, item_name:data.item_id, price:data.value, quantity:1});
  const validCommerce = data => data && plans.has(data.item_id) && data.currency === 'USD' && Number.isFinite(data.value) && data.value > 0;
  window.BBAnalytics = Object.freeze({
    offer,
    beginCheckout(data) {
      if (data?.mode !== 'prod' || !validCommerce(data.analytics)) return;
      emit('begin_checkout', {...context(), currency:'USD', value:data.analytics.value, items:[item(data.analytics)]});
    },
    purchase(data) {
      const receipt = data?.analytics;
      if (data?.mode !== 'prod' || data.credited !== true || !validCommerce(receipt)
        || !/^[a-f0-9-]{36}:\d+$/.test(receipt.transaction_id || '') || !/^[a-f0-9-]{36}$/.test(data.order?.id || '')
        || !receipt.transaction_id.startsWith(data.order.id + ':')) return;
      let seen = [];
      try { const stored = JSON.parse(window.localStorage?.getItem(purchaseKey) || '[]'); if (Array.isArray(stored)) seen = stored.filter(id => typeof id === 'string').slice(-100); } catch { /* GA4 also deduplicates transaction IDs. */ }
      if (memoryPurchases.has(receipt.transaction_id) || seen.includes(receipt.transaction_id)) return;
      if (!emit('purchase', {...context(), transaction_id:receipt.transaction_id, currency:'USD', value:receipt.value, items:[item(receipt)]})) return;
      memoryPurchases.add(receipt.transaction_id);
      try { window.localStorage?.setItem(purchaseKey, JSON.stringify([...seen, receipt.transaction_id].slice(-100))); } catch { /* In-memory and GA4 transaction deduplication remain. */ }
    },
  });
  window.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  // One default page view per document; enhanced measurement is disabled in GA4.
  window.gtag('config', measurementId, {
    page_location: origin + location.pathname,
    page_referrer: cleanReferrer(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  load('https://www.googletagmanager.com/gtag/js?id=' + measurementId);
  if (location.pathname === '/pricing') emit('pricing_view', context());

  // Clarity records the page URL. Do not record URLs containing query data.
  // Photo/input areas are explicitly masked in HTML before the script loads.
  if (!location.search) {
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    load('https://www.clarity.ms/tag/' + clarityId);
  }
})();
