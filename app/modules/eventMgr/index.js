define([
  "jquery",
  "underscore",
  "crel",
  "mousetrap",
  "utils",
  "logger",
  "classes/Extension",
  "settings",
  "text!html/settingsExtensionsAccordion.html",
  "extensions/yamlFrontMatterParser",
  "extensions/markdownSectionParser",
  "extensions/partialRendering",
  "extensions/buttonMarkdownSyntax",
  "extensions/googleAnalytics",
  "extensions/twitter",
  "extensions/dialogAbout",
  "extensions/dialogManagePublication",
  "extensions/dialogManageSynchronization",
  "extensions/dialogManageSharing",
  "extensions/dialogOpenHarddrive",
  "extensions/documentTitle",
  "extensions/documentSelector",
  "extensions/documentPanel",
  "extensions/documentManager",
  "extensions/workingIndicator",
  "extensions/notifications",
  "extensions/umlDiagrams",
  "extensions/markdownExtra",
  "extensions/toc",
  "extensions/mathJax",
  "extensions/emailConverter",
  "extensions/scrollSync",
  "extensions/buttonSync",
  "extensions/buttonPublish",
  "extensions/buttonStat",
  "extensions/buttonHtmlCode",
  "extensions/buttonViewer",
  "extensions/welcomeTour",
  "extensions/shortcuts",
  "extensions/userCustom",
  "extensions/comments",
  "extensions/findReplace",
  "extensions/htmlSanitizer",
  "bootstrap",
  "jquery-waitforimages"
], function ($, _, crel, mousetrap, utils, logger, Extension, settings, settingsExtensionsAccordionHTML) {

  var eventMgr = {};



  // Used by external modules (not extensions) to listen to events
  eventMgr.addListener = function (eventName, listener) {
    try {
      eventListenerListMap[eventName].push(listener);
    } catch (e) {
      console.error('No event listener called ' + eventName);
    }
  };

  // Call every onInit listeners (enabled extensions only)
  createEventHook("onInit")();
  addEventHook("onMessage");
  addEventHook("onError");
  addEventHook("onOfflineChanged");
  addEventHook("onUserActive");
  addEventHook("onAsyncRunning");
  addEventHook("onPeriodicRun");

  // To access modules that are loaded after extensions
  addEventHook("onEditorCreated");
  addEventHook("onFileMgrCreated");
  addEventHook("onSynchronizerCreated");
  addEventHook("onPublisherCreated");
  addEventHook("onSharingCreated");
  addEventHook("onEventMgrCreated");

  // Operations on files
  addEventHook("onFileCreated");
  addEventHook("onFileDeleted");
  addEventHook("onFileSelected");
  addEventHook("onFileOpen");
  addEventHook("onFileClosed");
  addEventHook("onContentChanged");
  addEventHook("onTitleChanged");

  // Operations on folders
  addEventHook("onFoldersChanged");

  // Sync events
  addEventHook("onSyncRunning");
  addEventHook("onSyncSuccess");
  addEventHook("onSyncImportSuccess");
  addEventHook("onSyncExportSuccess");
  addEventHook("onSyncRemoved");

  // Publish events
  addEventHook("onPublishRunning");
  addEventHook("onPublishSuccess");
  addEventHook("onNewPublishSuccess");
  addEventHook("onPublishRemoved");

  // Operations on Layout
  addEventHook("onLayoutCreated");
  addEventHook("onLayoutResize");
  addEventHook("onExtensionButtonResize");

  // Operations on editor
  addEventHook("onPagedownConfigure");
  addEventHook("onSectionsCreated");
  addEventHook("onCursorCoordinates");
  addEventHook("onEditorPopover");

  // Operations on comments
  addEventHook("onDiscussionCreated");
  addEventHook("onDiscussionRemoved");
  addEventHook("onCommentsChanged");

  // Refresh twitter buttons
  addEventHook("onTweet");


  var onPreviewFinished = createEventHook("onPreviewFinished");
  var onAsyncPreviewListenerList = getExtensionListenerList("onAsyncPreview");
  var previewContentsElt;
  var $previewContentsElt;
  eventMgr.onAsyncPreview = function () {
    logger.log("onAsyncPreview");

    function recursiveCall(callbackList) {
      var callback = callbackList.length ? callbackList.shift() : function () {
        setTimeout(function () {
          var html = "";
          _.each(previewContentsElt.children, function (elt) {
            if (!elt.exportableHtml) {
              var clonedElt = elt.cloneNode(true);
              _.each(clonedElt.querySelectorAll('.MathJax_SVG, .MathJax_SVG_Display, .MathJax_Preview'),
                function (elt) {
                  elt.parentNode.removeChild(elt);
                });
              elt.exportableHtml = clonedElt.innerHTML;
            }
            html += elt.exportableHtml;
          });
          var htmlWithComments = utils.trim(html);
          var htmlWithoutComments = htmlWithComments.replace(
            / <span class="comment label label-danger">.*?<\/span> /g, '');
          onPreviewFinished(htmlWithComments, htmlWithoutComments);
        }, 10);
      };
      callback(function () {
        recursiveCall(callbackList);
      });
    }

    recursiveCall(onAsyncPreviewListenerList.concat([
      function (callback) {
        // We assume some images are loading asynchronously after the preview
        $previewContentsElt.waitForImages(callback);
      }
    ]));
  };

  var onReady = createEventHook("onReady");
  eventMgr.onReady = function () {
    previewContentsElt = document.getElementById('preview-contents');
    $previewContentsElt = $(previewContentsElt);

    // Create a button from an extension listener
    var createBtn = function (listener) {
      var buttonGrpElt = crel('div', {
        class: 'btn-group'
      });
      var btnElt = listener();
      if (_.isString(btnElt)) {
        buttonGrpElt.innerHTML = btnElt;
      } else if (_.isElement(btnElt)) {
        buttonGrpElt.appendChild(btnElt);
      }
      return buttonGrpElt;
    };

    if (window.viewerMode === false) {
      // Create accordion in settings dialog
      var accordionHtml = _.chain(extensionList).sortBy(function (extension) {
        return extension.extensionName.toLowerCase();
      }).reduce(function (html, extension) {
        return html + (extension.settingsBlock ? _.template(settingsExtensionsAccordionHTML, {
          extensionId: extension.extensionId,
          extensionName: extension.extensionName,
          isOptional: extension.isOptional,
          settingsBlock: extension.settingsBlock
        }) : "");
      }, "").value();
      document.querySelector('.accordion-extensions').innerHTML = accordionHtml;

      // Create extension buttons
      logger.log("onCreateButton");
      var onCreateButtonListenerList = getExtensionListenerList("onCreateButton");
      var extensionButtonsFragment = document.createDocumentFragment();
      _.each(onCreateButtonListenerList, function (listener) {
        extensionButtonsFragment.appendChild(createBtn(listener));
      });
      document.querySelector('.extension-buttons').appendChild(extensionButtonsFragment);
    }

    // Create extension preview buttons
    logger.log("onCreatePreviewButton");
    var onCreatePreviewButtonListenerList = getExtensionListenerList("onCreatePreviewButton");
    var extensionPreviewButtonsFragment = document.createDocumentFragment();
    _.each(onCreatePreviewButtonListenerList, function (listener) {
      extensionPreviewButtonsFragment.appendChild(createBtn(listener));
    });
    var previewButtonsElt = document.querySelector('.extension-preview-buttons');
    previewButtonsElt.appendChild(extensionPreviewButtonsFragment);

    // Shall close every popover
    mousetrap.bind('escape', function () {
      eventMgr.onEditorPopover();
    });

    // Call onReady listeners
    onReady();
  };

  // For extensions that need to call other extensions
  eventMgr.onEventMgrCreated(eventMgr);
  return eventMgr;
});
