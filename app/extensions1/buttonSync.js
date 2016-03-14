window.$ = window.jQuery = require("jquery");
var path = require('path');
var Extension = require(path.resolve(__dirname, '../modules/extension'));
var utils = require(path.resolve(__dirname, '../modules/utils'));
var load = require(path.resolve(__dirname, '../modules/load'));


var _ = require('underscore');
var crel = require('crel');
var mousetrap = require('mousetrap');
var buttonSync = new Extension("buttonSync", 'Button "Synchronize"',
  false, true);
var buttonSyncSettingsBlockHTML = load.loadHtml(
  'buttonSyncSettingsBlock.html');
buttonSync.settingsBlock = buttonSyncSettingsBlockHTML;
buttonSync.defaultConfig = {
  syncPeriod: 180000,
  syncShortcut: 'mod+s'
};

buttonSync.onLoadSettings = function () {
  utils.setInputValue("#input-sync-period", buttonSync.config.syncPeriod);
  utils.setInputValue("#input-sync-shortcut", buttonSync.config.syncShortcut);
};

buttonSync.onSaveSettings = function (newConfig, event) {
  newConfig.syncPeriod = utils.getInputIntValue("#input-sync-period",
    event, 0);
  newConfig.syncShortcut = utils.getInputTextValue(
    "#input-sync-shortcut", event);
};

var synchronizer;
buttonSync.onSynchronizerCreated = function (synchronizerParameter) {
  synchronizer = synchronizerParameter;
};

var $button;
var syncRunning = false;
var isOffline = false;
// Enable/disable the button
var updateButtonState = function () {
  if ($button === undefined) {
    return;
  }
  if (syncRunning === true || synchronizer.hasSync() === false ||
    isOffline) {
    $button.addClass("disabled");
  } else {
    $button.removeClass("disabled");
  }
};

// Run sync periodically
var lastSync = 0;
buttonSync.onPeriodicRun = function () {
  if (!buttonSync.config.syncPeriod || lastSync + buttonSync.config.syncPeriod >
    utils.currentTime) {
    return;
  }
  synchronizer.sync() && (lastSync = utils.currentTime);
};

buttonSync.onCreateButton = function () {
  var button = crel('a', {
    class: 'btn btn-success button-synchronize',
    title: 'Force synchronization Ctrl/Cmd+S'
  }, crel('i', {
    class: 'icon-refresh'
  }));
  $button = $(button);
  $button.click(function () {
    if (!$button.hasClass("disabled")) {
      synchronizer.sync() && (lastSync = utils.currentTime);
    }
  });
  return button;
};

buttonSync.onReady = updateButtonState;
buttonSync.onFileCreated = updateButtonState;
buttonSync.onFileDeleted = updateButtonState;
buttonSync.onSyncImportSuccess = updateButtonState;
buttonSync.onSyncExportSuccess = updateButtonState;
buttonSync.onSyncRemoved = updateButtonState;

buttonSync.onSyncRunning = function (isRunning) {
  syncRunning = isRunning;
  updateButtonState();
};

buttonSync.onOfflineChanged = function (isOfflineParameter) {
  isOffline = isOfflineParameter;
  updateButtonState();
};

buttonSync.onReady = function () {
  mousetrap.bind(buttonSync.config.syncShortcut, function (e) {
    synchronizer.sync() && (lastSync = utils.currentTime);
    e.preventDefault();
  });
  $(".action-force-synchronization").click(function () {
    synchronizer.sync() && (lastSync = utils.currentTime);
  });
};

module.exports = buttonSync;
