var audioCtx = new (window.AudioContext)();
var domNodes = [];
var audioNodes = [];
var started = false;
var dir = 'none';

/**
 * Called when content script finds a new <video> or <audio> node on page.
 * Adds to our DOM Nodes list.
 * If "start" command was already issued before, also immedaitely hook
 * up to web audio.
 */
function addNode(node) {
  if (!domNodes.includes(node)) {
    // store the dom node as one we've seen so we don't add again
    domNodes.push(node);
    debug('DOM node added to list');
    if (started) {
      // late addition after web audio hooks are in -- just add one now
      hookUpWebAudio(node);
      debug('hooked up web audio node also');
    }
  }
}

/**
 * Utility method to hook up a <video> or <audio> DOM node
 * with Web Audio.
 */
function hookUpWebAudio(node) {
  // create web audio nodes from that video or audio dom node
  audioNode = {};
  audioNode.source = audioCtx.createMediaElementSource(node);
  audioNode.splitter = audioCtx.createChannelSplitter(2);
  audioNode.source.connect(audioNode.splitter, 0, 0);
  audioNode.gainLeft = audioCtx.createGain();
  audioNode.gainRight = audioCtx.createGain();
  audioNode.splitter.connect(audioNode.gainLeft, 0);
  audioNode.splitter.connect(audioNode.gainRight, 1);
  audioNode.gainLeft.connect(audioCtx.destination, 0);
  audioNode.gainRight.connect(audioCtx.destination, 0);
  audioNodes.push(audioNode);
}

/**
 * Utility method to adjust gain on a previously hooked up
 * web audio node to left or right or none.
 */
function adjustChannel(audioNode) {
  if (dir === 'none') {
    audioNode.gainLeft.gain.value = 1;
    audioNode.gainRight.gain.value = 1;
  } else if (dir === 'left') {
    audioNode.gainLeft.gain.value = 1;
    audioNode.gainRight.gain.value = 0;
  } else {
    audioNode.gainLeft.gain.value = 0;
    audioNode.gainRight.gain.value = 1;
  }
}

/**
 * Wrap console.log calls into debug call so we can easily disable it
 * before release.
 */
function debug(val) {
  console.log(val);
}

function processMessage(msg, callback) {
  if (msg.action) {
    /**
     * Start action, hook up all discovered <video> and <audio> DOM nodes
     * with Web Audio if called first time.
     * If called second time or more, simply return current dir.
     */
    if (msg.action === 'start') {
      var currentDir;
      if (!started) {
        currentDir = 'none';
      } else {
        currentDir = dir;
      }
      if (callback) {
        callback({dir: currentDir});
      }
      debug('start: reporting back current dir: ' + currentDir);
    }

    /**
     * Change action, actually adjust sound channel on all hooked up
     * web audio nodes.
     */
    else if (msg.action === 'change') {
      // if first command, hook up web audio nodes first
      if (!started) {
        for (var i = 0; i < domNodes.length; i++) {
          hookUpWebAudio(domNodes[i]);
        }
        started = true;
      }
      // issue adjust channel commandd
      dir = msg.dir;
      if (dir !== 'none' && dir !== 'left' && dir !== 'right') {
        dir = 'none';
      }
      for (var i = 0; i < audioNodes.length; i++) {
        adjustChannel(audioNodes[i]);
      }
      debug('changed all directions to ' + dir);
    }
  }
};

/**
 * Receives command from extension's popup window to perform actions.
 */
chrome.runtime.onMessage.addListener(function(msg, sender, callback) {
  processMessage(msg, callback);
});

/**
 * For sites that support this plugin, they can just fire a custom event,
 * in order to trigger sound change, like this:
window.dispatchEvent( new CustomEvent('leftRightSoundEvent', { detail: {action: 'change', dir: 'right'} }) );
 */
window.addEventListener('leftRightSoundEvent', function(e) {
  var msg = e.detail;
  processMessage(msg, null);
});

/**
 * Nowadays, JS populates elements on page dynamically a lot.
 * Simply poll every second for new video or audio elements.
 */
setInterval(function() {
  document.querySelectorAll('video,audio').forEach(function(item) {
    addNode(item);
  });
}, 1000);
