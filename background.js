/**
 * Mostly serve as a central hub for receiving commands from individual
 * frames on a page, then issuing same command to the entire tab's frames.
 */
chrome.runtime.onMessage.addListener(function(msg, sender, callback) {
  if (sender && sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, msg);
  }
});
