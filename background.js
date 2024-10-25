// background.js

// Keep track of YouTube tabs and their states
let youtubeTabsMap = new Map();

// Function to check if a tab is a YouTube video page
function isYouTubeVideo(tab) {
  return tab.url && tab.url.startsWith("https://www.youtube.com/watch");
}

// Function to inject content script
async function injectContentScript(tabId) {
  try {
    // Check if content script is already injected
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.hasOwnProperty('AutoPIPer_isInitialized')
    });
    
    if (results[0].result) {
      console.log('Content script already present in tab:', tabId);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    youtubeTabsMap.set(tabId, { hasContentScript: true });
    console.log('Content script injected into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject content script:', error);
  }
}

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isYouTubeVideo(tab)) {
    console.log('YouTube video tab updated:', tabId);
    await injectContentScript(tabId);
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  youtubeTabsMap.delete(tabId);
});

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const activeTab = await chrome.tabs.get(activeInfo.tabId);
        if (activeTab.url && activeTab.url.includes('youtube.com/watch')) {
            // User returned to YouTube tab; disable PIP
            if (youtubeTabsMap.has(activeTab.id)) {
                try {
                    await injectContentScript(activeTab.id);
                    await chrome.tabs.sendMessage(activeTab.id, { action: 'disablePIP' });
                } catch (error) {
                    console.error(`Error sending disablePIP to tab ${activeTab.id}:`, error);
                }
            }
        } else {
            // User switched away from YouTube tab; enable PIP if previously active
            const youtubeTabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
            for (const tab of youtubeTabs) {
                if (youtubeTabsMap.has(tab.id)) {
                    try {
                        await injectContentScript(tab.id);
                        // Add a small delay to ensure the tab switch is complete
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await chrome.tabs.sendMessage(tab.id, { action: 'enablePIP' });
                    } catch (error) {
                        console.error(`Error sending enablePIP to tab ${tab.id}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});

// Optionally, handle messages from content scripts to update youtubeTabsMap
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CONTENT_SCRIPT_READY') {
        youtubeTabsMap.set(sender.tab.id, { hasContentScript: true });
    }
    sendResponse({ success: true });
});
