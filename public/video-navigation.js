(() => {
  'use strict';
  const menus = [...document.querySelectorAll('.video-project-nav')];
  const close = menu => {
    menu.querySelector('.video-project-toggle').setAttribute('aria-expanded', 'false');
    menu.querySelector('.video-project-menu').hidden = true;
  };
  menus.forEach((menu, index) => {
    const button = menu.querySelector('.video-project-toggle');
    const panel = menu.querySelector('.video-project-menu');
    panel.id = `video-project-menu-${index}`;
    button.setAttribute('aria-controls', panel.id);
    button.addEventListener('click', () => {
      const opening = panel.hidden;
      menus.forEach(close);
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {close(menu);button.focus();event.stopPropagation();}
    });
    menu.addEventListener('focusout', event => {if (!menu.contains(event.relatedTarget)) close(menu);});
  });
  document.addEventListener('click', event => menus.forEach(menu => {if (!menu.contains(event.target)) close(menu);}));
  const buttons = [...document.querySelectorAll('[data-video-filter]')];
  const cards = [...document.querySelectorAll('[data-video-category]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    let count = 0;
    cards.forEach(card => {card.hidden = button.dataset.videoFilter !== 'all' && card.dataset.videoCategory !== button.dataset.videoFilter;if (!card.hidden) count++;});
    document.querySelector('.video-results').textContent = `${count} ${count === 1 ? 'trend' : 'trends'}`;
  }));
})();
