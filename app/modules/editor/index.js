/// <reference path="../../../typings/jquery/jquery.d.ts"/>
/* global appSettings */
/* global ace */
/*jslint browser:true*/
/*global window*/

var
  path = require('path'),
  _ = require('lodash'),
  crel = require('crel'),
  diffMatchPatch = require('googlediff'),
  messenger = require(path.resolve(__dirname, '../messenger')),
  settings = require(path.resolve(__dirname, '../settings')),

  $editor,
  $window = $(window),
  suspendPublishSourceChange = false,
  session,
  currentFile = {},
  noop = function () {},

  _suspendOnChangeEventHandler = false;

var editor = {
  inputElt: null,
  contentElt: null,
  marginElt: null,
  previewElt: null,
  fileChanged: true,
  fileDesc: null,
  textContent: null,
  isComposing: 0,
  pagedownEditor: null,
  trailingLfNode: null,
  sectionList: []
};
var scrollTop = 0;
//var inputElt;
//var $inputElt;
//var contentElt;
//var $contentElt;
//var marginElt;
//var $marginElt;
//var previewElt;
//var pagedownEditor;
//var trailingLfNode;
//var isComposing = 0;
//var fileChanged = true;
//var fileDesc;
//var textContent;



var buildFlags = require('./buildFlags.js');
var Watcher = require('./watcher.js');
var SelectionMgr = require('./selectionMgr.js');
var UndoMgr = require('./undoMgr.js');
var watcher = new Watcher();
var selectionMgr = new SelectionMgr();
var undoMgr = new UndoMgr();

editor.selectionMgr = selectionMgr;
editor.watcher = watcher;
editor.undoMgr = undoMgr;
$(document).on('selectionchange', '.editor-content', _.bind(selectionMgr.saveSelectionState, selectionMgr, true,
  false));

editor.adjustCursorPosition = function (force) {
  if (editor.inputElt === undefined) {
    return;
  }
  selectionMgr.saveSelectionState(true, true, force);
};

editor.setValue = function (value) {
  var startOffset = diffMatchPatch.diff_commonPrefix(this.textContent, value);
  if (startOffset === this.textContent.length) {
    startOffset--;
  }
  var endOffset = Math.min(
    diffMatchPatch.diff_commonSuffix(this.textContent, value),
    this.textContent.length - startOffset,
    value.length - startOffset
  );
  var replacement = value.substring(startOffset, value.length - endOffset);
  var range = selectionMgr.createRange(startOffset, this.textContent.length - endOffset);
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  return {
    start: startOffset,
    end: value.length - endOffset
  };
};

editor.replace = function (selectionStart, selectionEnd, replacement) {
  undoMgr.currentMode = undoMgr.currentMode || 'replace';
  var range = selectionMgr.createRange(
    Math.min(selectionStart, selectionEnd),
    Math.max(selectionStart, selectionEnd)
  );
  if ('' + range != replacement) {
    range.deleteContents();
    range.insertNode(document.createTextNode(replacement));
  }
  var endOffset = selectionStart + replacement.length;
  selectionMgr.setSelectionStartEnd(endOffset, endOffset);
  selectionMgr.updateSelectionRange();
  selectionMgr.updateCursorCoordinates(true);
};

editor.replaceAll = function (search, replacement) {
  undoMgr.currentMode = undoMgr.currentMode || 'replace';
  var value = this.textContent.replace(search, replacement);
  if (value != this.textContent) {
    var offset = editor.setValue(value);
    selectionMgr.setSelectionStartEnd(offset.end, offset.end);
    selectionMgr.updateSelectionRange();
    selectionMgr.updateCursorCoordinates(true);
  }
};



