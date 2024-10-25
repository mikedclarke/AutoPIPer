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
      console.log('PIP permission status:', pipPermissionGranted);
    } catch (error) {
      console.error('Error checking PIP permission:', error);
    }
  }

  // Initialize the content script
  function initialize() {
    if (window.AutoPIPer_isInitialized) return;
    
    console.log('Initializing content script');
    window.AutoPIPer_isInitialized = true;
    
    // Check stored permission first
    checkStoredPIPPermission();
    
    // Let the background script know we're ready
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
    
    // Add click listener to document to track user interaction
    document.addEventListener('click', () => {
      hasUserInteracted = true;
    }, { once: true });

    const video = document.querySelector('video');
    if (video) {
      // Create a hidden PIP button that we can programmatically click
      const pipButton = document.createElement('button');
      pipButton.id = 'hidden-pip-button';
      pipButton.style.display = 'none';
      document.body.appendChild(pipButton);
      
      // Add click handler to the hidden button
      pipButton.addEventListener('click', () => {
        if (video && !document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(console.error);
        }
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
    if (!pipPermissionGranted) {
      console.log('PIP permission not granted');
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
          const pipButton = document.getElementById('hidden-pip-button');
          if (pipButton) {
            pipButton.click(); // Simulate user click
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

    const prompt = document.createElement('div');
    prompt.className = 'pip-prompt';
    prompt.style.position = 'fixed';
    prompt.style.top = '20px';
    prompt.style.right = '20px';
    prompt.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    prompt.style.color = 'white';
    prompt.style.padding = '15px';
    prompt.style.borderRadius = '8px';
    prompt.style.zIndex = '9999';
    prompt.style.display = 'flex';
    prompt.style.flexDirection = 'column';
    prompt.style.gap = '10px';
    prompt.style.maxWidth = '300px';

    const message = document.createElement('div');
    message.innerText = 'Would you like to enable automatic Picture-in-Picture when switching tabs?';
    prompt.appendChild(message);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'flex-end';

    const enableButton = document.createElement('button');
    enableButton.innerText = 'Enable';
    enableButton.style.padding = '5px 15px';
    enableButton.style.backgroundColor = '#2196F3';
    enableButton.style.border = 'none';
    enableButton.style.borderRadius = '4px';
    enableButton.style.color = 'white';
    enableButton.style.cursor = 'pointer';

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Not Now';
    cancelButton.style.padding = '5px 15px';
    cancelButton.style.backgroundColor = '#666';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.color = 'white';
    cancelButton.style.cursor = 'pointer';

    enableButton.addEventListener('click', async () => {
        hasUserInteracted = true;
        pipPermissionGranted = true;
        // Store the permission
        await chrome.storage.local.set({ pipPermissionGranted: true });
        
        const video = await waitForVideo();
        if (video) {
          const pipButton = document.getElementById('hidden-pip-button');
          if (pipButton) {
            pipButton.click(); // Simulate user click
          }
        }
        document.body.removeChild(prompt);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(prompt);
    });

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(enableButton);
    prompt.appendChild(buttonContainer);
    document.body.appendChild(prompt);
  }
})();
