(() => {
  'use strict';
  const panel = document.querySelector('.cast-panel');
  if (!panel) return;
  const slots = [...panel.querySelectorAll('.photo-slot')];
  const status = panel.querySelector('#photo-status');
  const selected = new Set();
  const urls = new Map();
  const versions = new Map();
  const update = () => { status.textContent = `${selected.size} of 2 photos selected. ${selected.size === 2 ? 'Your cast is ready. Check story support and plans on Pricing.' : 'Choose one clear photo for each role.'}`; };
  function clear(index) {
    versions.set(index, (versions.get(index) || 0) + 1);
    if (urls.has(index)) URL.revokeObjectURL(urls.get(index));
    urls.delete(index); selected.delete(index);
    const slot = slots[index];
    slot.querySelector('img').removeAttribute('src');
    slot.querySelector('img').hidden = true;
    slot.querySelector('.upload-empty').hidden = false;
    slot.querySelector('.remove').hidden = true;
    slot.querySelector('input').value = '';
  }
  slots.forEach((slot, index) => {
    const input = slot.querySelector('input');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      clear(index);
      const version = versions.get(index);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
        status.textContent = 'Choose a JPG, PNG or WebP photo no larger than 8 MB.'; return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image(); image.src = url;
      try {
        await image.decode();
        if (versions.get(index) !== version) { URL.revokeObjectURL(url); return; }
        if (image.naturalWidth < 300 || image.naturalHeight < 300) {
          URL.revokeObjectURL(url); status.textContent = 'Choose a photo at least 300 × 300 pixels.'; return;
        }
        urls.set(index, url); selected.add(index);
        const preview = slot.querySelector('img'); preview.src = url; preview.hidden = false;
        slot.querySelector('.upload-empty').hidden = true;
        slot.querySelector('.remove').hidden = false;
        update();
      } catch {
        URL.revokeObjectURL(url);
        if (versions.get(index) === version) status.textContent = 'This photo could not be opened. Choose another image.';
      }
    });
    slot.querySelector('.remove').addEventListener('click', () => { clear(index); update(); });
  });
  window.addEventListener('pagehide', () => slots.forEach((_, index) => clear(index)));
  window.addEventListener('pageshow', update);
})();
