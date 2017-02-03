/*jslint browser:true*/

var
  path = require('path'),
  _ = require('lodash'),
  rangy = require('rangy'),
  messenger = require(path.resolve(__dirname, '../messenger')),
  settings = require(path.resolve(__dirname, '../settings')),
  utils = require(path.resolve(__dirname, '../utils'));

function SelectionMgr() {
  var self = this;
  var lastSelectionStart = 0;
  var lastSelectionEnd = 0;
  this.selectionStart = 0;
  this.selectionEnd = 0;
  this.cursorY = 0;
  this.adjustTop = 0;
  this.adjustBottom = 0;

  this.init = function (editorInstance) {
    this.editor = editorInstance;
  };
  this.findOffsets = function (offsetList) {
    var result = [];
    if (!offsetList.length) {
      return result;
    }
    var offset = offsetList.shift();
    var walker = document.createTreeWalker(this.editor.contentElt, 4, null, false);
    var text = '';
    var walkerOffset = 0;
    while (walker.nextNode()) {
      text = walker.currentNode.nodeValue || '';
      var newWalkerOffset = walkerOffset + text.length;
      while (newWalkerOffset > offset) {
        result.push({
          container: walker.currentNode,
          offsetInContainer: offset - walkerOffset,
          offset: offset
        });
        if (!offsetList.length) {
          return result;
        }
        offset = offsetList.shift();
      }
      walkerOffset = newWalkerOffset;
    }
    do {
      result.push({
        container: walker.currentNode,
        offsetInContainer: text.length,
        offset: offset
      });
      offset = offsetList.shift();
    }
    while (offset);
    return result;
  };
  this.createRange = function (start, end) {
    start = start < 0 ? 0 : start;
    end = end < 0 ? 0 : end;
    var range = document.createRange();
    var offsetList = [],
      startIndex, endIndex;
    if (_.isNumber(start)) {
      offsetList.push(start);
      startIndex = offsetList.length - 1;
    }
    if (_.isNumber(end)) {
      offsetList.push(end);
      endIndex = offsetList.length - 1;
    }
    offsetList = this.findOffsets(offsetList);
    var startOffset = _.isObject(start) ? start : offsetList[startIndex];
    range.setStart(startOffset.container, startOffset.offsetInContainer);
    var endOffset = startOffset;
    if (end && end != start) {
      endOffset = _.isObject(end) ? end : offsetList[endIndex];
    }
    range.setEnd(endOffset.container, endOffset.offsetInContainer);
    return range;
  };
  var adjustScroll;
  var debouncedUpdateCursorCoordinates = utils.debounce(function () {
    $(this.editor.inputElt).toggleClass('has-selection', this.selectionStart !== this.selectionEnd);
    var coordinates = this.getCoordinates(this.selectionEnd, this.selectionEndContainer, this.selectionEndOffset);
    if (this.cursorY !== coordinates.y) {
      this.cursorY = coordinates.y;
      messenger.publish.extension('onCursorCoordinates', coordinates);

      //eventMgr.onCursorCoordinates(coordinates.x, coordinates.y);
    }
    if (adjustScroll) {
      var adjustTop, adjustBottom;
      adjustTop = adjustBottom = this.editor.inputElt.offsetHeight / 2 * settings.cursorFocusRatio;
      adjustTop = this.adjustTop || adjustTop;
      adjustBottom = this.adjustBottom || adjustTop;
      if (adjustTop && adjustBottom) {
        var cursorMinY = this.editor.inputElt.scrollTop + adjustTop;
        var cursorMaxY = this.editor.inputElt.scrollTop + this.editor.inputElt.offsetHeight - adjustBottom;
        if (this.cursorY < cursorMinY) {
          this.editor.inputElt.scrollTop += this.cursorY - cursorMinY;
        } else if (this.cursorY > cursorMaxY) {
          this.editor.inputElt.scrollTop += this.cursorY - cursorMaxY;
        }
      }
    }
    adjustScroll = false;
  }, this);
  this.updateCursorCoordinates = function (adjustScrollParam) {
    adjustScroll = adjustScroll || adjustScrollParam;
    debouncedUpdateCursorCoordinates();
  };
  this.updateSelectionRange = function () {
    var min = Math.min(this.selectionStart, this.selectionEnd);
    var max = Math.max(this.selectionStart, this.selectionEnd);
    var range = this.createRange(min, max);
    var selection = rangy.getSelection();
    selection.removeAllRanges();
    selection.addRange(range, this.selectionStart > this.selectionEnd);
  };
  var saveLastSelection = _.debounce(function () {
    lastSelectionStart = self.selectionStart;
    lastSelectionEnd = self.selectionEnd;
  }, 50);
  this.setSelectionStartEnd = function (start, end) {
    if (start === undefined) {
      start = this.selectionStart;
    }
    if (start < 0) {
      start = 0;
    }
    if (end === undefined) {
      end = this.selectionEnd;
    }
    if (end < 0) {
      end = 0;
    }
    this.selectionStart = start;
    this.selectionEnd = end;
    this.editor.fileDesc.editorStart = start;
    this.editor.fileDesc.editorEnd = end;
    saveLastSelection();
  };
  this.saveSelectionState = (function (saveSelectionStateCB) {
    function save() {
      if (this.editor.fileChanged === false) {
        var selectionStart = self.selectionStart;
        var selectionEnd = self.selectionEnd;
        var selection = rangy.getSelection();
        if (selection.rangeCount > 0) {
          var selectionRange = selection.getRangeAt(0);
          var node = selectionRange.startContainer;
          if ((this.editor.contentElt.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINED_BY) || this.editor
            .contentElt ===
            node) {
            var offset = selectionRange.startOffset;
            if (node.hasChildNodes() && offset > 0) {
              node = node.childNodes[offset - 1];
              offset = node.textContent.length;
            }
            var container = node;
            while (node != this.editor.contentElt) {
              while (node == node.previousSibling) {
                if (node.textContent) {
                  offset += node.textContent.length;
                }
              }
              node = container = container.parentNode;
            }

            if (selection.isBackwards()) {
              selectionStart = offset + selectionRange.toString().length;
              selectionEnd = offset;
            } else {
              selectionStart = offset;
              selectionEnd = offset + selectionRange.toString().length;
            }

            if (selectionStart === selectionEnd && selectionRange.startContainer.textContent == '\n' &&
              selectionRange.startOffset ==
              1) {
              // In IE if end of line is selected, offset is wrong
              // Also, in Firefox cursor can be after the trailingLfNode
              selectionStart = --selectionEnd;
              self.setSelectionStartEnd(selectionStart, selectionEnd);
              self.updateSelectionRange();
            }
          }
        }
        self.setSelectionStartEnd(selectionStart, selectionEnd);
      }
      saveSelectionStateCB(); //TODO
    }

    var nextTickAdjustScroll = false;
    var debouncedSave = utils.debounce(function () {
      save();
      self.updateCursorCoordinates(nextTickAdjustScroll);
      // In some cases we have to wait a little bit more to see the selection change (Cmd+A on Chrome/OSX)
      longerDebouncedSave();
    });
    var longerDebouncedSave = utils.debounce(function () {
      save();
      if (lastSelectionStart === self.selectionStart && lastSelectionEnd === self.selectionEnd) {
        nextTickAdjustScroll = false;
      }
      self.updateCursorCoordinates(nextTickAdjustScroll);
      nextTickAdjustScroll = false;
    }, 10);

    return function (debounced, adjustScroll, forceAdjustScroll) {
      if (forceAdjustScroll) {
        lastSelectionStart = undefined;
        lastSelectionEnd = undefined;
      }
      if (debounced) {
        nextTickAdjustScroll = nextTickAdjustScroll || adjustScroll;
        return debouncedSave();
      } else {
        save();
      }
    };
  })();
  this.getSelectedText = function () {
    var min = Math.min(this.selectionStart, this.selectionEnd);
    var max = Math.max(this.selectionStart, this.selectionEnd);
    return this.editor.textContent.substring(min, max);
  };
  this.getCoordinates = function (inputOffset, container, offsetInContainer) {
    if (!container) {
      var offset = this.findOffsets([inputOffset])[0];
      container = offset.container;
      offsetInContainer = offset.offsetInContainer;
    }
    var x = 0;
    var y = 0;
    if (container.textContent == '\n') {
      y = container.parentNode.offsetTop + container.parentNode.offsetHeight / 2;
    } else {
      var selectedChar = this.editor.textContent[inputOffset];
      var startOffset = {
        container: container,
        offsetInContainer: offsetInContainer,
        offset: inputOffset
      };
      var endOffset = {
        container: container,
        offsetInContainer: offsetInContainer,
        offset: inputOffset
      };
      if (inputOffset > 0 && (selectedChar === undefined || selectedChar == '\n')) {
        if (startOffset.offset === 0) {
          // Need to calculate offset-1
          startOffset = inputOffset - 1;
        } else {
          startOffset.offsetInContainer -= 1;
        }
      } else {
        if (endOffset.offset === container.textContent.length) {
          // Need to calculate offset+1
          endOffset = inputOffset + 1;
        } else {
          endOffset.offsetInContainer += 1;
        }
      }
      var selectionRange = this.createRange(startOffset, endOffset);
      var selectionRect = selectionRange.getBoundingClientRect();
      y = selectionRect.top + selectionRect.height / 2 - this.editor.inputElt.getBoundingClientRect().top + this.editor
        .inputElt.scrollTop;
    }
    return {
      x: x,
      y: y
    };
  };
  this.getClosestWordOffset = function (offset) {
    var offsetStart = 0;
    var offsetEnd = 0;
    var nextOffset = 0;
    this.editor.textContent.split(/\s/).some(function (word) {
      if (word) {
        offsetStart = nextOffset;
        offsetEnd = nextOffset + word.length;
        if (offsetEnd > offset) {
          return true;
        }
      }
      nextOffset += word.length + 1;
    });
    return {
      start: offsetStart,
      end: offsetEnd
    };
  };
}

module.exports = SelectionMgr;
