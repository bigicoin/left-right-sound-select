var audioCtx = new (window.AudioContext)();

// key'd by tab ids, values are {source, splitter, gainLeft, gainRight, dir}
var audioNodes = {};

chrome.extension.onConnect.addListener(function(port) {
  // first, make sure disconnect handler sets all our vars back to null
  chrome.tabCapture.onStatusChanged.addListener(function(info) {
    if (info.status === 'stopped' && tabId === info.tabId) {
      audioNodes[tabIdRemoved].source.disconnect();
      audioNodes[tabIdRemoved].splitter.disconnect();
      audioNodes[tabIdRemoved].gainLeft.disconnect();
      audioNodes[tabIdRemoved].gainRight.disconnect();
      delete audioNodes[tabIdRemoved];
    }
  });
  chrome.tabs.onRemoved.addListener(function(tabIdRemoved, removed) {
    if (audioNodes[tabIdRemoved]) {
      audioNodes[tabIdRemoved].source.disconnect();
      audioNodes[tabIdRemoved].splitter.disconnect();
      audioNodes[tabIdRemoved].gainLeft.disconnect();
      audioNodes[tabIdRemoved].gainRight.disconnect();
      delete audioNodes[tabIdRemoved];
    }
  })
  // now listens for any messages from popup
  port.onMessage.addListener(function(msg) {
    var tabId = msg.tabId;
    if (msg.action === 'start') {
      if (!audioNodes[tabId]) {
        // hook up all the existing audios on the page with web audio context
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
        // already have sources, let UI know of current status
        port.postMessage({dir: audioNodes[tabId].dir});
      }
    } else if (msg.action === 'change') {
      // actually change channel
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
