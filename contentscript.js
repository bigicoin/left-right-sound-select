/**
 * This runs on the page document.
 * We use this to detect for sites that support this plugin, who will
 * fire custom events to switch left/right sound channels from the page's
 * own UI.
 */

var extBackground = chrome.runtime.connect();

// This event can be fired from a web page js code like this:
/*
var event = new CustomEvent('leftRightSoundEvent', { detail: 'left' });
window.dispatchEvent(event);
*/
window.addEventListener('leftRightSoundEvent', function(e) {
  var dir = e.detail;
  // we do not have access to tab id from here, however, background.js
  // can see a sender.tab.id when it comes from a content script.
  extBackground.postMessage({action: 'change', dir: dir});
});
