/**
 * This runs in the background of Chrome all the time,
 * There is only one instance of this, for all tabs and windows.
 * It needs to know how to communicate with multiple tabs, and handle
 * each tab doing their own thing with sound channels.
 */

// init the Web Audio API (AudioContext)
var audioCtx = new (window.AudioContext)();

// key'd by tab ids, values are objects of {source, splitter, gainLeft, gainRight, dir}
var audioNodes = {};

/**
 * Everything operates based on the user initiating the extension's popup.
 * Listen for the popup to establish a connection with us (background.js).
 */
chrome.runtime.onConnect.addListener(function(clientPopup) {

  /**
   * When tab capture is stopped, be sure to disconnect all nodes to
   * return audio to normal, and clean up our objects and memory use.
   */
  chrome.tabCapture.onStatusChanged.addListener(function(info) {
    if (info.status === 'stopped') {
      audioNodes[info.tabId].source.disconnect();
      audioNodes[info.tabId].splitter.disconnect();
      audioNodes[info.tabId].gainLeft.disconnect();
      audioNodes[info.tabId].gainRight.disconnect();
      delete audioNodes[info.tabId];
    }
  });

  /**
   * When a tab is closed, also be sure to disconnect all nodes to
   * return audio to normal, and clean up our objects and memory use.
   */
  chrome.tabs.onRemoved.addListener(function(tabIdRemoved, removed) {
    if (audioNodes[tabIdRemoved]) {
      audioNodes[tabIdRemoved].source.disconnect();
      audioNodes[tabIdRemoved].splitter.disconnect();
      audioNodes[tabIdRemoved].gainLeft.disconnect();
      audioNodes[tabIdRemoved].gainRight.disconnect();
      delete audioNodes[tabIdRemoved];
    }
  })

  /**
   * Listen to start event or commands from a popup client.
   */
  clientPopup.onMessage.addListener(function(msg, port) {
    var tabId = null;

    if (port.sender.tab && port.sender.tab.id) {
      // should be the case of coming from content script
      tabId = port.sender.tab.id;
    } else if (!port.sender.tab && msg.tabId) {
      // should be the case of coming from popup script
      tabId = msg.tabId;
    }

    if (!tabId) {
      // if cannot figure out what tab this command or event comes from
      // we cannot do anything.
      return;
    }

    /**
     * Popup client was just opened
     */
    if (msg.action === 'start') {
      if (!audioNodes[tabId]) {
        // First time this tab is opening the popup client.
        // Hook up audios on the page with some new audio nodes,
        // using tabCapture to get an audio stream
        chrome.tabCapture.capture({
            audio : true,
            video : false
          }, function(stream) {
            audioNodes[tabId] = {};
            audioNodes[tabId].source = audioCtx.createMediaStreamSource(stream);
            audioNodes[tabId].splitter = audioCtx.createChannelSplitter(2);
            audioNodes[tabId].source.connect(audioNodes[tabId].splitter, 0, 0);
            audioNodes[tabId].gainLeft = audioCtx.createGain();
            audioNodes[tabId].gainRight = audioCtx.createGain();
            audioNodes[tabId].splitter.connect(audioNodes[tabId].gainLeft, 0);
            audioNodes[tabId].splitter.connect(audioNodes[tabId].gainRight, 1);
            audioNodes[tabId].gainLeft.connect(audioCtx.destination, 0);
            audioNodes[tabId].gainRight.connect(audioCtx.destination, 0);
            audioNodes[tabId].dir = 'none';
          }
        );
      } else {
        // This tab has opened the popup client before and we have audio nodes
        // created already, let UI know of current status
        clientPopup.postMessage({dir: audioNodes[tabId].dir});
      }
    }

    /**
     * Popup client issued a command to change sound channels
     */
    else if (msg.action === 'change') {
      if (!msg.dir || msg.dir === 'none') {
        audioNodes[tabId].gainLeft.gain.value = 1;
        audioNodes[tabId].gainRight.gain.value = 1;
      } else if (msg.dir === 'left') {
        audioNodes[tabId].gainLeft.gain.value = 1;
        audioNodes[tabId].gainRight.gain.value = 0;
      } else {
        audioNodes[tabId].gainLeft.gain.value = 0;
        audioNodes[tabId].gainRight.gain.value = 1;
      }
      audioNodes[tabId].dir = msg.dir;
    }
  });
});
