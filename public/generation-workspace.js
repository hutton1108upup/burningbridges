(() => {
  'use strict';
  const pt = document.documentElement.lang.toLowerCase().startsWith('pt');
  document.querySelectorAll('[data-generation-workspace]').forEach(workspace => {
    const inputs = [...workspace.querySelectorAll('input[type="file"]')];
    const feedback = workspace.querySelector('[data-generation-feedback]');
    const actions = workspace.querySelectorAll('[data-generate-video]');

    const missingInputs = () => inputs.filter(input => {
      if (input.disabled) return false;
      const optional = input.hasAttribute('data-generation-optional');
      if (optional && !input.files?.length) return false;
      return input.dataset.generationReady !== 'true';
    });
    const showMissing = missing => {
      const names = missing.map(input => input.dataset.photoLabel || input.getAttribute('aria-label') || 'your photo');
      feedback.textContent = pt ? 'Escolha uma foto válida antes de gerar seu vídeo.' : `Choose a valid photo for ${names.join(' and ')} before generating your video.`;
      feedback.classList.add('error');
      const first = missing[0];
      if (first.hidden) workspace.querySelector('#upload-button')?.focus();
      else first.focus();
    };

    actions.forEach(action => action.addEventListener('click', async event => {
      event.preventDefault();
      const missing = missingInputs();
      if (missing.length) { showMissing(missing); return; }
      action.setAttribute('aria-busy', 'true');
      try {
        if (workspace.hasAttribute('data-commerce-draft')) {
          if (!window.BBCommerce?.preparePricingNavigation) throw new Error('Your photo could not be saved. Please try again.');
          await window.BBCommerce.preparePricingNavigation();
        }
        // Recheck after asynchronous draft saving, in case the photo was removed or replaced.
        const currentMissing = missingInputs();
        if (currentMissing.length) { showMissing(currentMissing); return; }
        window.location.assign(action.href);
      } catch {
        feedback.textContent = pt ? 'Não foi possível salvar sua foto. Mantenha a página aberta e tente novamente.' : 'Your photo could not be saved. Please keep this page open and try again.';
        feedback.classList.add('error');
      } finally {
        action.removeAttribute('aria-busy');
      }
    }));
    const clearFeedback = () => { feedback.textContent = ''; feedback.classList.remove('error'); };
    workspace.addEventListener('change', clearFeedback);
    workspace.addEventListener('drop', clearFeedback);
    workspace.addEventListener('click', event => {
      if (event.target.closest('[data-photo-remove], [data-remove], .remove, .remove-photo, #remove-photo, #toc-photo-remove')) clearFeedback();
    });
  });
})();
