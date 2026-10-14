(() => {
  'use strict';
  const panel = document.querySelector('.prepare-panel');
  if (!panel) return;
  const slots = [...panel.querySelectorAll('.photo-slot')];
  const grid = panel.querySelector('.upload-grid');
  const status = panel.querySelector('#photo-status');
  const urls = new Map();
  const versions = new Map();
  const selected = new Set();
  let solo = false;
  function updateStatus() {
    const count = solo ? Number(selected.has(0)) : selected.size;
    status.textContent = count === (solo ? 1 : 3)
      ? 'Your cast is ready to preview. Video generation is coming soon; no credits have been charged.'
      : `${count} of ${solo ? 1 : 3} photos selected. Choose photos to preview your cast.`;
  }
  function clearSlot(index) {
    versions.set(index, (versions.get(index) || 0) + 1);
    if (urls.has(index)) URL.revokeObjectURL(urls.get(index));
    urls.delete(index);
    selected.delete(index);
    const slot = slots[index];
    const img = slot.querySelector('img');
    img.removeAttribute('src'); img.hidden = true;
    slot.querySelector('.upload-empty').hidden = false;
    slot.querySelector('.remove').hidden = true;
    slot.querySelector('input').value = '';
  }
  slots.forEach((slot, index) => {
    const input = slot.querySelector('input');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      clearSlot(index);
      const version = versions.get(index);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
        status.textContent = 'Choose a JPG, PNG or WebP image up to 8MB.'; return;
      }
      const url = URL.createObjectURL(file);
      const probe = new Image();
      probe.src = url;
      try {
        await probe.decode();
        if (versions.get(index) !== version) { URL.revokeObjectURL(url); return; }
        if (probe.naturalWidth < 512 || probe.naturalHeight < 512) {
          URL.revokeObjectURL(url); status.textContent = 'Choose a photo at least 512 × 512 pixels.'; return;
        }
        urls.set(index, url); selected.add(index);
        const img = slot.querySelector('img'); img.src = url; img.hidden = false;
        slot.querySelector('.upload-empty').hidden = true;
        slot.querySelector('.remove').hidden = false;
        updateStatus();
      } catch {
        URL.revokeObjectURL(url);
        if (versions.get(index) === version) status.textContent = 'This image could not be read. Choose another JPG, PNG or WebP.';
      }
    });
    slot.querySelector('.remove').addEventListener('click', () => { clearSlot(index); updateStatus(); });
  });
  panel.querySelectorAll('input[name="cast"]').forEach(input => input.addEventListener('change', () => {
    solo = input.value === 'solo';
    grid.classList.toggle('solo', solo);
    slots.slice(1).forEach((slot, offset) => {
      slot.hidden = solo;
      slot.querySelector('input').disabled = solo;
      if (solo) clearSlot(offset + 1);
    });
    panel.querySelector('.solo-note').hidden = !solo;
    updateStatus();
  }));
  window.addEventListener('pagehide', () => {
    slots.forEach((_, index) => clearSlot(index));
    updateStatus();
  });
})();
