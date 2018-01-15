# Left Right Sound Select - Chrome Extension

This is the source code for the [Chrome Extension: Left Right Sound Select](https://chrome.google.com/webstore/detail/left-right-sound-select/gjaliinpmkmkehebabkfkhpbfaekgljn?hl=en).

Current Version: 0.0.1

## API

This Chrome extension is unique in that it provides a basic API for web sites to trigger functionality in the extension, namely switching sound channels from left to right, and vice versa. It also allows for web sites to detect when such a switch happened, by listening to an event.

### Trigger a sound channel change

To trigger the sound channel change for users who have this extension installed, you can fire the a Javascript custom event called `leftRightSoundEvent`. For example:

```
window.dispatchEvent( new CustomEvent('leftRightSoundEvent', { detail: {action: 'change', dir: 'right'} }) );
```

The event should contain a `detail` object that contains 2 parameters: `action` and `dir`.

`action`: Currently only supports the value `change`.

`dir`: Must be either `left` or `right`.

### Listening for sound channel change event

To listen for sound channel changes made by this extension (for example, to update the page UI to display this information), you can add an event listener for the custom event `leftRightSoundOnChange`. For example:

```
window.addEventListener('leftRightSoundOnChange', function(e) {
  var dir = e.detail.dir;
  // dir will be equal to 'left' or 'right'
});
```

The event object will contain a `detail` object, which will contain 1 parameter: `dir`. The value will be `left` or `right`.

## Tech notes

This extension uses a content script instead of background script + `chrome.tabCapture` API like most other sound-related Chrome extensions that manipulate sound.

The technical difference is that the content script will loop through every `<audio>` and `<video>` node on the page and hook them up with a WebAudio context. (Whereas `chrome.tabCapture` will take all sound output from the page into one stream)

This tech choice is intentional, to support the features of allowing web sites that support this plugin to fire events to manipulate sound channels (such as [SingK.net](http://singk.net)), without the user having to activate the extension by clicking on the extension button first.
