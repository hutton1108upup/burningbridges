(() => {
  'use strict';
  const button = document.querySelector('[data-cheba-theme]');
  if (!button) return;
  button.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    button.textContent = dark ? '☀' : '☾';
    button.setAttribute('aria-pressed', String(!dark));
  });
})();
