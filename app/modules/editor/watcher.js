// Used to detect editor changes

var MutationObserver = require('mutationobservers');

function Watcher() {
  this.isWatching = false;
  var contentObserver;
  this.startWatching = function (contentElt, checkContentChange) {
    this.isWatching = true;
    contentObserver = contentObserver || new MutationObserver(
      checkContentChange);
    contentObserver.observe(contentElt, {
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
