# AutoPIPer

**AutoPIPer** is a Chrome extension that automatically enables Picture-in-Picture (PIP) mode for YouTube videos when you switch away from the YouTube tab and disables PIP when you return to the YouTube tab.

## Features

- **Automatic PIP Activation:** When you switch to a different tab while watching a YouTube video, the video automatically enters PIP mode.
- **Automatic PIP Deactivation:** When you return to the YouTube tab, PIP mode is disabled, and the video resumes in the main tab.
- **Limitations:** Due to browser security, once you return to the video and PIP is disabled. PIP wont auto activate again unless the user pauses then resumes the video first. This manual interaction is required to re-enable PIP. Auto PIP after loading a new video is uneffected.

## Installation

1. Clone or download the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click on **Load unpacked** and select the `AutoPIPer` directory.

## Permissions

- **tabs:** To monitor tab changes.
- **scripting:** To inject scripts into web pages.
- **activeTab:** To interact with the currently active tab.
- **storage:** To save states.

## Privacy

AutoPIPer does not collect or store any user data. All operations are performed locally within your browser.

## License

MIT License