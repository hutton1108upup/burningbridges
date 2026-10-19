(() => {
  'use strict';
  const toggle = document.querySelector('.babydoll-theme');
  toggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.textContent = dark ? 'Light mode' : 'Dark mode';
  });
})();
