// Local portrait preparation and reference playback; no upload or generation requests.
(() => {
  const photo = document.querySelector('#toc-photo');
  const preview = document.querySelector('#toc-photo-preview');
  const remove = document.querySelector('#toc-photo-remove');
  const status = document.querySelector('#toc-photo-status');
  let photoUrl;
  let photoVersion = 0;
  function clearPhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = undefined;
    preview.removeAttribute('src');
    preview.hidden = true;
    remove.hidden = true;
    photo.value = '';
    delete photo.dataset.generationReady;
    document.querySelector('#toc-upload-label').hidden = false;
    document.querySelector('#toc-photo-count').textContent = '0 / 1';
  }
  photo.addEventListener('change', async () => {
    const version = ++photoVersion;
    const file = photo.files[0];
    clearPhoto();
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      status.textContent = 'Choose a JPG, PNG or WebP photo up to 8 MB.';
      return;
    }
    const candidate = URL.createObjectURL(file);
    const image = new Image();
    image.src = candidate;
    try { await image.decode(); }
    catch {
      URL.revokeObjectURL(candidate);
      if (version === photoVersion) status.textContent = 'This image could not be opened. Choose another photo.';
      return;
    }
    if (version !== photoVersion) { URL.revokeObjectURL(candidate); return; }
    photoUrl = candidate;
    photo.dataset.generationReady = 'true';
    preview.src = photoUrl;
    preview.hidden = false;
    remove.hidden = false;
    document.querySelector('#toc-upload-label').hidden = true;
    document.querySelector('#toc-photo-count').textContent = '1 / 1';
    status.textContent = 'Photo selected. This preview stays on your device; no photo has been uploaded.';
  });
  remove.addEventListener('click', () => {
    photoVersion++;
    clearPhoto();
    status.textContent = 'Photo removed. Select another portrait.';
  });
  const toggle = document.querySelector('button[aria-label="Open navigation"]');
  const mobile = document.createElement('nav');
  mobile.className = 'toc-mobile-nav';
  mobile.id = 'toc-mobile-nav';
  mobile.hidden = true;
  mobile.setAttribute('aria-label', 'Mobile navigation');
  toggle.setAttribute('aria-controls', mobile.id);
  for (const [href, label] of [['/', 'Home'], ['/examples', 'Trends'], ['#how-it-works', 'The dance'], ['/pricing', 'Pricing'], ['/blog', 'Blog']]) {
    const link = document.createElement('a');
    link.href = href; link.textContent = label; mobile.append(link);
    link.addEventListener('click', () => { mobile.hidden = true; toggle.setAttribute('aria-expanded', 'false'); });
  }
  document.querySelector('header').append(mobile);
  toggle.addEventListener('click', () => {
    mobile.hidden = !mobile.hidden;
    toggle.setAttribute('aria-expanded', String(!mobile.hidden));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobile.hidden) { mobile.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
  });
  const player = document.querySelector('#toc-player');
  const videoStatus = document.querySelector('#toc-video-status');
  const choices = [...document.querySelectorAll('[data-toc-clip]')];
  let selectedVersion = 0;
  choices.forEach((button, index) => button.addEventListener('click', async () => {
    const version = ++selectedVersion;
    player.pause();
    player.poster = button.querySelector('img').src;
    player.src = button.dataset.src;
    player.muted = true;
    player.setAttribute('aria-label', `${button.dataset.title} reference video`);
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    document.querySelector('#toc-video-title').textContent = button.dataset.title;
    document.querySelector('#toc-clip-number').textContent = index ? '02 / 02' : '01 / 02';
    videoStatus.textContent = `Loading ${button.dataset.title}…`;
    try { await player.play(); }
    catch (error) {
      if (version !== selectedVersion || error.name === 'AbortError') return;
      videoStatus.textContent = 'Press play in the video player to watch the selected reference.';
    }
  }));
  player.addEventListener('play', () => { videoStatus.textContent = `Playing ${document.querySelector('#toc-video-title').textContent}. Use the player controls to turn sound on.`; });
  player.addEventListener('error', () => {
    videoStatus.replaceChildren('The video could not be loaded. ');
    const link = document.createElement('a');
    link.href = player.currentSrc || player.src;
    link.textContent = 'Open the video directly';
    videoStatus.append(link, ' or try the other reference.');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });
  window.addEventListener('pagehide', () => { if (photoUrl) URL.revokeObjectURL(photoUrl); });
})();
