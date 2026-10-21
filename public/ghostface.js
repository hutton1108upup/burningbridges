(() => {
  'use strict';
  const toggle = document.querySelector('.ghostface-theme');
  toggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.textContent = dark ? 'Light mode' : 'Dark mode';
  });
})();
