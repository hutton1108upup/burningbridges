(() => {
  'use strict';
  const controls = document.querySelector('[data-guide-filters]');
  if (!controls) return;
  const cards = [...document.querySelectorAll('.guide-hub-card')];
  const buttons = [...controls.querySelectorAll('[data-guide-filter]')];
  const topic = controls.querySelector('#guide-topic');
  const count = controls.querySelector('[data-guide-count]');
  let type = 'all';
  const update = () => {
    let visible = 0;
    for (const card of cards) {
      card.hidden = !(type === 'all' || card.dataset.guideType === type)
        || !(topic.value === 'all' || card.dataset.guideTopic === topic.value);
      if (!card.hidden) visible++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.guideFilter === type));
    count.textContent = visible ? `${visible} ${visible === 1 ? 'guide' : 'guides'}` : 'No guides match. Choose another topic or All guides.';
  };
  for (const button of buttons) button.addEventListener('click', () => {
    type = button.dataset.guideFilter;
    update();
  });
  topic.addEventListener('change', update);
  controls.hidden = false;
  update();
})();
