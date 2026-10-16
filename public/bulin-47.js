(() => {
  'use strict';
  const input = document.querySelector('#bulin-photo');
  const preview = document.querySelector('#bulin-photo-preview');
  const result = document.querySelector('.photo-result');
  const status = document.querySelector('#photo-status');
  const remove = document.querySelector('#remove-photo');
  let objectUrl = null;
  let selection = 0;
  const clear = () => {
    selection++;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    preview.removeAttribute('src');
    result.hidden = true;
    input.value = '';
    status.classList.remove('error');
  };
  const fail = message => {
    clear();
    status.textContent = message;
    status.classList.add('error');
  };
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    clear();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      fail('Choose a JPG, PNG or WebP photo.'); return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      fail('Choose a photo up to 10 MB. The file cannot be empty.'); return;
    }
    const current = selection;
    objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    try {
      await preview.decode();
      if (current !== selection) return;
      result.hidden = false;
      status.textContent = 'Photo ready to preview. It stays on your device.';
    } catch {
      if (current !== selection) return;
      fail('This photo could not be opened. Try another JPG, PNG or WebP file.');
    }
  });
  remove.addEventListener('click', () => {
    clear();
    status.textContent = 'Photo removed. You can choose another.';
    input.focus();
  });
  window.addEventListener('pagehide', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { clear(); status.textContent = 'Choose a portrait to see it on this device.'; }
  });
  const lazyVideos = document.querySelectorAll('video[data-src]');
  const load = video => { video.src = video.dataset.src; video.removeAttribute('data-src'); };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { load(entry.target); observer.unobserve(entry.target); }
    }, {rootMargin: '200px'});
    lazyVideos.forEach(video => observer.observe(video));
  } else lazyVideos.forEach(load);
  document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
    });
    video.addEventListener('error', () => {
      const figure = video.closest('figure');
      if (!figure || figure.querySelector('.video-error')) return;
      const message = document.createElement('p');
      message.className = 'video-error credit-note';
      message.setAttribute('role', 'status');
      message.textContent = 'The clip could not be played. ';
      const link = document.createElement('a');
      link.href = video.currentSrc || video.dataset.src || video.querySelector('source')?.src || '/examples';
      link.textContent = 'Open the reference clip';
      message.append(link); figure.append(message);
    });
  });
})();
