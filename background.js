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
chrome.runtime.onConnect.addListener(function(clientPort) {

  /**
   * When tab capture is stopped, be sure to disconnect all nodes to
   * return audio to normal, and clean up our objects and memory use.
   */
  chrome.tabCapture.onStatusChanged.addListener(function(info) {
    if (info.status === 'stopped') {
      if (audioNodes[info.tabId]) {
        audioNodes[info.tabId].source.disconnect();
        audioNodes[info.tabId].splitter.disconnect();
        audioNodes[info.tabId].gainLeft.disconnect();
        audioNodes[info.tabId].gainRight.disconnect();
        delete audioNodes[info.tabId];
      }
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
  clientPort.onMessage.addListener(function(msg, port) {
    var tab = null;

    // this is the case of a message coming from content script.
    // not used for now -- we are no longer using content scripts.
    /*
    if (port.sender.tab) {
      tab = port.sender.tab;
    }
    */
    // message comes from popup, always includes a tab in msg
    // because popup figures out its own tab id with chrome.tabs.query.
    if (msg.tab) {
      tab = msg.tab;
    }

    if (!tab) {
      // if cannot figure out what tab this command or event comes from
      // we cannot do anything.
      return;
    }

    processMessage(msg, tab, clientPort);
  });
});

/**
 * Accepted sites that work with this plugin can send external messages
 * directly into the plugin. (see manifest.json for domains accepted)
 * They would post message this way:
chrome.runtime.sendMessage('jhkelnemcoamgbglhfejoillakdbbjed', {action: 'start'});
chrome.runtime.sendMessage('jhkelnemcoamgbglhfejoillakdbbjed', {action: 'change', dir: 'right'});
 */
chrome.runtime.onMessageExternal.addListener(function(msg, sender, sendResponse) {
  var tab = null;

  // for external messaging, the tab id should come in as sender.tab.id
  if (sender && sender.tab) {
    tab = sender.tab;
  }

  if (!tab) {
    // if cannot figure out what tab this command or event comes from
    // we cannot do anything.
    return;
  }

  processMessage(msg, tab, null);
});

function processMessage(msg, tab, clientPort) {
  /**
   * Popup client was just opened.
   */
  if (msg.action === 'start') {
    if (!audioNodes[tab.id]) {
      // First time this tab is opening the popup client.
      // Hook up audios on the page with some new audio nodes,
      // using tabCapture to get an audio stream
      chrome.tabCapture.capture({ audio : true }, function(stream) {
        if (stream) { 
          audioNodes[tab.id] = {};
          audioNodes[tab.id].source = audioCtx.createMediaStreamSource(stream);
          audioNodes[tab.id].splitter = audioCtx.createChannelSplitter(2);
          audioNodes[tab.id].source.connect(audioNodes[tab.id].splitter, 0, 0);
          audioNodes[tab.id].gainLeft = audioCtx.createGain();
          audioNodes[tab.id].gainRight = audioCtx.createGain();
          audioNodes[tab.id].splitter.connect(audioNodes[tab.id].gainLeft, 0);
          audioNodes[tab.id].splitter.connect(audioNodes[tab.id].gainRight, 1);
          audioNodes[tab.id].gainLeft.connect(audioCtx.destination, 0);
          audioNodes[tab.id].gainRight.connect(audioCtx.destination, 0);
          audioNodes[tab.id].dir = 'none';
        } else {
          if (clientPort) {
            clientPort.postMessage({dir: 'fail'});
          }
        }
      });
    } else {
      // This tab has opened the popup client before and we have audio nodes
      // created already, let UI know of current status
      if (clientPort) {
        clientPort.postMessage({dir: audioNodes[tab.id].dir});
      }
    }
  }

  /**
   * Popup client issued a command to change sound channels
   */
  else if (msg.action === 'change') {
    if (audioNodes[tab.id]) {
      if (!msg.dir || msg.dir === 'none') {
        audioNodes[tab.id].gainLeft.gain.value = 1;
        audioNodes[tab.id].gainRight.gain.value = 1;
      } else if (msg.dir === 'left') {
        audioNodes[tab.id].gainLeft.gain.value = 1;
        audioNodes[tab.id].gainRight.gain.value = 0;
      } else {
        audioNodes[tab.id].gainLeft.gain.value = 0;
        audioNodes[tab.id].gainRight.gain.value = 1;
      }
      audioNodes[tab.id].dir = msg.dir;
    }
  }
}
