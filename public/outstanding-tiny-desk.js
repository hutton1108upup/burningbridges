(() => {
  'use strict';
  const workspace = document.querySelector('[data-tiny-desk-workspace]');
  if (!workspace) return;
  const buttons = [...workspace.querySelectorAll('[data-desk-mode]')];
  const panels = [...workspace.querySelectorAll('[data-desk-panel]')];
  const setMode = mode => {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.deskMode === mode)));
    panels.forEach(panel => {
      const active = panel.dataset.deskPanel === mode;
      panel.hidden = !active;
      panel.querySelectorAll('input[type=file]').forEach(input => { input.disabled = !active; });
    });
    workspace.dispatchEvent(new Event('change', {bubbles: true}));
  };
  buttons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.deskMode)));
  setMode('group');
  const individual = workspace.querySelector('[data-desk-panel="individual"]');
  const status = individual.querySelector('[data-photo-status]');
  const announceRoles = () => {
    if (status.classList.contains('error')) return;
    const lead = individual.querySelector('#desk-lead').dataset.generationReady === 'true';
    const optionalCount = individual.querySelectorAll('[data-generation-optional][data-generation-ready="true"]').length;
    status.textContent = lead
      ? `Lead photo ready. ${optionalCount} of 4 optional band photos selected. Your photos stay on this device.`
      : `Choose the lead photo to continue. ${optionalCount} optional band photos selected.`;
  };
  new MutationObserver(announceRoles).observe(individual, {subtree: true, attributes: true, attributeFilter: ['data-photo-ready']});
})();
