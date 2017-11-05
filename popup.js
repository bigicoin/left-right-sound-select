/**
 * This script runs inside the popup box (popup.html).
 * Establishes a port connection to the Chrome extension background.js
 * to issue commands (upon clicking buttons) or retrieve
 * current status.
 */
var extBackground = chrome.runtime.connect();
var isMono = false;

/**
 * Listens to Extension background.js for current channel status,
 * so that the UI will appear correctly if this isn't the first
 * time the user opens the popup on this tab.
 */
extBackground.onMessage.addListener(function(msg) {
  if (msg && msg.dir) {
    document.querySelectorAll('button').forEach(function(item) {
      item.classList.remove('active')
    });
    if (msg.dir === 'none') {
      isMono = false;
    } else {
      isMono = msg.dir;
      document.getElementById(isMono).classList.add('active');
    }
  }
});

/**
 * Lets background.js know this popup is ready, either start the work
 * by hooking up all the audio nodes from the page, or if already hooked
 * up before, retrieve current status for display.
 */
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  // popup is generally tab-agnostic, so need to get the tab that is active
  var currentTab = tabs[0];
  extBackground.postMessage({action: 'start', tabId: currentTab.id});
});

/**
 * Handler for our popup page's UI buttons.
 */
var buttonHandler = function(e) {
  var clickedDirection = e.target.id;
  if (isMono === clickedDirection) {
    // clicking from mono to stereo
    document.querySelectorAll('button').forEach(function(item) {
      item.classList.remove('active')
    });
    isMono = false;
    clickedDirection = 'none';
  } else {
    // clicking from stereo to mono, or,
    // clicking from one mono dir to another dir
    document.querySelectorAll('button').forEach(function(item) {
      item.classList.remove('active')
    });
    document.getElementById(clickedDirection).classList.add('active');
    isMono = clickedDirection;
  }
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // popup is generally tab-agnostic, so need to get the tab that is active
    var currentTab = tabs[0];
    extBackground.postMessage({action: 'change', tabId: currentTab.id, dir: clickedDirection});
  });  
};
document.getElementById('left').addEventListener('click', buttonHandler);
document.getElementById('right').addEventListener('click', buttonHandler);
