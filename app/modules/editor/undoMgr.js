// Used to undo/redo editor changes

var
  path = require('path'),
  _ = require('lodash'),
  messenger = require(path.resolve(__dirname, '../messenger')),
  utils = require(path.resolve(__dirname, '../utils'));
var jsonDiffPatch = require('jsondiffpatch').create({
  objectHash: function (obj) {
    return JSON.stringify(obj);
  },
  arrays: {
    detectMove: false
  },
  textDiff: {
    minLength: 9999999
  }
});


function UndoMgr() {
  var undoStack = [];
  var redoStack = [];
  var lastTime;
  var lastMode;
  var currentState;
  var selectionStartBefore;
  var selectionEndBefore;
  this.setCommandMode = function () {
    this.currentMode = 'command';
  };
  this.setMode = function () {}; // For compatibility with PageDown
  this.onButtonStateChange = function () {}; // To be overridden by PageDown
  this.saveState = utils.debounce(function () {
    redoStack = [];
    var currentTime = Date.now();
    if (this.currentMode == 'comment' ||
      this.currentMode == 'replace' ||
      lastMode == 'newlines' ||
      this.currentMode != lastMode ||
      currentTime - lastTime > 1000) {
      undoStack.push(currentState);
      // Limit the size of the stack
      while (undoStack.length > 100) {
        undoStack.shift();
      }
    } else {
      // Restore selectionBefore that has potentially been modified by saveSelectionState
      selectionStartBefore = currentState.selectionStartBefore;
      selectionEndBefore = currentState.selectionEndBefore;
    }
    currentState = {
      selectionStartBefore: selectionStartBefore,
      selectionEndBefore: selectionEndBefore,
      selectionStartAfter: selectionMgr.selectionStart,
      selectionEndAfter: selectionMgr.selectionEnd,
      content: textContent,
      discussionListJSON: fileDesc.discussionListJSON
    };
    lastTime = currentTime;
    lastMode = this.currentMode;
    this.currentMode = undefined;
    this.onButtonStateChange();
  }, this);
  this.saveSelectionState = _.debounce(function () {
    // Should happen just after saveState
    if (this.currentMode === undefined) {
      selectionStartBefore = selectionMgr.selectionStart;
      selectionEndBefore = selectionMgr.selectionEnd;
    }
  }, 50);
  this.canUndo = function () {
    return undoStack.length;
  };
  this.canRedo = function () {
    return redoStack.length;
  };

  function restoreState(state, selectionStart, selectionEnd) {
    // Update editor
    watcher.noWatch(function () {
      if (textContent != state.content) {
        setValueNoWatch(state.content);
        fileDesc.content = state.content;
        //eventMgr.onContentChanged(fileDesc, state.content);
        messenger.publish.file('onContentChanged', fileDesc);
      }
      selectionMgr.setSelectionStartEnd(selectionStart, selectionEnd);
      selectionMgr.updateSelectionRange();
      selectionMgr.updateCursorCoordinates(true);
      var discussionListJSON = fileDesc.discussionListJSON;
      if (discussionListJSON != state.discussionListJSON) {
        var oldDiscussionList = fileDesc.discussionList;
        fileDesc.discussionListJSON = state.discussionListJSON;
        var newDiscussionList = fileDesc.discussionList;
        var diff = jsonDiffPatch.diff(oldDiscussionList, newDiscussionList);
        var commentsChanged = false;
        _.each(diff, function (discussionDiff, discussionIndex) {
          if (!_.isArray(discussionDiff)) {
            commentsChanged = true;
          } else if (discussionDiff.length === 1) {
            eventMgr.onDiscussionCreated(fileDesc, newDiscussionList[discussionIndex]);
          } else {
            eventMgr.onDiscussionRemoved(fileDesc, oldDiscussionList[discussionIndex]);
          }
        });
        commentsChanged && eventMgr.onCommentsChanged(fileDesc);
      }
    });

    selectionStartBefore = selectionStart;
    selectionEndBefore = selectionEnd;
    currentState = state;
    this.currentMode = undefined;
    lastMode = undefined;
    this.onButtonStateChange();
    adjustCursorPosition();
  }

  this.undo = function () {
    var state = undoStack.pop();
    if (!state) {
      return;
    }
    redoStack.push(currentState);
    restoreState.call(this, state, currentState.selectionStartBefore, currentState.selectionEndBefore);
  };
  this.redo = function () {
    var state = redoStack.pop();
    if (!state) {
      return;
    }
    undoStack.push(currentState);
    restoreState.call(this, state, state.selectionStartAfter, state.selectionEndAfter);
  };
  this.init = function () {
    var content = fileDesc.content;
    undoStack = [];
    redoStack = [];
    lastTime = 0;
    currentState = {
      selectionStartAfter: fileDesc.selectionStart,
      selectionEndAfter: fileDesc.selectionEnd,
      content: content,
      discussionListJSON: fileDesc.discussionListJSON
    };
    this.currentMode = undefined;
    lastMode = undefined;
    contentElt.textContent = content;
    // Force this since the content could be the same
    checkContentChange();
  };
}

module.exports = UndoMgr;
