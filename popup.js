document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('websiteUrl');
  const toggleButton = document.getElementById('toggleOverlay');
  const closeButton = document.getElementById('closeOverlay');
  const statusDiv = document.getElementById('status');

  // Load saved URL
  chrome.storage.sync.get(['overlayUrl'], function(result) {
    if (result.overlayUrl) {
      urlInput.value = result.overlayUrl;
    } else {
      urlInput.value = 'https://www.google.com'; // Default URL
    }
  });

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  toggleButton.addEventListener('click', function() {
    const url = urlInput.value.trim();
    
    if (!url) {
      showStatus('Please enter a URL', true);
      return;
    }
    
    if (!isValidUrl(url)) {
      showStatus('Please enter a valid URL (must start with http:// or https://)', true);
      return;
    }

    // Save the URL
    chrome.storage.sync.set({ overlayUrl: url });

    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        // Send message to content script
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleOverlay',
          url: url
        }, function(response) {
          if (chrome.runtime.lastError) {
            showStatus('Error: Unable to inject overlay on this page', true);
          } else if (response && response.success) {
            showStatus(response.overlayVisible ? 'Overlay activated' : 'Overlay hidden');
            // Close popup after successful action
            setTimeout(() => window.close(), 1000);
          } else {
            showStatus('Error: Failed to toggle overlay', true);
          }
        });
      }
    });
  });

  closeButton.addEventListener('click', function() {
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        // Send message to content script to close overlay
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'closeOverlay'
        }, function(response) {
          if (response && response.success) {
            showStatus('Overlay closed');
            setTimeout(() => window.close(), 1000);
          }
        });
      }
    });
  });

  // Allow Enter key to trigger toggle
  urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      toggleButton.click();
    }
  });
});