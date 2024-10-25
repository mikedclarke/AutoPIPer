// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  if (request.action === "enablePIP") {
    enablePIP();
  } else if (request.action === "disablePIP") {
    disablePIP();
  }
});

function enablePIP() {
  const video = document.querySelector('video');
  if (video && document.pictureInPictureElement !== video) {
    video.requestPictureInPicture()
      .then(() => console.log('PIP enabled successfully'))
      .catch(error => console.error('Error entering Picture-in-Picture:', error));
  } else {
    console.log('Video element not found or already in PIP');
  }
}

function disablePIP() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture()
      .then(() => console.log('PIP disabled successfully'))
      .catch(error => console.error('Error exiting Picture-in-Picture:', error));
  } else {
    console.log('No element in PIP mode');
  }
}
