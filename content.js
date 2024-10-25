// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enablePIP") {
      enablePIP();
    } else if (request.action === "disablePIP") {
      disablePIP();
    }
  });
  
  function enablePIP() {
    const video = document.querySelector('video');
    if (video && document.pictureInPictureElement !== video) {
      video.requestPictureInPicture().catch(error => {
        console.error('Error entering Picture-in-Picture:', error);
      });
    }
  }
  
  function disablePIP() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(error => {
        console.error('Error exiting Picture-in-Picture:', error);
      });
    }
  }