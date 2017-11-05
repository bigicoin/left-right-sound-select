var audioCtx = new (window.AudioContext)();
var source = null, splitter = null, gainLeft = null, gainRight = null, dir = null;
var tabId = null;

chrome.extension.onConnect.addListener(function(port) {
  // first, make sure disconnect handler sets all our vars back to null
  chrome.tabCapture.onStatusChanged.addListener(function(info) {
    if (info.status === 'active') {
      tabId = info.tabId;
    }
    if (info.status === 'stopped' && tabId === info.tabId) {
      tabId = source = splitter = gainLeft = gainRight = dir = null;
    }
  });
  chrome.tabs.onRemoved.addListener(function(tabIdRemoved, removed) {
    if (tabIdRemoved === tabId) {
      tabId = source = splitter = gainLeft = gainRight = dir = null;
    }
  })
  // now listens for any messages from popup
  port.onMessage.addListener(function(msg) {
    if (msg.action === 'start') {
      if (source === null) {
        // hook up all the existing audios on the page with web audio context
        chrome.tabCapture.capture({
            audio : true,
            video : false
          }, function(stream) {
            source = audioCtx.createMediaStreamSource(stream);
            splitter = audioCtx.createChannelSplitter(2);
            source.connect(splitter, 0, 0);
            gainLeft = audioCtx.createGain();
            gainRight = audioCtx.createGain();
            splitter.connect(gainLeft, 0);
            splitter.connect(gainRight, 1);
            gainLeft.connect(audioCtx.destination, 0);
            gainRight.connect(audioCtx.destination, 0);
          }
        );
      } else {
        // already have sources, let UI know of current status
        port.postMessage({dir: dir});
      }
    } else if (msg.action === 'change') {
      // actually change channel
      if (!msg.dir || msg.dir === 'none') {
        gainLeft.gain.value = 1;
        gainRight.gain.value = 1;
      } else if (msg.dir === 'left') {
        gainLeft.gain.value = 1;
        gainRight.gain.value = 0;
      } else {
        gainLeft.gain.value = 0;
        gainRight.gain.value = 1;
      }
      dir = msg.dir;
    }
  });
});
