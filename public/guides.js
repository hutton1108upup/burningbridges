// Copy only on explicit request. No prompt text is sent to analytics or a server.
document.querySelectorAll('[data-copy-prompt]').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copyPrompt);
    const status = button.parentElement.querySelector('[role="status"]');
    if (!text || !status) return;
    try {
      await navigator.clipboard.writeText(text.textContent);
      status.textContent = 'Copied. Adapt it to your tool and permitted references.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
      text.focus();
      status.textContent = 'Copy access was blocked. The prompt is selected; copy it manually.';
    }
  });
});
