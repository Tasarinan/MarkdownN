/*jslint browser:true*/
module = module.exports;
var
  path = require('path'),
  _ = require('lodash'),
  crel = require('crel'),
  messenger = require(path.resolve(__dirname, '../messenger')),
  settings = require(path.resolve(__dirname, '../settings'));
var editor = null;
var sectionsToRemove = [];
var modifiedSections = [];
var insertBeforeSection;

module.init = function (editorInstance) {
  editor = editorInstance;
};

function updateSectionList(newSectionList) {

  modifiedSections = [];
  sectionsToRemove = [];
  insertBeforeSection = undefined;

  // Render everything if file changed
  if (editor.fileChanged === true) {
    sectionsToRemove = editor.sectionList;
    editor.sectionList = newSectionList;
    modifiedSections = newSectionList;
    return;
  }

  // Find modified section starting from top
  var leftIndex = editor.sectionList.length;
  _.some(editor.sectionList, function (section, index) {
    var newSection = newSectionList[index];
    if (index >= newSectionList.length ||
      // Check modified
      section.textWithFrontMatter != newSection.textWithFrontMatter ||
      // Check that section has not been detached or moved
      section.elt.parentNode !== editor.contentElt ||
      // Check also the content since nodes can be injected in sections via copy/paste
      section.elt.textContent != newSection.textWithFrontMatter) {
      leftIndex = index;
      return true;
    }
  });

  // Find modified section starting from bottom
  var rightIndex = -editor.sectionList.length;
  _.some(editor.sectionList.slice().reverse(), function (section, index) {
    var newSection = newSectionList[newSectionList.length - index - 1];
    if (index >= newSectionList.length ||
      // Check modified
      section.textWithFrontMatter != newSection.textWithFrontMatter ||
      // Check that section has not been detached or moved
      section.elt.parentNode !== editor.contentElt ||
      // Check also the content since nodes can be injected in sections via copy/paste
      section.elt.textContent != newSection.textWithFrontMatter) {
      rightIndex = -index;
      return true;
    }
  });

  if (leftIndex - rightIndex > editor.sectionList.length) {
    // Prevent overlap
    rightIndex = leftIndex - editor.sectionList.length;
  }

  // Create an array composed of left unmodified, modified, right
  // unmodified sections
  var leftSections = editor.sectionList.slice(0, leftIndex);
  modifiedSections = newSectionList.slice(leftIndex, newSectionList.length + rightIndex);
  var rightSections = editor.sectionList.slice(editor.sectionList.length + rightIndex, editor.sectionList.length);
  insertBeforeSection = _.first(rightSections);
  sectionsToRemove = editor.sectionList.slice(leftIndex, editor.sectionList.length + rightIndex);
  editor.sectionList = leftSections.concat(modifiedSections).concat(rightSections);
}
var escape = (function () {
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    "\u00a0": ' '
  };
  return function (str) {
    return str.replace(/[&<\u00a0]/g, function (s) {
      return entityMap[s];
    });
  };
})();

function highlight(section) {
  var text = escape(section.text);
  if (!window.viewerMode) {
    text = Prism.highlight(text, Prism.languages.md);
  }
  var frontMatter = section.textWithFrontMatter.substring(0, section.textWithFrontMatter.length - section.text.length);
  if (frontMatter.length) {
    // Front matter highlighting
    frontMatter = escape(frontMatter);
    frontMatter = frontMatter.replace(/\n/g, '<span class="token lf">\n</span>');
    text = '<span class="token md">' + frontMatter + '</span>' + text;
  }
  var sectionElt = crel('span', {
    id: 'wmd-input-section-' + section.id,
    class: 'wmd-input-section'
  });
  sectionElt.generated = true;
  sectionElt.innerHTML = text;
  section.elt = sectionElt;
}

function highlightSections() {
  var newSectionEltList = document.createDocumentFragment();
  modifiedSections.forEach(function (section) {
    highlight(section);
    newSectionEltList.appendChild(section.elt);
  });
  editor.watcher.noWatch(function () {
    if (editor.fileChanged === true) {
      editor.contentElt.innerHTML = '';
      editor.contentElt.appendChild(newSectionEltList);
    } else {
      // Remove outdated sections
      sectionsToRemove.forEach(function (section) {
        // section may be already removed
        section.elt.parentNode === editor.contentElt && editor.contentElt.removeChild(section.elt);
        // To detect sections that come back with built-in undo
        section.elt.generated = false;
      });

      if (insertBeforeSection !== undefined) {
        editor.contentElt.insertBefore(newSectionEltList, insertBeforeSection.elt);
      } else {
        editor.contentElt.appendChild(newSectionEltList);
      }

      // Remove unauthorized nodes (text nodes outside of sections or duplicated sections via copy/paste)
      var childNode = editor.contentElt.firstChild;
      while (childNode) {
        var nextNode = childNode.nextSibling;
        if (!childNode.generated) {
          editor.contentElt.removeChild(childNode);
        }
        childNode = nextNode;
      }
    }
    editor.addTrailingLfNode();
    editor.selectionMgr.updateSelectionRange();
    editor.selectionMgr.updateCursorCoordinates();
  });
}



var refreshPreviewLater = (function () {
  var elapsedTime = 0;
  var timeoutId;
  var refreshPreview = function () {
    var startTime = Date.now();
    editor.pagedownEditor.refreshPreview();
    elapsedTime = Date.now() - startTime;
  };
  if (settings.lazyRendering === true) {
    return _.debounce(refreshPreview, 500);
  }
  return function () {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(refreshPreview, elapsedTime < 2000 ? elapsedTime : 2000);
  };
})();
messenger.subscribe.extension('onSectionsCreated', function (newSectionList) {
  if (!editor.isComposing) {
    updateSectionList(newSectionList);
    highlightSections();
  }
  if (editor.fileChanged === true) {
    // Refresh preview synchronously
    editor.pagedownEditor.refreshPreview();
  } else {
    refreshPreviewLater();
  }
});
