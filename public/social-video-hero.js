(() => {
  'use strict';
  document.querySelectorAll('.social-video-page .phone-screen').forEach(screen => {
    const video = screen.querySelector('video');
    const like = screen.querySelector('[data-shorts-like]');
    const sound = screen.querySelector('[data-shorts-sound]');
    const fullscreen = screen.querySelector('[data-shorts-fullscreen]');
    const status = screen.querySelector('[data-shorts-status]');
    // Reference switching keeps the blurred fill aligned with the selected clip.
    const syncPoster = () => {
      if (video.poster) screen.style.setProperty('--phone-poster', `url(${JSON.stringify(video.poster)})`);
    };
    new MutationObserver(syncPoster).observe(video, {attributes: true, attributeFilter: ['poster']});
    syncPoster();

    like.addEventListener('click', () => {
      const liked = like.getAttribute('aria-pressed') !== 'true';
      like.setAttribute('aria-pressed', String(liked));
      like.setAttribute('aria-label', liked ? 'Unlike this reference' : 'Like this reference');
      like.querySelector('span').textContent = liked ? 'Liked' : 'Like';
    });
    const syncSound = () => {
      const audible = !video.muted && video.volume > 0;
      sound.setAttribute('aria-pressed', String(audible));
      sound.setAttribute('aria-label', audible ? 'Mute video' : 'Turn on sound');
      sound.querySelector('span').textContent = audible ? 'Mute' : 'Sound';
    };
    sound.addEventListener('click', () => {
      const audible = !video.muted && video.volume > 0;
      video.muted = audible;
      if (!audible && video.volume === 0) video.volume = 1;
      syncSound();
    });
    video.addEventListener('volumechange', syncSound);
    syncSound();
    fullscreen.addEventListener('click', async () => {
      status.textContent = '';
      try {
        if (video.requestFullscreen) await video.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        else status.textContent = 'Use the video player menu to open fullscreen.';
      } catch {
        status.textContent = 'Fullscreen could not open. Try the video player controls.';
      }
    });
  });
})();
