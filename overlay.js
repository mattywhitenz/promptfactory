let currentUrl = '';
let enableBypass = true;
let attempt = 1;
let customTitle = '';

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
currentUrl = urlParams.get('url') || '';
enableBypass = urlParams.get('bypass') !== 'false';
customTitle = urlParams.get('title') || '';

// Load the website
function loadWebsite(url, attemptNumber = 1) {
  const iframe = document.getElementById('contentFrame');
  const loading = document.querySelector('.loading');
  const errorContainer = document.getElementById('errorContainer');
  const errorUrl = document.getElementById('errorUrl');
  const retryButton = document.getElementById('retryButton');
  
  // Reset UI
  loading.style.display = 'block';
  iframe.style.display = 'none';
  errorContainer.style.display = 'none';
  
  // Set error URL
  errorUrl.textContent = url;
  
  // Show/hide retry button based on attempt and bypass setting
  retryButton.style.display = (attemptNumber === 1 && enableBypass) ? 'inline-block' : 'none';
  
  // Determine iframe URL
  let iframeUrl = url;
  if (attemptNumber === 2 && enableBypass) {
    const proxyServices = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/'
    ];
    iframeUrl = proxyServices[0] + encodeURIComponent(url);
  }
  
        // Configure iframe
      iframe.src = iframeUrl;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.setAttribute('scrolling', 'auto');
      
      // Prevent iframe from affecting parent page scroll
      iframe.addEventListener('load', function() {
        try {
          // Try to prevent scrolling in the iframe content
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc && iframeDoc.documentElement) {
            iframeDoc.documentElement.style.overscrollBehavior = 'contain';
            iframeDoc.documentElement.style.scrollBehavior = 'auto';
          }
        } catch (e) {
          // Cross-origin, can't access - that's fine
        }
      });
  
  // Set timeout for loading
  const loadTimeout = setTimeout(() => {
    showError();
  }, 10000);
  
  // Handle iframe events
  iframe.onload = function() {
    clearTimeout(loadTimeout);
    try {
      // Try to access iframe content
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc || doc.body.innerHTML === '') {
        showError();
      } else {
        showSuccess();
      }
    } catch (e) {
      // Cross-origin - assume it loaded successfully
      showSuccess();
    }
  };
  
  iframe.onerror = function() {
    clearTimeout(loadTimeout);
    showError();
  };
  
  attempt = attemptNumber;
}

function showSuccess() {
  document.querySelector('.loading').style.display = 'none';
  document.getElementById('contentFrame').style.display = 'block';
  document.getElementById('errorContainer').style.display = 'none';
}

function showError() {
  document.querySelector('.loading').style.display = 'none';
  document.getElementById('contentFrame').style.display = 'none';
  document.getElementById('errorContainer').style.display = 'flex';
}

function openInNewTab() {
  window.open(currentUrl, '_blank');
}

function retryWithProxy() {
  loadWebsite(currentUrl, 2);
}

function closeOverlay() {
  window.parent.postMessage({ action: 'closeOverlay' }, '*');
}

function toggleMode() {
  window.parent.postMessage({ action: 'toggleMode' }, '*');
}

// Start loading when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Update title
  const titleElement = document.querySelector('.overlay-title');
  if (titleElement) {
    if (customTitle) {
      titleElement.textContent = customTitle;
    } else {
      try {
        titleElement.textContent = new URL(currentUrl).hostname;
      } catch (e) {
        titleElement.textContent = 'Website Overlay';
      }
    }
  }
  
  // Set up event listeners
  const closeButton = document.getElementById('closeButton');
  const minimizeButton = document.getElementById('minimizeButton');
  const openTabButton = document.getElementById('openTabButton');
  const retryButton = document.getElementById('retryButton');
  
  if (closeButton) {
    closeButton.addEventListener('click', closeOverlay);
  }
  
  if (minimizeButton) {
    minimizeButton.addEventListener('click', toggleMode);
  }
  
  if (openTabButton) {
    openTabButton.addEventListener('click', openInNewTab);
  }
  
  if (retryButton) {
    retryButton.addEventListener('click', retryWithProxy);
  }
  
  // Start loading
  if (currentUrl) {
    loadWebsite(currentUrl);
  } else {
    showError();
  }
}); 