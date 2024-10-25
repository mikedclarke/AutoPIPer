// content.js

// At the very top of content.js
(function() {
  if (window.hasOwnProperty('AutoPIPer_isInitialized')) {
    console.log('Content script already loaded, skipping initialization');
    return;
  }

  // Use a namespaced global variable instead of a regular let
  window.AutoPIPer_isInitialized = false;
  
  // Flag to track if we're initialized
  let pipAttempts = 0;
  let lastPipAttempt = 0; // Add this line to track the last attempt time
  const MAX_PIP_ATTEMPTS = 3;

  // Add this near the top of the IIFE, after declaring hasUserInteracted
  let hasUserInteracted = false;
  let pipPermissionGranted = false;

  // Add this function to check stored permission
  async function checkStoredPIPPermission() {
    try {
      const result = await chrome.storage.local.get('pipPermissionGranted');
      pipPermissionGranted = result.pipPermissionGranted || false;
      console.log('PIP permission status loaded:', pipPermissionGranted);
      return pipPermissionGranted;
    } catch (error) {
      console.error('Error checking PIP permission:', error);
      return false;
    }
  }

  // Initialize the content script
  function initialize() {
    if (window.AutoPIPer_isInitialized) return;
    
    console.log('Initializing content script');
    window.AutoPIPer_isInitialized = true;
    
    // Check stored permission first
    checkStoredPIPPermission().then(() => {
      setupVideoHandlers();
    });
    
    // Let the background script know we're ready
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
  }

  // Add this new function to handle video setup
  async function setupVideoHandlers() {
    console.log('Setting up video handlers');
    const video = await waitForVideo();
    
    if (video) {
      // Create a hidden PIP button that we can programmatically click
      let pipButton = document.getElementById('hidden-pip-button');
      if (!pipButton) {
        pipButton = document.createElement('button');
        pipButton.id = 'hidden-pip-button';
        pipButton.style.display = 'none';
        document.body.appendChild(pipButton);
      }
      
      // Remove any existing click handlers
      pipButton.replaceWith(pipButton.cloneNode(true));
      pipButton = document.getElementById('hidden-pip-button');
      
      // Add click handler to the hidden button
      pipButton.addEventListener('click', () => {
        if (video && !document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(console.error);
        }
      });
      
      // Add video play handler
      video.addEventListener('play', () => {
        console.log('Video play event - PIP permission:', pipPermissionGranted);
      });
    }
  }

  // Message handler
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action);
    
    if (request.action === "enablePIP") {
      enablePIP().then(() => sendResponse({ success: true }));
    } else if (request.action === "disablePIP") {
      disablePIP().then(() => sendResponse({ success: true }));
    } else if (request.action === "promptPIP") {
      showPIPPrompt();
      sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for async responses
  });

  async function waitForVideo(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const video = document.querySelector('video');
      if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA or better
        return video;
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
    }
    return null;
  }

  function addPIPButton(video) {
      const button = document.createElement('button');
      button.innerText = 'PIP';
      button.style.position = 'absolute';
      button.style.bottom = '10px';
      button.style.right = '10px';
      button.style.zIndex = 1000;
      button.style.padding = '5px 10px';
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '5px';
      button.style.cursor = 'pointer';

      button.addEventListener('click', () => {
          if (document.pictureInPictureElement) {
              disablePIP();
              button.innerText = 'PIP';
          } else {
              enablePIP(video);
              button.innerText = 'Exit PIP';
          }
      });

      video.parentElement.style.position = 'relative';
      video.parentElement.appendChild(button);
  }

  async function enablePIP(videoElement = null) {
    // Recheck permission status before enabling PIP
    await checkStoredPIPPermission();
    
    if (!pipPermissionGranted) {
      console.log('PIP permission not granted, showing prompt');
      showPIPPrompt();
      return;
    }

    if ('pictureInPictureEnabled' in document) {
      try {
        const video = videoElement || await waitForVideo();
        if (!video) {
          console.error('No video element found');
          return;
        }
        
        if (!document.pictureInPictureElement) {
          console.log('Attempting to enable PIP');
          const pipButton = document.getElementById('hidden-pip-button');
          if (pipButton) {
            pipButton.click(); // Simulate user click
          } else {
            // If button doesn't exist, set up handlers again
            await setupVideoHandlers();
            const newPipButton = document.getElementById('hidden-pip-button');
            if (newPipButton) {
              newPipButton.click();
            }
          }
        }
      } catch (error) {
        console.error('Error enabling PIP:', error.message);
      }
    } else {
      console.error('Picture-in-Picture is not supported in this browser.');
    }
  }

  async function disablePIP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        console.log('PIP disabled successfully');
      } else {
        console.log('No element in PIP mode');
      }
    } catch (error) {
      console.error('Error disabling PIP:', error);
    }
  }

  // Initialize when the page is ready
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }

  // Add event listener for video element
  document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('video');
    if (video) {
      addPIPButton(video);
    }

    // Watch for video elements being added to the page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'VIDEO') {
            console.log('Video element found');
            addPIPButton(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  // Listen for PIP state changes
  document.addEventListener('enterpictureinpicture', () => {
      const button = document.querySelector('button'); // Adjust selector as needed
      if (button) button.innerText = 'Exit PIP';
  });

  document.addEventListener('leavepictureinpicture', () => {
      const button = document.querySelector('button'); // Adjust selector as needed
      if (button) button.innerText = 'PIP';
  });

  function showPIPPrompt() {
    const existingPrompt = document.querySelector('.pip-prompt');
    if (existingPrompt) return;

    // Create overlay background
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9998';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    const prompt = document.createElement('div');
    prompt.className = 'pip-prompt';
    prompt.style.backgroundColor = 'white';
    prompt.style.color = '#333';
    prompt.style.padding = '24px';
    prompt.style.borderRadius = '12px';
    prompt.style.zIndex = '9999';
    prompt.style.display = 'flex';
    prompt.style.flexDirection = 'column';
    prompt.style.gap = '20px';
    prompt.style.width = '400px';
    prompt.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

    const message = document.createElement('div');
    message.style.fontSize = '16px';
    message.style.lineHeight = '1.5';
    message.style.textAlign = 'center';
    message.innerText = 'Would you like to enable automatic Picture-in-Picture when switching tabs?';
    prompt.appendChild(message);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '12px';
    buttonContainer.style.justifyContent = 'center';

    const buttonStyles = `
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    `;

    const enableButton = document.createElement('button');
    enableButton.innerText = 'Enable';
    enableButton.style.cssText = buttonStyles;
    enableButton.style.backgroundColor = '#2196F3';
    enableButton.style.color = 'white';
    enableButton.style.marginLeft = '8px';
    enableButton.addEventListener('mouseover', () => {
        enableButton.style.backgroundColor = '#1976D2';
    });
    enableButton.addEventListener('mouseout', () => {
        enableButton.style.backgroundColor = '#2196F3';
    });

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Not Now';
    cancelButton.style.cssText = buttonStyles;
    cancelButton.style.backgroundColor = '#f5f5f5';
    cancelButton.style.color = '#666';
    cancelButton.addEventListener('mouseover', () => {
        cancelButton.style.backgroundColor = '#e0e0e0';
    });
    cancelButton.addEventListener('mouseout', () => {
        cancelButton.style.backgroundColor = '#f5f5f5';
    });

    enableButton.addEventListener('click', async () => {
        hasUserInteracted = true;
        pipPermissionGranted = true;
        await chrome.storage.local.set({ pipPermissionGranted: true });
        
        const video = await waitForVideo();
        if (video) {
            const pipButton = document.getElementById('hidden-pip-button');
            if (pipButton) {
                pipButton.click();
            }
        }
        document.body.removeChild(overlay);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(enableButton);
    prompt.appendChild(buttonContainer);
    overlay.appendChild(prompt);
    document.body.appendChild(overlay);
  }

  // Add observer for video element changes
  const videoObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'VIDEO') {
          console.log('New video element detected');
          setupVideoHandlers();
        }
      });
    });
  });

  // Start observing after initialization
  document.addEventListener('DOMContentLoaded', () => {
    videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();
