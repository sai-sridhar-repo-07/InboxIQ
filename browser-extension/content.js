// Mailair content script — injects draft into Gmail compose window
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'INJECT_DRAFT') return;
  // Find active Gmail compose body
  const composeBody = document.querySelector('[aria-label="Message Body"][contenteditable="true"]');
  if (composeBody) {
    composeBody.focus();
    document.execCommand('selectAll');
    document.execCommand('insertText', false, msg.body);
  }
});
