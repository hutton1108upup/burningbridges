(() => {
  'use strict';
  document.querySelectorAll('[data-photo-workspace]').forEach(workspace => {
    const status = workspace.querySelector('[data-photo-status]');
    const slots = [...workspace.querySelectorAll('[data-photo-slot]')];
    const states = slots.map(() => ({url: null, version: 0, ready: false}));
    const announce = () => {
      const count = states.filter(state => state.ready).length;
      status.classList.remove('error');
      status.textContent = slots.length === 1
        ? (count ? 'Photo selected. It stays on this device.' : 'Choose a photo to preview it here. It stays on this device.')
        : (count ? `${count} of ${slots.length} photos selected. Your photos stay on this device.` : 'Choose your photos to preview them here. They stay on this device.');
    };
    slots.forEach((slot, index) => {
      const state = states[index];
      const input = slot.querySelector('input');
      const preview = slot.querySelector('[data-photo-preview]');
      const result = slot.querySelector('[data-photo-result]');
      const remove = slot.querySelector('[data-photo-remove]');
      const name = input.dataset.photoLabel;
      const clear = () => {
        state.version++;
        if (state.url) URL.revokeObjectURL(state.url);
        state.url = null; state.ready = false;
        input.value = ''; preview.removeAttribute('src'); preview.hidden = true; result.hidden = true;
        delete slot.dataset.photoReady;
        delete input.dataset.generationReady;
      };
      const fail = message => { clear(); status.textContent = message; status.classList.add('error'); };
      input.addEventListener('change', async () => {
        const file = input.files?.[0]; if (!file) return;
        clear();
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { fail(`${name}: choose a JPG, PNG or WebP photo.`); return; }
        if (!file.size || file.size > 10 * 1024 * 1024) { fail(`${name}: choose a non-empty photo up to 10 MB.`); return; }
        const version = state.version;
        state.url = URL.createObjectURL(file); preview.src = state.url;
        try {
          await preview.decode();
          if (version !== state.version) return;
          state.ready = true; preview.hidden = false; slot.dataset.photoReady = 'true'; input.dataset.generationReady = 'true'; result.hidden = false; announce();
        } catch {
          if (version !== state.version) return;
          fail(`${name}: this image could not be opened. Try another photo.`);
        }
      });
      remove.addEventListener('click', () => { clear(); announce(); input.focus(); });
      window.addEventListener('pagehide', () => { if (state.url) URL.revokeObjectURL(state.url); });
      window.addEventListener('pageshow', event => { if (event.persisted) { clear(); announce(); } });
    });
  });
  const load = video => { video.src = video.dataset.src; video.removeAttribute('data-src'); };
  const lazy = document.querySelectorAll('video[data-src]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { load(entry.target); observer.unobserve(entry.target); }
    }, {rootMargin:'200px'});
    lazy.forEach(video => observer.observe(video));
  } else lazy.forEach(load);
  document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); }));
    video.addEventListener('error', () => {
      const figure = video.closest('figure'); if (!figure || figure.querySelector('.video-error')) return;
      const message = document.createElement('p'); message.className = 'video-error credit-note'; message.setAttribute('role', 'status'); message.textContent = 'This clip could not be played. ';
      const link = document.createElement('a'); link.href = video.currentSrc || video.dataset.src || video.querySelector('source')?.src || '/examples'; link.textContent = 'Open the video file'; message.append(link); figure.append(message);
    });
  });
})();
