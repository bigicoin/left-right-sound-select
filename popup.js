var port = chrome.extension.connect();
var isMono = false;

// this listens to extension background for current channel status
// and makes UI appear correct to start
port.onMessage.addListener(function(msg) {
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

// tells extension to hook up audio context for current tab if needed
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  var currentTab = tabs[0];
  port.postMessage({action: 'start', tabId: currentTab.id});
});

// click handler for UI
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
    var currentTab = tabs[0];
    port.postMessage({action: 'change', tabId: currentTab.id, dir: clickedDirection});
  });  
};
document.getElementById('left').addEventListener('click', buttonHandler);
document.getElementById('right').addEventListener('click', buttonHandler);
