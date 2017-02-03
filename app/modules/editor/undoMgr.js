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
  this.setEditor = function (editorInstance) {
    this.editor = editorInstance;
  };
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
      selectionStartAfter: this.editor.selectionMgr.selectionStart,
      selectionEndAfter: this.editor.selectionMgr.selectionEnd,
      content: this.editor.textContent,
      discussionListJSON: this.editor.fileDesc.discussionListJSON
    };
    lastTime = currentTime;
    lastMode = this.currentMode;
    this.currentMode = undefined;
    this.onButtonStateChange();
  }, this);
  this.saveSelectionState = _.debounce(function () {
    // Should happen just after saveState
    if (this.currentMode === undefined) {
      selectionStartBefore = this.editor.selectionMgr.selectionStart;
      selectionEndBefore = this.editor.selectionMgr.selectionEnd;
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
    this.editor.watcher.noWatch(function () {
      if (this.editor.textContent != state.content) {
        this.editor.setValueNoWatch(state.content);
        this.editor.fileDesc.content = state.content;
        //eventMgr.onContentChanged(fileDesc, state.content);
        messenger.publish.extension('onContentChanged', this.editor.fileDesc);
      }
      this.editor.selectionMgr.setSelectionStartEnd(selectionStart, selectionEnd);
      this.editor.selectionMgr.updateSelectionRange();
      this.editor.selectionMgr.updateCursorCoordinates(true);
      var discussionListJSON = this.editor.fileDesc.discussionListJSON;
      if (discussionListJSON != state.discussionListJSON) {
        var oldDiscussionList = this.editor.fileDesc.discussionList;
        this.editor.fileDesc.discussionListJSON = state.discussionListJSON;
        var newDiscussionList = this.editor.fileDesc.discussionList;
        var diff = jsonDiffPatch.diff(oldDiscussionList, newDiscussionList);
        var commentsChanged = false;
        _.each(diff, function (discussionDiff, discussionIndex) {
          if (!_.isArray(discussionDiff)) {
            commentsChanged = true;
          } else if (discussionDiff.length === 1) {
            //eventMgr.onDiscussionCreated(fileDesc, newDiscussionList[discussionIndex]);
            messenger.publish.extension('onDiscussionCreated', this.editor.fileDesc, newDiscussionList[
              discussionIndex]);
          } else {
            //eventMgr.onDiscussionRemoved(fileDesc, oldDiscussionList[discussionIndex]);
            messenger.publish.extension('onDiscussionRemoved', this.editor.fileDesc, oldDiscussionList[
              discussionIndex]);
          }
        });
        //commentsChanged && eventMgr.onCommentsChanged(fileDesc);
        commentsChanged && messenger.publish.extension('onCommentsChanged', this.editor.fileDesc);
      }
    });

    selectionStartBefore = selectionStart;
    selectionEndBefore = selectionEnd;
    currentState = state;
    this.currentMode = undefined;
    lastMode = undefined;
    this.onButtonStateChange();
    this.editor.adjustCursorPosition();
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
    var content = this.editor.fileDesc.content;
    undoStack = [];
    redoStack = [];
    lastTime = 0;
    currentState = {
      selectionStartAfter: this.editor.fileDesc.selectionStart,
      selectionEndAfter: this.editor.fileDesc.selectionEnd,
      content: content,
      discussionListJSON: this.editor.fileDesc.discussionListJSON
    };
    this.currentMode = undefined;
    lastMode = undefined;
    this.editor.contentElt.textContent = content;
    // Force this since the content could be the same
    this.editor.checkContentChangeCB();
  };
}

module.exports = UndoMgr;
