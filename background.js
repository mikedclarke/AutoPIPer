// background.js

// Keeps track of the currently active YouTube tab
let currentYouTubeTabId = null;

// Function to check if a tab is a YouTube video page
function isYouTubeVideo(tab) {
  return tab.url && tab.url.startsWith("https://www.youtube.com/watch");
}

// Listener for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const activeTab = await chrome.tabs.get(activeInfo.tabId);
  
  if (isYouTubeVideo(activeTab)) {
    // User has returned to a YouTube tab
    if (currentYouTubeTabId) {
      // Disable PIP on the previously pip-enabled tab
      chrome.scripting.executeScript({
        target: { tabId: currentYouTubeTabId },
        func: disablePIP
      });
      currentYouTubeTabId = null;
    }
  } else {
    // User has switched away from YouTube
    if (isYouTubeVideo(activeTab)) {
      // If the active tab is YouTube, do nothing
      return;
    }
    
    // Find the active YouTube video tab
    const query = { url: "https://www.youtube.com/watch*" };
    const youtubeTabs = await chrome.tabs.query(query);
    if (youtubeTabs.length > 0) {
      const youtubeTab = youtubeTabs[0];
      if (youtubeTab.id !== currentYouTubeTabId) {
        // Enable PIP on the YouTube tab
        chrome.scripting.executeScript({
          target: { tabId: youtubeTab.id },
          func: enablePIP
        });
        currentYouTubeTabId = youtubeTab.id;
      }
    }
  }
});

// Listener for tab updates (e.g., URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (isYouTubeVideo(tab) && changeInfo.status === 'complete') {
    // If a YouTube video page is loaded, reset the currentYouTubeTabId
    currentYouTubeTabId = tabId;
  }
});

// Function to enable PIP
function enablePIP() {
  const video = document.querySelector('video');
  if (video && document.pictureInPictureElement !== video) {
    video.requestPictureInPicture().catch(error => {
      console.error('Error entering Picture-in-Picture:', error);
    });
  }
}

// Function to disable PIP
function disablePIP() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(error => {
      console.error('Error exiting Picture-in-Picture:', error);
    });
  }
}