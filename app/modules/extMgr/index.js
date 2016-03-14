/*global window*/
/*jshint -W020 */
/*jslint browser:true*/
window.$ = window.jQuery = require("jquery");
var _ = require('underscore');
var crel = require('crel');
var mousetrap = require('mousetrap');
var path = require('path');
var load = require(path.resolve(__dirname, '../load'));
var messenger = require(path.resolve(__dirname, '../messenger'));
var Extension = require(path.resolve(__dirname, '../extension'));

var settings = require(path.resolve(__dirname, '../settings'));
var utils = require(path.resolve(__dirname, '../utils'));

var extMgr = {};

var settingsExtensionsAccordionHTML = load.loadHtml("settingsExtensionsAccordion.html");

var extensionList = require('require-all')({
  dirname: path.resolve(__dirname, '../../extensions'),
  excludeDirs: /^\.(git|svn)$/,
  recursive: false,
  resolve: function (argument) {
    return argument instanceof Extension && argument;
  }
});



// Configure extensions
var extensionSettings = settings.extensionSettings || {};

_.each(extensionList, function (extension) {
  // Set the extension.config attribute from settings or defaults
  // configuration
  extension.config = _.extend({}, extension.defaultConfig,
    extensionSettings[extension.extensionId]);
  if (window.viewerMode === true && extension.disableInViewer === true) {
    // Skip enabling the extension if we are in the viewer and extension
    // doesn't support it
    extension.enabled = false;
  } else {
    // Enable the extension if it's not optional or it has not been
    // disabled by the user
    extension.enabled = !extension.isOptional || extension.config.enabled ===
      undefined || extension.config.enabled === true;
  }
});

// Returns a function that calls every listeners with the specified name
// from all enabled extensions
var eventListenerListMap = {};

// Returns all listeners with the specified name that are implemented in the
// enabled extensions
function getExtensionListenerList(eventName) {
  return _.chain(extensionList).map(function (extension) {
    return extension.enabled && extension[eventName];
  }).compact().value();
}

function handleExtensionMsg(eventName) {
  eventListenerListMap[eventName] = getExtensionListenerList(eventName);
  return function () {
    //logger.log(eventName, arguments);
    var eventArguments = arguments;
    _.each(eventListenerListMap[eventName], function (listener) {
      // Use try/catch in case userCustom listener contains error
      try {
        listener.apply(null, eventArguments);
      } catch (e) {
        console.error(_.isObject(e) ? e.stack : e);
      }
    });
  };
}

// Load/Save extension config from/to settings
extMgr.onLoadSettings = function () {
  //logger.log("onLoadSettings");
  _.each(extensionList, function (extension) {
    var isChecked = !extension.isOptional || extension.config.enabled === undefined || extension.config.enabled ===
      true;
    utils.setInputChecked("#input-enable-extension-" + extension.extensionId, isChecked);
    // Special case for Markdown Extra and MathJax
    if (extension.extensionId == 'markdownExtra') {
      utils.setInputChecked("#input-settings-markdown-extra", isChecked);
    } else if (extension.extensionId == 'mathJax') {
      utils.setInputChecked("#input-settings-mathjax", isChecked);
    }
    var onLoadSettingsListener = extension.onLoadSettings;
    onLoadSettingsListener && onLoadSettingsListener();
  });
};
extMgr.onSaveSettings = function (newExtensionSettings, event) {
  // logger.log("onSaveSettings");
  _.each(extensionList, function (extension) {
    var newExtensionConfig = _.extend({}, extension.defaultConfig);
    newExtensionConfig.enabled = utils.getInputChecked("#input-enable-extension-" + extension.extensionId);
    var isChecked;
    // Special case for Markdown Extra and MathJax
    if (extension.extensionId == 'markdownExtra') {
      isChecked = utils.getInputChecked("#input-settings-markdown-extra");
      if (isChecked != extension.enabled) {
        newExtensionConfig.enabled = isChecked;
      }
    } else if (extension.extensionId == 'mathJax') {
      isChecked = utils.getInputChecked("#input-settings-mathjax");
      if (isChecked != extension.enabled) {
        newExtensionConfig.enabled = isChecked;
      }
    }
    var onSaveSettingsListener = extension.onSaveSettings;
    onSaveSettingsListener && onSaveSettingsListener(newExtensionConfig, event);
    newExtensionSettings[extension.extensionId] = newExtensionConfig;
  });
};

var previewContentsElt;
var $previewContentsElt;

extMgr.onReady = function () {
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
    //logger.log("onCreateButton");
    var onCreateButtonListenerList = getExtensionListenerList("onCreateButton");
    var extensionButtonsFragment = document.createDocumentFragment();
    _.each(onCreateButtonListenerList, function (listener) {
      extensionButtonsFragment.appendChild(createBtn(listener));
    });
    document.querySelector('.extension-buttons').appendChild(extensionButtonsFragment);
  }

  // Create extension preview buttons
  // logger.log("onCreatePreviewButton");
  var onCreatePreviewButtonListenerList = getExtensionListenerList("onCreatePreviewButton");
  var extensionPreviewButtonsFragment = document.createDocumentFragment();
  _.each(onCreatePreviewButtonListenerList, function (listener) {
    extensionPreviewButtonsFragment.appendChild(createBtn(listener));
  });
  var previewButtonsElt = document.querySelector('.extension-preview-buttons');
  previewButtonsElt.appendChild(extensionPreviewButtonsFragment);

  // Shall close every popover
  mousetrap.bind('escape', function () {
    //eventMgr.onEditorPopover();
    messenger.publish.extension('onEditorPopover');
  });

  // Call onReady listeners
  // onReady();
  messenger.publish.extension('onReady');
};

messenger.subscribe.extension('onMessage', handleExtensionMsg('onMessage'));
messenger.subscribe.extension('onError', handleExtensionMsg('onError'));
messenger.subscribe.extension('onOfflineChanged', handleExtensionMsg('onOfflineChanged'));
messenger.subscribe.extension('onUserActive', handleExtensionMsg('onUserActive'));
messenger.subscribe.extension('onAsyncRunning', handleExtensionMsg('onAsyncRunning'));
messenger.subscribe.extension('onPeriodicRun', handleExtensionMsg('onPeriodicRun'));
messenger.subscribe.extension('onEditorCreated', handleExtensionMsg('onEditorCreated'));

messenger.subscribe.extension('onFileMgrCreated', handleExtensionMsg('onFileMgrCreated'));

module.exports = extMgr;
