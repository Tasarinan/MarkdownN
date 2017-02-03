/*global window*/
/*jslint browser:true*/
/*jshint -W020 */
module = module.exports;
//window.$ = window.jQuery = require("jquery");
var path = require('path');
var _ = require('lodash');
var utils = require(path.resolve(__dirname, '../utils'));
var storage = require('local-storage');
var extMgr = require(path.resolve(__dirname, '../extMgr'));
var userMgr = require(path.resolve(__dirname, '../userMgr'));
var editor = require(path.resolve(__dirname, '../editor'));
var layout = require(path.resolve(__dirname, '../layout'));
var settings = require(path.resolve(__dirname, '../settings'));
var messenger = require(path.resolve(__dirname, '../messenger'));
var config = require(path.resolve(__dirname, '../config')).get();
var load = require(path.resolve(__dirname, '../load'));
var bodyEditorHTML = load.loadHtml('bodyEditor.html');
var bodyViewerHTML = load.loadHtml('bodyViewer.html');
var settingsTemplateTooltipHTML = load.loadHtml(
  'tooltipSettingsTemplate.html');
var settingsPdfOptionsTooltipHTML = load.loadHtml(
  'tooltipSettingsPdfOptions.html');

// Load settings in settings dialog
var $themeInputElt;

function loadSettings() {

  // Layout orientation
  utils.setInputRadio("radio-layout-orientation", settings.layoutOrientation);
  // Theme
  utils.setInputValue($themeInputElt, window.theme);
  $themeInputElt.change();
  // Lazy rendering
  utils.setInputChecked("#input-settings-lazy-rendering", settings.lazyRendering);
  // Editor font class
  utils.setInputRadio("radio-settings-editor-font-class", settings.editorFontClass);
  // Font size ratio
  utils.setInputValue("#input-settings-font-size", settings.fontSizeRatio);
  // Max width ratio
  utils.setInputValue("#input-settings-max-width", settings.maxWidthRatio);
  // Cursor locking ratio
  utils.setInputValue("#input-settings-cursor-focus", settings.cursorFocusRatio);
  // Default content
  utils.setInputValue("#textarea-settings-default-content", settings.defaultContent);
  // Edit mode
  utils.setInputRadio("radio-settings-edit-mode", settings.editMode);
  // Commit message
  utils.setInputValue("#input-settings-publish-commit-msg", settings.commitMsg);
  // Markdown MIME type
  utils.setInputValue("#input-settings-markdown-mime-type", settings.markdownMimeType);
  // Gdrive multi-accounts
  utils.setInputValue("#input-settings-gdrive-multiaccount", settings.gdriveMultiAccount);
  // Gdrive full access
  utils.setInputChecked("#input-settings-gdrive-full-access", settings.gdriveFullAccess);
  // Dropbox full access
  utils.setInputChecked("#input-settings-dropbox-full-access", settings.dropboxFullAccess);
  // GitHub full access
  utils.setInputChecked("#input-settings-github-full-access", settings.githubFullAccess);
  // Template
  utils.setInputValue("#textarea-settings-publish-template", settings.template);
  // PDF template
  utils.setInputValue("#textarea-settings-pdf-template", settings.pdfTemplate);
  // PDF options
  utils.setInputValue("#textarea-settings-pdf-options", settings.pdfOptions);
  // CouchDB URL
  utils.setInputValue("#input-settings-couchdb-url", settings.couchdbUrl);

  // Load extension settings
  extMgr.onLoadSettings();
}

