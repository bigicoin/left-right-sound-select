/**
 * This script runs inside the popup box (popup.html).
 */
var isMono = false;

/**
 * Lets background.js know this popup is ready, either start the work
 * by hooking up all the audio nodes from the page, or if already hooked
 * up before, retrieve current status for display.
 */
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  // popup is generally tab-agnostic, so need to get the tab that is active
  var currentTab = tabs[0];
  chrome.tabs.sendMessage(
    currentTab.id,
    {action: 'start'},
    /**
     * Get current channel status
     * So that the UI will appear correctly if this isn't the first
     * time the user opens the popup on this tab.
     */
    function(response) {
      if (response && response.dir) {
        // reset active states first
        document.querySelectorAll('button').forEach(function(item) {
          item.classList.remove('active')
        });
        if (response.dir === 'fail') {
          // fail state: disable button
          isMono = false;
          document.querySelectorAll('button').forEach(function(item) {
            item.disabled = 'disabled';
          });
        } else if (response.dir === 'none') {
          // no mono
          isMono = false;
        } else {
          // mono in one dir
          isMono = response.dir;
          document.getElementById(isMono).classList.add('active');
        }
      }
    }
  );
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
    chrome.tabs.sendMessage(currentTab.id, {action: 'change', dir: clickedDirection});
  });  
};
document.getElementById('left').addEventListener('click', buttonHandler);
document.getElementById('right').addEventListener('click', buttonHandler);
