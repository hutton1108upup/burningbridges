(() => {
  'use strict';
  const slots = [...document.querySelectorAll('.portrait-slot')].map(element => ({
    element,
    input: element.querySelector('input'),
    image: element.querySelector('.photo-result img'),
    result: element.querySelector('.photo-result'),
    status: element.querySelector('.photo-status'),
    remove: element.querySelector('.remove-photo'),
    pair: document.querySelector(`#${element.dataset.role}-pair`),
    empty: document.querySelector(`#${element.dataset.role}-empty`),
    url: null,
    ready: false,
    version: 0,
  }));
  const update = () => {
    const count = slots.filter(slot => slot.ready).length;
    document.querySelector('#pair-status').textContent = `${count}/2 portraits ready`;
    document.querySelector('#pair-preview').hidden = count === 0;
    slots.forEach(slot => { slot.empty.hidden = slot.ready; });
  };
  const clear = slot => {
    slot.version++;
    slot.ready = false;
    if (slot.url) URL.revokeObjectURL(slot.url);
    slot.url = null;
    slot.image.removeAttribute('src');
    slot.pair.removeAttribute('src');
    slot.result.hidden = true;
    slot.input.value = '';
    slot.status.classList.remove('error');
    update();
  };
  const fail = (slot, message) => {
    clear(slot);
    slot.status.textContent = message;
    slot.status.classList.add('error');
  };
  const select = async (slot, file) => {
    if (!file) return;
    clear(slot);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      fail(slot, 'Choose a JPG, PNG or WebP photo.'); return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      fail(slot, 'Choose a non-empty photo up to 10 MB.'); return;
    }
    const version = slot.version;
    slot.status.textContent = 'Opening your photo…';
    slot.url = URL.createObjectURL(file);
    slot.image.src = slot.url;
    try {
      await slot.image.decode();
      if (slot.version !== version) return;
      slot.pair.src = slot.url;
      slot.ready = true;
      slot.result.hidden = false;
      slot.status.textContent = 'Portrait ready. It stays on your device.';
      update();
    } catch {
      if (slot.version === version) fail(slot, 'This photo could not be opened. Try another image.');
    }
  };
  for (const slot of slots) {
    slot.input.addEventListener('change', () => select(slot, slot.input.files?.[0]));
    slot.remove.addEventListener('click', () => {
      clear(slot);
      slot.status.textContent = 'Photo removed. Choose another portrait.';
      slot.input.focus();
    });
    for (const type of ['dragenter', 'dragover']) slot.element.addEventListener(type, event => {
      event.preventDefault(); slot.element.classList.add('is-dragging');
    });
    slot.element.addEventListener('dragleave', event => {
      if (!slot.element.contains(event.relatedTarget)) slot.element.classList.remove('is-dragging');
    });
    slot.element.addEventListener('drop', event => {
      event.preventDefault(); slot.element.classList.remove('is-dragging');
      select(slot, event.dataTransfer?.files?.[0]);
    });
  }
  window.addEventListener('pagehide', event => {
    // A cached page keeps its in-memory portraits when returning from Pricing.
    if (event.persisted) return;
    slots.forEach(slot => { if (slot.url) URL.revokeObjectURL(slot.url); });
  });
  const originalPlayer = document.querySelector('.original-player');
  const originalButton = document.querySelector('#play-original').cloneNode(true);
  document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
      // Removing the iframe stops its audio without loading a third-party API.
      if (originalPlayer.querySelector('iframe')) originalPlayer.replaceChildren(originalButton.cloneNode(true));
    });
  });
  originalPlayer.addEventListener('click', event => {
    const button = event.target.closest('#play-original');
    if (!button) return;
    document.querySelectorAll('video').forEach(video => video.pause());
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/v-wdfQyUSb0?playsinline=1&rel=0&autoplay=1';
    frame.title = 'Stromae and Jamel Debbouze — Alors on danse, Made in Jamel (2010)';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
  });
})();
