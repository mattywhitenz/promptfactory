document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('websiteUrl');
  const toggleButton = document.getElementById('toggleOverlay');
  const closeButton = document.getElementById('closeOverlay');
  const statusDiv = document.getElementById('status');
  const enableBypassCheckbox = document.getElementById('enableBypass');

  // Load saved URL, bypass preference, and check for saved URLs
  chrome.storage.sync.get(['overlayUrl', 'enableBypass', 'savedUrls', 'defaultUrl'], function(result) {
    const savedUrls = result.savedUrls || [];
    const defaultUrl = result.defaultUrl || '';
    
    if (defaultUrl) {
      urlInput.value = defaultUrl;
      urlInput.placeholder = 'Default URL will be used if empty';
    } else if (result.overlayUrl) {
      urlInput.value = result.overlayUrl;
    } else if (savedUrls.length > 0) {
      urlInput.value = savedUrls[0].url;
    } else {
      urlInput.value = 'https://en.wikipedia.org/wiki/Main_Page'; // Fallback default
    }
    
    if (result.enableBypass !== undefined) {
      enableBypassCheckbox.checked = result.enableBypass;
    }
    
    // Update UI based on whether there are saved URLs
    if (savedUrls.length > 0) {
      const infoText = document.createElement('p');
      infoText.style.cssText = 'font-size: 11px; color: #666; margin-top: 8px; text-align: center;';
      infoText.textContent = `${savedUrls.length} saved URL${savedUrls.length > 1 ? 's' : ''}. Right-click widget to manage.`;
      document.querySelector('.container').appendChild(infoText);
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
    
    // Allow empty URL if there are saved URLs or default
    chrome.storage.sync.get(['savedUrls', 'defaultUrl'], function(result) {
      const savedUrls = result.savedUrls || [];
      const defaultUrl = result.defaultUrl || '';
      
      // If no URL and no saved URLs/default, require URL input
      if (!url && savedUrls.length === 0 && !defaultUrl) {
        showStatus('Please enter a URL or add saved URLs first', true);
        return;
      }
      
      // If URL provided, validate it
      if (url && !isValidUrl(url)) {
        showStatus('Please enter a valid URL (must start with http:// or https://)', true);
        return;
      }

      // Save the URL and bypass preference (only if URL provided)
      const enableBypass = enableBypassCheckbox.checked;
      if (url) {
        chrome.storage.sync.set({ overlayUrl: url, enableBypass: enableBypass });
      } else {
        chrome.storage.sync.set({ enableBypass: enableBypass });
      }

                // Get current active tab
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
              // Find title for the URL if it exists in saved URLs
              let title = '';
              if (url) {
                const urlData = savedUrls.find(item => item.url === url);
                if (urlData) {
                  title = urlData.name;
                }
              }
              
              // Send message to content script (URL can be empty)
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleOverlay',
                url: url, // Can be empty - content script will handle
                enableBypass: enableBypass,
                title: title
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
  
  // Save bypass preference when changed
  enableBypassCheckbox.addEventListener('change', function() {
    chrome.storage.sync.set({ enableBypass: enableBypassCheckbox.checked });
  });
});