// Save settings from settings dialog
function saveSettings(event) {
  var newSettings = {};

  // Layout orientation
  newSettings.layoutOrientation = utils.getInputRadio(
    "radio-layout-orientation");
  // Theme
  var theme = utils.getInputValue($themeInputElt);
  // Lazy Rendering
  newSettings.lazyRendering = utils.getInputChecked(
    "#input-settings-lazy-rendering");
  // Editor font class
  newSettings.editorFontClass = utils.getInputRadio(
    "radio-settings-editor-font-class");
  // Font size ratio
  newSettings.fontSizeRatio = utils.getInputFloatValue(
    "#input-settings-font-size", event, 0.1, 10);
  // Max width ratio
  newSettings.maxWidthRatio = utils.getInputFloatValue(
    "#input-settings-max-width", event, 0.1, 10);
  // Cursor locking ratio
  newSettings.cursorFocusRatio = utils.getInputFloatValue(
    "#input-settings-cursor-focus", event, 0, 1);
  // Default content
  newSettings.defaultContent = utils.getInputValue(
    "#textarea-settings-default-content");
  // Edit mode
  newSettings.editMode = utils.getInputRadio("radio-settings-edit-mode");
  // Commit message
  newSettings.commitMsg = utils.getInputTextValue(
    "#input-settings-publish-commit-msg", event);
  // Gdrive multi-accounts
  newSettings.gdriveMultiAccount = utils.getInputIntValue(
    "#input-settings-gdrive-multiaccount");
  // Markdown MIME type
  newSettings.markdownMimeType = utils.getInputValue(
    "#input-settings-markdown-mime-type");
  // Gdrive full access
  newSettings.gdriveFullAccess = utils.getInputChecked(
    "#input-settings-gdrive-full-access");
  // Drobox full access
  newSettings.dropboxFullAccess = utils.getInputChecked(
    "#input-settings-dropbox-full-access");
  // GitHub full access
  newSettings.githubFullAccess = utils.getInputChecked(
    "#input-settings-github-full-access");
  // Template
  newSettings.template = utils.getInputTextValue(
    "#textarea-settings-publish-template", event);
  // PDF template
  newSettings.pdfTemplate = utils.getInputTextValue(
    "#textarea-settings-pdf-template", event);
  // PDF options
  newSettings.pdfOptions = utils.getInputJSONValue(
    "#textarea-settings-pdf-options", event);
  // CouchDB URL
  newSettings.couchdbUrl = utils.getInputValue("#input-settings-couchdb-url",
    event);

  // Save extension settings
  newSettings.extensionSettings = {};
  extMgr.onSaveSettings(newSettings.extensionSettings, event);

  if (!event.isPropagationStopped()) {
    if (settings.dropboxFullAccess !== newSettings.dropboxFullAccess) {
      storage.removeItem('dropbox.lastChangeId');
    }
    $.extend(settings, newSettings);
    storage.settings = JSON.stringify(settings);
    storage.themeV4 = theme;
  }
}

// Create the PageDown editor
var pagedownEditor;
var fileDesc;
module.initEditor = function (fileDescParam) {
  if (fileDesc !== undefined) {
    //eventMgr.onFileClosed(fileDesc);
    messenger.publish.extension('onFileClosed', fileDesc);
  }
  fileDesc = fileDescParam;

  if (pagedownEditor !== undefined) {
    // If the editor is already created
    editor.undoMgr.init();
    return pagedownEditor.uiManager.setUndoRedoButtonStates();
  }

  // Create the converter and the editor
  var converter = new Markdown.Converter();

  var options = {
    _DoItalicsAndBold: function (text) {
      // Restore original markdown implementation
      text = text.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?=\S)\1/g,
        "<strong>$2</strong>");
      text = text.replace(/(\*|_)(?=\S)(.+?)(?=\S)\1/g,
        "<em>$2</em>");
      return text;
    }
  };
  converter.setOptions(options);

  pagedownEditor = new Markdown.Editor(converter, undefined, {
    undoManager: editor.undoMgr
  });

  // Custom insert link dialog
  pagedownEditor.hooks.set("insertLinkDialog", function (callback) {
    module.insertLinkCallback = callback;
    utils.resetModalInputs();
    $(".modal-insert-link").modal();
    return true;
  });
  // Custom insert image dialog
  pagedownEditor.hooks.set("insertImageDialog", function (callback) {
    module.insertLinkCallback = callback;
    if (module.catchModal) {
      return true;
    }
    utils.resetModalInputs();
    $(".modal-insert-image").modal();
    return true;
  });

  // eventMgr.onPagedownConfigure(pagedownEditor);
  messenger.publish.extension('onPagedownConfigure', pagedownEditor);
  //TODO
  // pagedownEditor.hooks.chain("onPreviewRefresh", eventMgr.onAsyncPreview);
  pagedownEditor.run();
  editor.undoMgr.init();

  // Hide default buttons
  $(".wmd-button-row li").addClass("btn btn-success").css("left", 0).find(
    "span").hide();

  // Add customized buttons
  var $btnGroupElt = $('.wmd-button-group1');
  $("#wmd-bold-button").append($('<i class="icon-bold">')).appendTo(
    $btnGroupElt);
  $("#wmd-italic-button").append($('<i class="icon-italic">')).appendTo(
    $btnGroupElt);
  $btnGroupElt = $('.wmd-button-group2');
  $("#wmd-link-button").append($('<i class="icon-globe">')).appendTo(
    $btnGroupElt);
  $("#wmd-quote-button").append($('<i class="icon-indent-right">')).appendTo(
    $btnGroupElt);
  $("#wmd-code-button").append($('<i class="icon-code">')).appendTo(
    $btnGroupElt);
  $("#wmd-image-button").append($('<i class="icon-picture">')).appendTo(
    $btnGroupElt);
  $btnGroupElt = $('.wmd-button-group3');
  $("#wmd-olist-button").append($('<i class="icon-list-numbered">')).appendTo(
    $btnGroupElt);
  $("#wmd-ulist-button").append($('<i class="icon-list-bullet">')).appendTo(
    $btnGroupElt);
  $("#wmd-heading-button").append($('<i class="icon-text-height">')).appendTo(
    $btnGroupElt);
  $("#wmd-hr-button").append($('<i class="icon-ellipsis">')).appendTo(
    $btnGroupElt);
  $btnGroupElt = $('.wmd-button-group5');
  $("#wmd-undo-button").append($('<i class="icon-reply">')).appendTo(
    $btnGroupElt);
  $("#wmd-redo-button").append($('<i class="icon-forward">')).appendTo(
    $btnGroupElt);
};

