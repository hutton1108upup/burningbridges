// The homepage uses one player. Reference selection never starts a generation.
(() => {
  const gallery = document.querySelector('[data-home-gallery]');
  if (!gallery) return;
  const player = gallery.querySelector('video');
  const choices = [...gallery.querySelectorAll('[data-home-clip]')];
  const status = gallery.querySelector('[data-home-status]');
  let selection = 0;
  function describePlayback() {
    const selected = choices.find(choice => choice.getAttribute('aria-pressed') === 'true');
    status.textContent = selected.dataset.homeClip === 'lounge'
      ? 'Playing Lounge performance. This reference has no audio track.'
      : `Playing ${selected.dataset.title}. Use the player controls to turn sound on.`;
  }

  document.querySelectorAll('video').forEach(video => {
    video.addEventListener('play', () => {
      document.querySelectorAll('video').forEach(other => {
        if (other !== video) other.pause();
      });
    });
  });

  async function choose(button) {
    const version = ++selection;
    player.pause();
    player.muted = true;
    player.poster = button.querySelector('img').getAttribute('src');
    player.src = button.dataset.src;
    player.setAttribute('aria-label', `${button.dataset.title} reference video`);
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    gallery.querySelector('[data-home-title]').textContent = button.dataset.title;
    gallery.querySelector('[data-home-kind]').textContent = button.dataset.kind;
    gallery.querySelector('[data-home-description]').textContent = button.dataset.description;
    status.textContent = `Loading ${button.dataset.title}…`;
    player.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
    try {
      await player.play();
      if (version === selection) describePlayback();
    } catch (error) {
      if (version !== selection || error.name === 'AbortError') return;
      status.textContent = error.name === 'NotAllowedError'
        ? 'Press play in the video player to watch this reference.'
        : 'This reference could not be played. Try another clip or open the video directly.';
    }
  }

  choices.forEach(button => button.addEventListener('click', () => choose(button)));
  player.addEventListener('play', describePlayback);
  player.addEventListener('pause', () => {
    if (player.paused && !player.ended && player.readyState > 0) {
      status.textContent = 'Reference paused. Press play to continue watching.';
    }
  });
  player.addEventListener('ended', () => {
    status.textContent = 'Reference finished. Replay it or choose another clip below.';
  });
  document.querySelectorAll('[data-home-jump]').forEach(button => {
    button.addEventListener('click', () => {
      const choice = choices.find(item => item.dataset.homeClip === button.dataset.homeJump);
      if (!choice) return;
      choose(choice);
      player.focus({preventScroll: true});
    });
  });
  player.addEventListener('error', () => {
    status.replaceChildren('This reference could not be loaded. ');
    const link = document.createElement('a');
    link.href = player.currentSrc || player.querySelector('source')?.src;
    link.textContent = 'Open the video directly';
    status.append(link, ', or choose another reference.');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) player.pause();
  });
})();
