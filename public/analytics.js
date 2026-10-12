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

  // Clarity records the page URL. Do not record URLs containing query data.
  // Photo/input areas are explicitly masked in HTML before the script loads.
  if (!location.search) {
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    load('https://www.clarity.ms/tag/' + clarityId);
  }
})();