editor.replacePreviousText = function (text, replacement) {
  var offset = selectionMgr.selectionStart;
  if (offset !== selectionMgr.selectionEnd) {
    return false;
  }
  var range = selectionMgr.createRange(offset - text.length, offset);
  if ('' + range != text) {
    return false;
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  offset = offset - text.length + replacement.length;
  selectionMgr.setSelectionStartEnd(offset, offset);
  selectionMgr.updateSelectionRange();
  selectionMgr.updateCursorCoordinates(true);
  return true;
};

editor.setValueNoWatch = function setValueNoWatch(value) {
  this.setValue(value);
  this.textContent = value;
};

editor.getValue = function () {
  return this.textContent;
};

editor.focus = function () {
  $(this.contentElt).focus();
  selectionMgr.updateSelectionRange();
  this.inputElt.scrollTop = scrollTop;
};
editor.adjustCommentOffsets = function (oldTextContent, newTextContent, discussionList) {
  if (!discussionList.length) {
    return;
  }
  var changes = diffMatchPatch.diff_main(oldTextContent, newTextContent);
  var changed = false;
  var startOffset = 0;
  changes.forEach(function (change) {
    var changeType = change[0];
    var changeText = change[1];
    if (changeType === 0) {
      startOffset += changeText.length;
      return;
    }
    var endOffset = startOffset;
    var diffOffset = changeText.length;
    if (changeType === -1) {
      endOffset += diffOffset;
      diffOffset = -diffOffset;
    }
    discussionList.forEach(function (discussion) {
      // selectionEnd
      if (discussion.selectionEnd > endOffset) {
        discussion.selectionEnd += diffOffset;
        discussion.discussionIndex && (changed = true);
      } else if (discussion.selectionEnd > startOffset) {
        discussion.selectionEnd = startOffset;
        discussion.discussionIndex && (changed = true);
      }
      // selectionStart
      if (discussion.selectionStart >= endOffset) {
        discussion.selectionStart += diffOffset;
        discussion.discussionIndex && (changed = true);
      } else if (discussion.selectionStart > startOffset) {
        discussion.selectionStart = startOffset;
        discussion.discussionIndex && (changed = true);
      }
    });
    if (changeType === 1) {
      startOffset += changeText.length;
    }
  });
  return changed;
};


var setHeight = function (offSetValue) {
  $editor.css('height', $window.height() - offSetValue + 'px');
  $window.on('resize', function (e) {
    $editor.css('height', $window.height() - offSetValue + 'px');
    editor.resize();
  });
};

var setEditorValueSilent = (value) => {
  _suspendOnChangeEventHandler = true;
  editor.setValue(value, -1);

  // needed to work around ACE's tendancy
  // to raise change events after setting
  // the value of the editor imperativley
  setTimeout(() => {
    _suspendOnChangeEventHandler = false;
  }, 1000);
};

var triggerSpellCheck = _.debounce(function () {
  var selection = window.getSelection();
  if (!selectionMgr.hasFocus || this.isComposing || selectionMgr.selectionStart !== selectionMgr.selectionEnd || !
    selection.modify) {
    return;
  }
  // Hack for Chrome to trigger the spell checker
  if (selectionMgr.selectionStart) {
    selection.modify("move", "backward", "character");
    selection.modify("move", "forward", "character");
  } else {
    selection.modify("move", "forward", "character");
    selection.modify("move", "backward", "character");
  }
}, 10);

function checkContentChangeCB() {
  var newTextContent = this.inputElt.textContent;
  if (this.contentElt.lastChild === this.trailingLfNode && this.trailingLfNode.textContent.slice(-1) == '\n') {
    newTextContent = newTextContent.slice(0, -1);
  }
  newTextContent = newTextContent.replace(/\r\n?/g, '\n'); // Mac/DOS to Unix

  if (this.fileChanged === false) {
    if (newTextContent == this.textContent) {
      // User has removed the empty section
      if (this.contentElt.children.length === 0) {
        this.contentElt.innerHTML = '';
        this.sectionList.forEach(function (section) {
          this.contentElt.appendChild(section.elt);
        });
        this.addTrailingLfNode();
      }
      return;
    }
    undoMgr.currentMode = undoMgr.currentMode || 'typing';
    var discussionList = _.values(this.fileDesc.discussionList);
    this.fileDesc.newDiscussion && discussionList.push(this.fileDesc.newDiscussion);
    var updateDiscussionList = this.adjustCommentOffsets(this.textContent, newTextContent, discussionList);
    this.textContent = newTextContent;
    if (updateDiscussionList === true) {
      this.fileDesc.discussionList = this.fileDesc.discussionList; // Write discussionList in localStorage
    }
    this.fileDesc.content = this.textContent;
    selectionMgr.saveSelectionState();
    //eventMgr.onContentChanged(fileDesc, textContent);
    messenger.publish.extension('onContentChanged', this.fileDesc, this.textContent);
    //updateDiscussionList && eventMgr.onCommentsChanged(fileDesc);
    updateDiscussionList && messenger.publish.extension('onCommentsChanged', this.fileDesc);
    undoMgr.saveState();
    triggerSpellCheck();
  } else {
    this.textContent = newTextContent;
    this.fileDesc.content = this.textContent;
    this.selectionMgr.setSelectionStartEnd(this.fileDesc.editorStart, this.fileDesc.editorEnd);
    selectionMgr.updateSelectionRange();
    selectionMgr.updateCursorCoordinates();
    undoMgr.saveSelectionState();
    //eventMgr.onFileOpen(fileDesc, textContent);
    messenger.publish.extension('onFileOpen', this.fileDesc, this.textContent);
    this.previewElt.scrollTop = this.fileDesc.previewScrollTop;
    scrollTop = this.fileDesc.editorScrollTop;
    this.inputElt.scrollTop = scrollTop;
    this.fileChanged = false;
  }
}
editor.addTrailingLfNode = function () {
  this.trailingLfNode = crel('span', {
    class: 'token lf'
  });
  this.trailingLfNode.textContent = '\n';
  this.contentElt.appendChild(this.trailingLfNode);
};

module.load = function (mode) {

  $editor = $('#editor');

  setHeight(appSettings.editingContainerOffset());

  $editor.css('width', appSettings.editorWidth());

  editor = ace.edit('editor');
  editor.setOptions({
    fontSize: '18px',
    theme: 'ace/theme/github',
    showPrintMargin: false,
    highlightActiveLine: false,
    showGutter: false,
    readOnly: true
  });

  editor.setOption('spellcheck', true);

  var showCursor = function () {
    editor.renderer.$cursorLayer.element.style.opacity = 1;
  };

  var hideCursor = function () {
    editor.renderer.$cursorLayer.element.style.opacity = 0;
  };

  var supressAceDepricationMessage = function () {
    editor.$blockScrolling = Infinity;
  };

  var activateEditor = function () {
    if (editor.getReadOnly()) {
      editor.setReadOnly(false);
      showCursor();
    }
  };

  hideCursor( /* until a file is opened or new one is created */ );

  supressAceDepricationMessage();

  session = editor.getSession();
  session.setMode('ace/mode/' + mode);
  session.setUseWrapMode(true);

  require('./clipboard.js').init(editor);
  require('./formatting.js').init(editor);

  var handlers = {

    menuNew: function () {
      activateEditor();
    },

    fileNew: function () {
      editor.scrollToLine(0);
    },

    contentChangedInternal: function () {
      if (!_suspendOnChangeEventHandler) {
        var value = editor.getValue();
        if (value.length > 0) {
          currentFile.contents = value;
          buildFlags.detect(currentFile.contents);

          if (!suspendPublishSourceChange) {
            messenger.publish.file('sourceChange', currentFile);
          }
        }
      }
    },

    contentChangedExternal: function (fileInfo) {
      var rowNumber;

      if (_.isObject(fileInfo)) {

        activateEditor();

        currentFile = fileInfo;

        if (fileInfo.isBlank) {
          hideCursor();
          setEditorValueSilent('');
        } else {
          suspendPublishSourceChange = true;

          showCursor();

          buildFlags.detect(fileInfo.contents);

          setEditorValueSilent(fileInfo.contents);

          if (fileInfo.cursorPosition) {
            rowNumber = fileInfo.cursorPosition.row;
            editor.selection.moveCursorToPosition(fileInfo.cursorPosition);
            editor.scrollToLine(rowNumber, true /* attempt to center in editor */ , true /* animate */ , noop);
          } else {
            editor.scrollToLine(0, false, false, noop);
          }

          suspendPublishSourceChange = false;
        }

        editor.focus();
        editor.selection.clearSelection();
      }
    },

    showResults: function () {
      $editor.css('width', appSettings.editorWidth());
      handlers.contentChangedInternal();
      editor.resize();
    },

    hideResults: function () {
      $editor.css('width', ($window.width() - appSettings.resultsButtonWidth() + 1) + 'px');
      editor.resize();
    },

    modalClosed: function () {
      editor.focus();
    }
  };

  editor.on('change', _.throttle(handlers.contentChangedInternal, 1000));
  editor.focus();

  messenger.subscribe.menu('new', handlers.menuNew);
  messenger.subscribe.file('contentChanged', handlers.contentChangedExternal);
  messenger.subscribe.file('new', handlers.fileNew);
  messenger.subscribe.layout('showResults', handlers.showResults);
  messenger.subscribe.layout('hideResults', handlers.hideResults);
  messenger.subscribe.dialog('modal.closed', handlers.modalClosed);
};

module.load('asciidoc');
editor.init = function () {
  this.inputElt = document.getElementById('wmd-input');
  //$inputElt = $(inputElt);
  this.contentElt = this.inputElt.querySelector('.editor-content');
  //$contentElt = $(contentElt);
  this.marginElt = this.inputElt.querySelector('.editor-margin');
  //$marginElt = $(marginElt);
  this.previewElt = document.querySelector('.preview-container');
  $(this.inputElt).addClass(settings.editorFontClass);
  watcher.startWatching(this.contentElt, checkContentChangeCB);
  $(this.inputElt).scroll(function () {
    scrollTop = this.inputElt.scrollTop;
    if (this.fileChanged === false) {
      this.fileDesc.editorScrollTop = scrollTop;
    }
  });
  $(this.previewElt).scroll(function () {
    if (this.fileChanged === false) {
      this.fileDesc.previewScrollTop = this.previewElt.scrollTop;
    }
  });

  // See https://gist.github.com/shimondoodkin/1081133
  if (/AppleWebKit\/([\d.]+)/.exec(navigator.userAgent)) {
    var $editableFix = $('<input style="width:1px;height:1px;border:none;margin:0;padding:0;" tabIndex="-1">').appendTo(
      'html');
    $(this.contentElt).blur(function () {
      $editableFix[0].setSelectionRange(0, 0);
      $editableFix.blur();
    });
  }

  this.inputElt.focus = focus;
  this.inputElt.adjustCursorPosition = this.adjustCursorPosition;

  Object.defineProperty(this.inputElt, 'value', {
    get: function () {
      return this.textContent;
    },
    set: this.setValue
  });

  Object.defineProperty(this.inputElt, 'selectionStart', {
    get: function () {
      return Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
    },
    set: function (value) {
      selectionMgr.setSelectionStartEnd(value);
      selectionMgr.updateSelectionRange();
      selectionMgr.updateCursorCoordinates();
    },

    enumerable: true,
    configurable: true
  });

  Object.defineProperty(this.inputElt, 'selectionEnd', {
    get: function () {
      return Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);
    },
    set: function (value) {
      selectionMgr.setSelectionStartEnd(undefined, value);
      selectionMgr.updateSelectionRange();
      selectionMgr.updateCursorCoordinates();
    },

    enumerable: true,
    configurable: true
  });

  var clearNewline = false;
  $(this.contentElt)
    .on('keydown', function (evt) {
      if (
        evt.which === 17 || // Ctrl
        evt.which === 91 || // Cmd
        evt.which === 18 || // Alt
        evt.which === 16 // Shift
      ) {
        return;
      }
      selectionMgr.saveSelectionState();
      this.adjustCursorPosition();

      var cmdOrCtrl = evt.metaKey || evt.ctrlKey;

      switch (evt.which) {
      case 9: // Tab
        if (!cmdOrCtrl) {
          action('indent', {
            inverse: evt.shiftKey
          });
          evt.preventDefault();
        }
        break;
      case 13:
        action('newline');
        evt.preventDefault();
        break;
      }
      if (evt.which !== 13) {
        clearNewline = false;
      }
    })
    .on('compositionstart', function () {
      this.isComposing++;
    })
    .on('compositionend', function () {
      setTimeout(function () {
        this.isComposing--;
      }, 0);
    })
    .on('mouseup', _.bind(selectionMgr.saveSelectionState, selectionMgr, true, false))
    .on('paste', function (evt) {
      undoMgr.currentMode = 'paste';
      evt.preventDefault();
      var data, clipboardData = (evt.originalEvent || evt).clipboardData;
      if (clipboardData) {
        data = clipboardData.getData('text/plain');
      } else {
        clipboardData = window.clipboardData;
        data = clipboardData && clipboardData.getData('Text');
      }
      if (!data) {
        return;
      }
      this.replace(selectionMgr.selectionStart, selectionMgr.selectionEnd, data);
      this.adjustCursorPosition();
    })
    .on('cut', function () {
      undoMgr.currentMode = 'cut';
      this.adjustCursorPosition();
    })
    .on('focus', function () {
      selectionMgr.hasFocus = true;
    })
    .on('blur', function () {
      selectionMgr.hasFocus = false;
    });

  var action = function (action, options) {
    var textContent = this.getValue();
    var min = Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
    var max = Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);
    var state = {
      selectionStart: min,
      selectionEnd: max,
      before: textContent.slice(0, min),
      after: textContent.slice(max),
      selection: textContent.slice(min, max)
    };

    actions[action](state, options || {});
    this.setValue(state.before + state.selection + state.after);
    selectionMgr.setSelectionStartEnd(state.selectionStart, state.selectionEnd);
    selectionMgr.updateSelectionRange();
  };

  var indentRegex = /^ {0,3}>[ ]*|^[ \t]*(?:[*+\-]|(\d+)\.)[ \t]|^\s+/;
  var actions = {
    indent: function (state, options) {
      function strSplice(str, i, remove, add) {
        remove = +remove || 0;
        add = add || '';
        return str.slice(0, i) + add + str.slice(i + remove);
      }

      var lf = state.before.lastIndexOf('\n') + 1;
      if (options.inverse) {
        if (/\s/.test(state.before.charAt(lf))) {
          state.before = strSplice(state.before, lf, 1);

          state.selectionStart--;
          state.selectionEnd--;
        }
        state.selection = state.selection.replace(/^[ \t]/gm, '');
      } else {
        var previousLine = state.before.slice(lf);
        if (state.selection || previousLine.match(indentRegex)) {
          state.before = strSplice(state.before, lf, 0, '\t');
          state.selection = state.selection.replace(/\r?\n(?=[\s\S])/g, '\n\t');
          state.selectionStart++;
          state.selectionEnd++;
        } else {
          state.before += '\t';
          state.selectionStart++;
          state.selectionEnd++;
          return;
        }
      }

      state.selectionEnd = state.selectionStart + state.selection.length;
    },

    newline: function (state) {
      var lf = state.before.lastIndexOf('\n') + 1;
      if (clearNewline) {
        state.before = state.before.substring(0, lf);
        state.selection = '';
        state.selectionStart = lf;
        state.selectionEnd = lf;
        clearNewline = false;
        return;
      }
      clearNewline = false;
      var previousLine = state.before.slice(lf);
      var indentMatch = previousLine.match(indentRegex);
      var indent = (indentMatch || [''])[0];
      if (indentMatch && indentMatch[1]) {
        var number = parseInt(indentMatch[1], 10);
        indent = indent.replace(/\d+/, number + 1);
      }
      if (indent.length) {
        clearNewline = true;
      }

      undoMgr.currentMode = 'newlines';

      state.before += '\n' + indent;
      state.selection = '';
      state.selectionStart += indent.length + 1;
      state.selectionEnd = state.selectionStart;
    }
  };

};
messenger.subscribe.extension('onPagedownConfigure', function (pagedownEditorParam) {
  this.pagedownEditor = pagedownEditorParam;
});
messenger.subscribe.extension('onFileSelected', function (selectedFileDesc) {
  this.fileChanged = true;
  this.fileDesc = selectedFileDesc;
});

function onComment() {
  if (watcher.isWatching === true) {
    undoMgr.currentMode = undoMgr.currentMode || 'comment';
    undoMgr.saveState();
  }
}
messenger.subscribe.extension('onDiscussionCreated', onComment);
messenger.subscribe.extension('onDiscussionRemoved', onComment);
messenger.subscribe.extension('onCommentsChanged', onComment);
module.exports = editor;
