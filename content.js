// Content script to manage overlay iframe
(function() {
  'use strict';
  
  let overlayContainer = null;
  let iframe = null;
  let isOverlayVisible = false;
  
  const OVERLAY_ID = 'website-overlay-extension-container';
  const IFRAME_ID = 'website-overlay-extension-iframe';
  
  // Check if extension context is still valid
  function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }
  
  let isCompactMode = false;
  let isMenuMode = false;
  let savedUrls = [];
  let defaultUrl = '';
  
  function createOverlay(url, enableBypass = true, title = '') {
    // Remove existing overlay if it exists
    removeOverlay();
    
    // Load saved URLs first
    loadSavedUrls().then(() => {
              // If no URL provided, check for default
        if (!url && defaultUrl) {
          url = defaultUrl;
          // Find the title for the default URL
          const defaultUrlData = savedUrls.find(item => item.url === defaultUrl);
          if (defaultUrlData) {
            title = defaultUrlData.name;
          }
        }
      
      // If still no URL, start in compact mode for selection
      if (!url) {
        setCompactMode();
        isOverlayVisible = true;
        return;
      }
      
      // Enable iframe bypass rules only if bypass is enabled
      if (enableBypass && isExtensionContextValid()) {
        try {
          chrome.runtime.sendMessage({ action: 'enableIframeBypass' });
        } catch (error) {
          console.log('Extension context invalidated, bypass rules may not be enabled');
        }
      }
      
      // Create the overlay container
      overlayContainer = document.createElement('div');
      overlayContainer.id = OVERLAY_ID;
      
      // Start in expanded mode (full height sidebar)
      setExpandedMode();
      
      // Create iframe that loads the extension's overlay.html
      iframe = document.createElement('iframe');
      iframe.id = IFRAME_ID;
      iframe.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        background: white !important;
        display: block !important;
        overflow: hidden !important;
        scroll-behavior: auto !important;
      `;
      
      // Prevent iframe from causing page scroll
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      
      // Load the extension's overlay.html with parameters
      const overlayUrl = chrome.runtime.getURL('overlay.html');
      const params = new URLSearchParams({
        url: url,
        bypass: enableBypass.toString(),
        title: title
      });
      iframe.src = `${overlayUrl}?${params.toString()}`;
      
      // Add iframe to container
      overlayContainer.appendChild(iframe);
      
      // Preserve current scroll position
      const currentScrollX = window.scrollX;
      const currentScrollY = window.scrollY;
      
      // Add to page
      document.body.appendChild(overlayContainer);
      
      // Restore scroll position after adding overlay
      window.scrollTo(currentScrollX, currentScrollY);
      
      // Listen for messages from the overlay
      window.addEventListener('message', handleOverlayMessage, false);
      
      isOverlayVisible = true;
      console.log('Overlay created successfully');
    });
  }
  
  function loadSavedUrls() {
    return new Promise((resolve) => {
      if (isExtensionContextValid()) {
        try {
          chrome.storage.sync.get(['savedUrls', 'defaultUrl'], (result) => {
            savedUrls = result.savedUrls || [];
            defaultUrl = result.defaultUrl || '';
            resolve();
          });
        } catch (error) {
          console.log('Failed to load saved URLs:', error);
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
  
  function setExpandedMode() {
    if (!overlayContainer) return;
    
    isCompactMode = false;
    overlayContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 400px !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      background: white !important;
      border-left: 2px solid #e0e0e0 !important;
      border-radius: 12px 0 0 12px !important;
      box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15) !important;
      overflow: hidden !important;
      display: block !important;
      visibility: visible !important;
      transition: all 0.3s ease !important;
    `;
  }
  
  function setCompactMode() {
    if (!overlayContainer) return;
    
    isCompactMode = true;
    overlayContainer.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 20px !important;
      width: 60px !important;
      height: 60px !important;
      z-index: 2147483647 !important;
      background: #007aff !important;
      border: 2px solid #0056b3 !important;
      border-radius: 50% !important;
      box-shadow: 0 4px 20px rgba(0, 122, 255, 0.3) !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      visibility: visible !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      transform: translateY(-50%) !important;
    `;
    
    // Hide iframe in compact mode
    if (iframe) {
      iframe.style.display = 'none !important';
    }
    
    // Add chat icon
    overlayContainer.innerHTML = `
      <div style="color: white; font-size: 24px; font-weight: bold;">💬</div>
    `;
    
    // Add click listener to show menu or open default
    overlayContainer.addEventListener('click', handleCompactClick);
    overlayContainer.addEventListener('contextmenu', handleCompactRightClick);
  }
  
  function handleCompactClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // If there's a default URL, open it directly
    if (defaultUrl) {
      openUrl(defaultUrl);
    } else {
      // Otherwise show selection menu
      showSelectionMenu();
    }
  }
  
  function handleCompactRightClick(e) {
    e.preventDefault();
    e.stopPropagation();
    showSelectionMenu();
  }
  
  function showSelectionMenu() {
    if (!overlayContainer) return;
    
    isMenuMode = true;
    overlayContainer.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 20px !important;
      width: 300px !important;
      height: auto !important;
      max-height: 400px !important;
      z-index: 2147483647 !important;
      background: white !important;
      border: 2px solid #e0e0e0 !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
      overflow: hidden !important;
      display: block !important;
      visibility: visible !important;
      transition: all 0.3s ease !important;
      transform: translateY(-50%) !important;
    `;
    
    // Create menu content
    createMenuContent();
  }
  
  function createMenuContent() {
    if (!overlayContainer) return;
    
    overlayContainer.innerHTML = `
      <div style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: #333;">Quick Access</h3>
          <button id="closeMenu" style="background: #ff5f56; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">✕</button>
        </div>
        <div id="urlList" style="max-height: 250px; overflow-y: auto;"></div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
          <button id="addNew" style="width: 100%; padding: 8px 12px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">+ Add New URL</button>
        </div>
      </div>
    `;
    
    // Populate URL list
    updateUrlList();
    
    // Add event listeners
    const closeBtn = overlayContainer.querySelector('#closeMenu');
    const addBtn = overlayContainer.querySelector('#addNew');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        setCompactMode();
      });
    }
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        promptAddNewUrl();
      });
    }
  }
  
  function updateUrlList() {
    const urlListContainer = overlayContainer.querySelector('#urlList');
    if (!urlListContainer) return;
    
    urlListContainer.innerHTML = '';
    
    if (savedUrls.length === 0) {
      urlListContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
          No saved URLs yet.<br>
          <small>Right-click the circle to add URLs</small>
        </div>
      `;
      return;
    }
    
    savedUrls.forEach((urlData, index) => {
      const urlItem = document.createElement('div');
      urlItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin-bottom: 4px;
        background: ${urlData.url === defaultUrl ? '#e8f4fd' : '#f8f9fa'};
        border: 1px solid ${urlData.url === defaultUrl ? '#007aff' : '#e0e0e0'};
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      
      urlItem.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 500; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${urlData.name}
            ${urlData.url === defaultUrl ? ' <span style="color: #007aff; font-size: 12px;">★ Default</span>' : ''}
          </div>
          <div style="font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${urlData.url}
          </div>
        </div>
        <div style="display: flex; gap: 4px; margin-left: 8px;">
          <button class="setDefault" data-index="${index}" style="background: #34c759; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">★</button>
          <button class="deleteUrl" data-index="${index}" style="background: #ff3b30; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;">🗑</button>
        </div>
      `;
      
      // Add click listener to open URL
      urlItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('setDefault') && !e.target.classList.contains('deleteUrl')) {
          openUrl(urlData.url);
        }
      });
      
      urlListContainer.appendChild(urlItem);
    });
    
    // Add listeners for default and delete buttons
    overlayContainer.querySelectorAll('.setDefault').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        setDefaultUrl(savedUrls[index].url);
      });
    });
    
    overlayContainer.querySelectorAll('.deleteUrl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        deleteUrl(index);
      });
    });
  }
  
  function openUrl(url) {
    // Find the title for this URL
    const urlData = savedUrls.find(item => item.url === url);
    const title = urlData ? urlData.name : '';
    
    // Remove existing iframe and menu
    if (overlayContainer) {
      overlayContainer.innerHTML = '';
    }
    
    // Create new overlay with the URL and title
    createOverlay(url, true, title);
  }
  
  function promptAddNewUrl() {
    const name = prompt('Enter a name for this URL:');
    if (!name) return;
    
    const url = prompt('Enter the URL:');
    if (!url) return;
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      alert('Please enter a valid URL');
      return;
    }
    
    // Add to saved URLs
    const urlData = { name: name.trim(), url: url.trim() };
    savedUrls.push(urlData);
    
    // Save to storage
    saveUrls();
    
    // If this is the first URL, make it default
    if (savedUrls.length === 1) {
      setDefaultUrl(url);
    }
    
    // Update the menu
    updateUrlList();
  }
  
  function setDefaultUrl(url) {
    defaultUrl = url;
    saveUrls();
    updateUrlList();
  }
  
  function deleteUrl(index) {
    if (index < 0 || index >= savedUrls.length) return;
    
    const urlData = savedUrls[index];
    const confirmDelete = confirm(`Delete "${urlData.name}"?`);
    if (!confirmDelete) return;
    
    // If deleting the default URL, clear default
    if (urlData.url === defaultUrl) {
      defaultUrl = '';
    }
    
    // Remove from array
    savedUrls.splice(index, 1);
    
    // If there are remaining URLs and no default, set first as default
    if (savedUrls.length > 0 && !defaultUrl) {
      defaultUrl = savedUrls[0].url;
    }
    
    // Save and update
    saveUrls();
    updateUrlList();
  }
  
  function saveUrls() {
    if (isExtensionContextValid()) {
      try {
        chrome.storage.sync.set({ 
          savedUrls: savedUrls,
          defaultUrl: defaultUrl 
        });
      } catch (error) {
        console.log('Failed to save URLs:', error);
      }
    }
  }
  
  function toggleMode() {
    if (!overlayContainer) return;
    
    if (isMenuMode) {
      // Close menu and go to compact
      isMenuMode = false;
      setCompactMode();
    } else if (isCompactMode) {
      // Show menu
      showSelectionMenu();
    } else {
      // Collapse to compact
      setCompactMode();
    }
  }
  
  // Handle messages from the overlay iframe
  function handleOverlayMessage(event) {
    // Only handle messages from our overlay
    if (event.source !== iframe.contentWindow) return;
    
    if (event.data.action === 'closeOverlay') {
      removeOverlay();
    } else if (event.data.action === 'toggleMode') {
      toggleMode();
    }
  }
  
  function removeOverlay() {
    // Clean up message listener
    window.removeEventListener('message', handleOverlayMessage, false);
    
    // Remove overlay from DOM
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }
    overlayContainer = null;
    iframe = null;
    isOverlayVisible = false;
    isCompactMode = false;
    isMenuMode = false;
    
    // Disable iframe bypass rules when overlay is removed
    if (isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({ action: 'disableIframeBypass' });
      } catch (error) {
        console.log('Extension context invalidated, bypass rules cleanup skipped');
      }
    }
    
    console.log('Overlay removed successfully');
  }
  

  
  // Listen for messages from popup
  function setupMessageListener() {
    if (!isExtensionContextValid()) {
      console.log('Extension context not valid, skipping message listener setup');
      return;
    }
    
    try {
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
          try {
            // Double-check context is still valid when message arrives
            if (!isExtensionContextValid()) {
              console.log('Extension context invalidated, ignoring message');
              return false;
            }
            
            if (request.action === 'toggleOverlay') {
              if (isOverlayVisible) {
                removeOverlay();
              } else {
                createOverlay(request.url, request.enableBypass, request.title || '');
              }
              sendResponse({ success: true, overlayVisible: isOverlayVisible });
            } else if (request.action === 'closeOverlay') {
              removeOverlay();
              sendResponse({ success: true });
            }
            
            return true; // Keep message channel open for async response
          } catch (error) {
            console.log('Error handling message:', error.message);
            sendResponse({ success: false, error: error.message });
            return false;
          }
        });
      }
    } catch (error) {
      console.log('Failed to setup message listener:', error.message);
    }
  }
  
  // Setup message listener
  setupMessageListener();

  // Handle page navigation
  window.addEventListener('beforeunload', function() {
    removeOverlay();
  });
  
  // Periodic check for extension context validity
  let contextCheckInterval = setInterval(function() {
    if (!isExtensionContextValid()) {
      console.log('Extension context lost, cleaning up overlay...');
      
      // Clean up overlay without trying to send messages
      window.removeEventListener('message', handleOverlayMessage, false);
      const existingOverlay = document.getElementById(OVERLAY_ID);
      if (existingOverlay) {
        existingOverlay.remove();
        overlayContainer = null;
        iframe = null;
        isOverlayVisible = false;
        isCompactMode = false;
        isMenuMode = false;
      }
      
      // Stop checking since context is lost
      clearInterval(contextCheckInterval);
    }
  }, 5000); // Check every 5 seconds
  
  // Initialize saved URLs on load
  loadSavedUrls();
  
})();