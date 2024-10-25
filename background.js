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
  const query = { url: "https://www.youtube.com/watch*" };
  const youtubeTabs = await chrome.tabs.query(query);
  
  if (isYouTubeVideo(activeTab)) {
    // User switched to YouTube tab - disable PIP
    if (currentYouTubeTabId) {
      chrome.tabs.sendMessage(currentYouTubeTabId, { action: "disablePIP" });
      currentYouTubeTabId = null;
    }
  } else if (youtubeTabs.length > 0) {
    // User switched away from YouTube - enable PIP
    const youtubeTab = youtubeTabs[0];
    chrome.tabs.sendMessage(youtubeTab.id, { action: "enablePIP" });
    currentYouTubeTabId = youtubeTab.id;
  }
});

// Reset tracking when YouTube tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isYouTubeVideo(tab)) {
    currentYouTubeTabId = null;
  }
});
