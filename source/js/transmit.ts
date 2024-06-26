chrome.runtime.connect();
window.addEventListener('message', (event) => {
	if (event.source != window) {
		return;
	}

	chrome.runtime.sendMessage(event.data);
}, false);
