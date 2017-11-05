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

// tells extension UI is ready and hook up audio context if needed
port.postMessage({action: 'start'});

// click handler for UI
var buttonHandler = function(e) {
  var clickedDirection = e.target.id;
  if (isMono === clickedDirection) {
    // clicking from mono to stereo
    document.querySelectorAll('button').forEach(function(item) {
      item.classList.remove('active')
    });
    isMono = false;
    port.postMessage({action: 'change', dir: 'none'});
  } else {
    // clicking from stereo to mono, or,
    // clicking from one mono dir to another dir
    document.querySelectorAll('button').forEach(function(item) {
      item.classList.remove('active')
    });
    document.getElementById(clickedDirection).classList.add('active');
    isMono = clickedDirection;
    port.postMessage({action: 'change', dir: clickedDirection});
  }
};
document.getElementById('left').addEventListener('click', buttonHandler);
document.getElementById('right').addEventListener('click', buttonHandler);