// Initialize multiple things and then fire eventMgr.onReady
module.onReady = function () {
  // Add RTL class
  document.body.className += ' ' + settings.editMode;

  if (window.viewerMode === true) {
    document.body.innerHTML = bodyViewerHTML;
  } else {
    document.body.innerHTML = bodyEditorHTML;
  }

  // Initialize utils library
  utils.init();
  userMgr.init();
  // listen to online/offline events
  $(window).on('offline', userMgr.setOffline);
  $(window).on('online', userMgr.setOnline);
  if (navigator.onLine === false) {
    userMgr.setOffline();
  }

  // Detect user activity
  $(document).mousemove(userMgr.setUserActive).keypress(userMgr.setUserActive);

  layout.init();
  editor.init();

  //eventMgr.onReady();
  extMgr.onReady();
};


// Other initialization that are not prioritary
//eventMgr.addListener("onReady", function () {
messenger.subscribe.extension('onReady', function () {
  $(document.body).on('shown.bs.modal', '.modal', function () {
    var $elt = $(this);
    setTimeout(function () {
      // When modal opens focus on the first button
      $elt.find('.btn:first').focus();
      // Or on the first link if any
      $elt.find('button:first').focus();
      // Or on the first input if any
      $elt.find("input:enabled:visible:first").focus();
    }, 50);
  }).on('hidden.bs.modal', '.modal', function () {
    // Focus on the editor when modal is gone
    editor.focus();
    // Revert to current theme when settings modal is closed
    applyTheme(window.theme);
  }).on('keypress', '.modal', function (e) {
    // Handle enter key in modals
    if (e.which == 13 && !$(e.target).is("textarea")) {
      $(this).find(".modal-footer a:last").click();
    }
  });

  // Click events on "insert link" and "insert image" dialog buttons
  $(".action-insert-link").click(function (e) {
    var value = utils.getInputTextValue($("#input-insert-link"), e);
    if (value !== undefined) {
      module.insertLinkCallback(value);
      module.insertLinkCallback = undefined;
    }
  });
  $(".action-insert-image").click(function (e) {
    var value = utils.getInputTextValue($("#input-insert-image"), e);
    if (value !== undefined) {
      module.insertLinkCallback(value);
      module.insertLinkCallback = undefined;
    }
  });

  // Hide events on "insert link" and "insert image" dialogs
  $(".modal-insert-link, .modal-insert-image").on('hidden.bs.modal',
    function () {
      if (module.insertLinkCallback !== undefined) {
        module.insertLinkCallback(null);
        module.insertLinkCallback = undefined;
      }
    });

  // Settings loading/saving
  $(".action-load-settings").click(function () {
    loadSettings();
  });
  $(".action-apply-settings").click(function (e) {
    saveSettings(e);
    if (!e.isPropagationStopped()) {
      window.location.reload();
    }
  });
  $('.action-add-google-drive-account').click(function () {
    if (settings.gdriveMultiAccount === 3) {
      return;
    }
    settings.gdriveMultiAccount++;
    storage.settings = JSON.stringify(settings);
    window.location.reload();
  });

  // Hot theme switcher in the settings
  var currentTheme = window.theme;
  //TODO
  function applyTheme(theme) {
    theme = theme || 'default';
    if (currentTheme != theme) {
      load.loadLess(path.join(path.resolve(__dirname, './'), 'themes', theme + 'less'));
      currentTheme = theme;
    }
  }

  $themeInputElt = $("#input-settings-theme");
  $themeInputElt.on("change", function () {
    applyTheme(this.value);
  });

  // Import docs and settings
  $(".action-import-docs-settings").click(function () {
    $("#input-file-import-docs-settings").click();
  });
  var newstorage;
  $("#input-file-import-docs-settings").change(function (evt) {
    var files = (evt.dataTransfer || evt.target).files;
    $(".modal-settings").modal("hide");
    _.each(files, function (file) {
      var reader = new FileReader();
      reader.onload = (function (importedFile) {
        return function (e) {
          try {
            newstorage = JSON.parse(e.target.result);
            // Compare storage version
            var newVersion = parseInt(newstorage.version.match(/^v(\d+)$/)[
              1], 10);
            var currentVersion = parseInt(storage.version.match(
              /^v(\d+)$/)[1], 10);
            if (newVersion > currentVersion) {
              // We manage storage upgrade, not downgrade
              //eventMgr.onError(
              //"Incompatible version. Please upgrade StackEdit.");
              messenger.publish.extension('onError',
                "Incompatible version. Please upgrade StackEdit.");
            } else {
              $('.modal-import-docs-settings').modal('show');
            }
          } catch (exc) {
            //eventMgr.onError("Wrong format: " + importedFile.name);
            messenger.publish.extension('onError',
              "Wrong format: " + importedFile.name);
          }
          $("#input-file-import-docs-settings").val('');
        };
      })(file);
      reader.readAsText(file);
    });
  });
  $(".action-import-docs-settings-confirm").click(function () {
    storage.clear();
    var allowedKeys =
      /^file\.|^folder\.|^publish\.|^settings$|^sync\.|^google\.|^author\.|^themeV4$|^version$/;
    _.each(newstorage, function (value, key) {
      if (allowedKeys.test(key)) {
        storage[key] = value;
      }
    });
    window.location.reload();
  });
  // Export settings
  $(".action-export-docs-settings").click(function () {
    utils.saveAs(JSON.stringify(storage), "StackEdit local storage.json");
  });

  $(".action-default-settings").click(function () {
    storage.removeItem("settings");
    storage.removeItem("theme");
    if (!settings.dropboxFullAccess) {
      storage.removeItem('dropbox.lastChangeId');
    }
    window.location.reload();
  });

  $(".action-app-reset").click(function () {
    storage.clear();
    window.location.reload();
  });

  // Reset inputs
  $(".action-reset-input").click(function () {
    utils.resetModalInputs();
  });

  utils.createTooltip(".tooltip-lazy-rendering",
    'Disable preview rendering while typing in order to offload CPU. Refresh preview after 500 ms of inactivity.'
  );
  utils.createTooltip(".tooltip-default-content", [
    'Thanks for supporting StackEdit by adding a backlink in your documents!<br/><br/>',
    '<b class="text-danger">NOTE: Backlinks in Stack Exchange Q/A are not welcome.</b>'
  ].join(''));
  utils.createTooltip(".tooltip-template", settingsTemplateTooltipHTML);
  utils.createTooltip(".tooltip-pdf-options", settingsPdfOptionsTooltipHTML);

  // Avoid dropdown panels to close on click
  $("div.dropdown-menu").click(function (e) {
    e.stopPropagation();
  });

  // Non unique window dialog
  $('.modal-non-unique').modal({
    backdrop: "static",
    keyboard: false,
    show: false
  });

  // Load images
  _.each(document.querySelectorAll('img'), function (imgElt) {
    var $imgElt = $(imgElt);
    var src = $imgElt.data('appSrc');
    if (src) {
      $imgElt.attr('src', window.baseDir + '/img/' + src);
    }
  });

  if (window.viewerMode === false) {
    // Load theme list
    var themeOptions = _.reduce(config.THEME_LIST, function (themeOptions,
      name, value) {
      return themeOptions + '<option value="' + value + '">' + name +
        '</option>';
    }, '');
    document.getElementById('input-settings-theme').innerHTML = themeOptions;
  }

});
