// Content script to manage overlay iframe
(function() {
  'use strict';
  
  let overlayContainer = null;
  let iframe = null;
  let isOverlayVisible = false;
  
  const OVERLAY_ID = 'website-overlay-extension-container';
  const IFRAME_ID = 'website-overlay-extension-iframe';
  
  function createOverlay(url) {
    // Remove existing overlay if it exists
    removeOverlay();
    
    // Create overlay container
    overlayContainer = document.createElement('div');
    overlayContainer.id = OVERLAY_ID;
    overlayContainer.className = 'website-overlay-container';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'website-overlay-close';
    closeButton.innerHTML = '✕';
    closeButton.title = 'Close Overlay';
    
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = url;
    iframe.className = 'website-overlay-iframe';
    
    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'website-overlay-resize';
    resizeHandle.innerHTML = '↘';
    
    // Assemble overlay
    overlayContainer.appendChild(closeButton);
    overlayContainer.appendChild(iframe);
    overlayContainer.appendChild(resizeHandle);
    
    // Add to page
    document.body.appendChild(overlayContainer);
    
    // Add event listeners
    closeButton.addEventListener('click', removeOverlay);
    setupDragAndResize();
    
    isOverlayVisible = true;
    
    // Handle iframe load events
    iframe.addEventListener('load', function() {
      console.log('Overlay iframe loaded successfully');
    });
    
    iframe.addEventListener('error', function() {
      console.error('Failed to load overlay iframe');
    });
  }
  
  function removeOverlay() {
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }
    overlayContainer = null;
    iframe = null;
    isOverlayVisible = false;
  }
  
  function setupDragAndResize() {
    if (!overlayContainer) return;
    
    let isDragging = false;
    let isResizing = false;
    let dragOffset = { x: 0, y: 0 };
    let startSize = { width: 0, height: 0 };
    let startPos = { x: 0, y: 0 };
    
    // Make overlay draggable
    overlayContainer.addEventListener('mousedown', function(e) {
      if (e.target.className === 'website-overlay-close' || 
          e.target.className === 'website-overlay-resize' ||
          e.target === iframe) {
        return;
      }
      
      isDragging = true;
      const rect = overlayContainer.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      overlayContainer.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    // Handle resize
    const resizeHandle = overlayContainer.querySelector('.website-overlay-resize');
    resizeHandle.addEventListener('mousedown', function(e) {
      isResizing = true;
      startSize.width = overlayContainer.offsetWidth;
      startSize.height = overlayContainer.offsetHeight;
      startPos.x = e.clientX;
      startPos.y = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        // Keep overlay within viewport
        const maxX = window.innerWidth - overlayContainer.offsetWidth;
        const maxY = window.innerHeight - overlayContainer.offsetHeight;
        
        overlayContainer.style.left = Math.max(0, Math.min(maxX, x)) + 'px';
        overlayContainer.style.top = Math.max(0, Math.min(maxY, y)) + 'px';
      }
      
      if (isResizing) {
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        
        const newWidth = Math.max(300, Math.min(window.innerWidth - 20, startSize.width + deltaX));
        const newHeight = Math.max(200, Math.min(window.innerHeight - 20, startSize.height + deltaY));
        
        overlayContainer.style.width = newWidth + 'px';
        overlayContainer.style.height = newHeight + 'px';
      }
    });
    
    document.addEventListener('mouseup', function() {
      if (isDragging) {
        overlayContainer.style.cursor = 'grab';
      }
      isDragging = false;
      isResizing = false;
    });
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleOverlay') {
      if (isOverlayVisible) {
        removeOverlay();
      } else {
        createOverlay(request.url);
      }
      sendResponse({ success: true, overlayVisible: isOverlayVisible });
    } else if (request.action === 'closeOverlay') {
      removeOverlay();
      sendResponse({ success: true });
    }
    
    return true; // Keep message channel open for async response
  });
  
  // Handle page navigation
  window.addEventListener('beforeunload', function() {
    removeOverlay();
  });
  
})();