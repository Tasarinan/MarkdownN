// Used to detect editor changes
var MutationObserver = require('mutation-observer');

function Watcher() {
  this.isWatching = false;
  var contentObserver;
  this.startWatching = function () {
    this.isWatching = true;
    contentObserver = contentObserver || new MutationObserver(
      editor.checkContentChange);
    contentObserver.observe(editor.contentElt, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };
  this.stopWatching = function () {
    contentObserver.disconnect();
    this.isWatching = false;
  };
  this.noWatch = function (cb) {
    if (this.isWatching === true) {
      this.stopWatching();
      cb();
      this.startWatching();
    } else {
      cb();
    }
  };
}
module.exports = Watcher;
