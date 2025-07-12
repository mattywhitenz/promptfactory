// Background service worker for Website Overlay Extension
// Handles extension lifecycle and messaging if needed

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Website Overlay Extension installed');
  
  // Set default storage values if needed
  chrome.storage.sync.get(['overlayEnabled'], (result) => {
    if (result.overlayEnabled === undefined) {
      chrome.storage.sync.set({ overlayEnabled: false });
    }
  });
});

// Handle any runtime messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    chrome.storage.sync.get(['overlayEnabled'], (result) => {
      sendResponse({ enabled: result.overlayEnabled || false });
    });
    return true; // Keep message channel open for async response
  }
  
  // Enable/disable iframe header stripping based on overlay usage
  if (request.action === 'enableIframeBypass') {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['iframe_rules']
    }).then(() => {
      console.log('Iframe bypass rules enabled');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Failed to enable iframe bypass rules:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'disableIframeBypass') {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['iframe_rules']
    }).then(() => {
      console.log('Iframe bypass rules disabled');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Failed to disable iframe bypass rules:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Optional: Handle tab updates to reset overlay state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // You can add logic here if needed when a tab finishes loading
    console.log(`Tab ${tabId} loaded: ${tab.url}`);
  }
}); 