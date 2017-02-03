/*global window*/
/*jslint browser:true*/
var path = require('path');
var utils = require(path.resolve(__dirname, '../utils'));
var messenger = require(path.resolve(__dirname, '../messenger'));
var config = require(path.resolve(__dirname, '../config')).get();
var storage = require('local-storage');
var userMgr = {};

// Used to detect user activity
var isUserReal = false;
var userActive = false;
var windowUnique = true;
var userLastActivity = 0;
// Used for periodic tasks
var intervalId;

userMgr.setUserActive = function () {
  isUserReal = true;
  userActive = true;
  var currentTime = utils.currentTime;
  if (currentTime > userLastActivity + 1000) {
    userLastActivity = currentTime;
    //eventMgr.onUserActive();
    messenger.publish.extension('onUserActive');
  }
};

userMgr.isUserActive = function () {
  if (utils.currentTime - userLastActivity > config.USER_IDLE_THRESHOLD) {
    userActive = false;
  }
  return userActive && windowUnique;
};

// Used to only have 1 window of the application in the same browser
var windowId;

function checkWindowUnique() {
  if (isUserReal === false || windowUnique === false) {
    return;
  }
  if (windowId === undefined) {
    windowId = utils.id();
    storage.frontWindowId = windowId;
  }
  var frontWindowId = storage.frontWindowId;
  if (frontWindowId != windowId) {
    windowUnique = false;
    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
    $(".modal").modal("hide");
    $('.modal-non-unique').modal("show");
    // Attempt to close the window
    window.close();
  }
}

// Offline management
var isOffline = false;
var offlineTime = utils.currentTime;
userMgr.setOffline = function () {
  offlineTime = utils.currentTime;
  if (isOffline === false) {
    isOffline = true;
    //eventMgr.onOfflineChanged(true);
    messenger.publish.extension('onOfflineChanged', true);
  }
};

userMgr.setOnline = function () {
  if (isOffline === true) {
    isOffline = false;
    //eventMgr.onOfflineChanged(false);
    messenger.publish.extension('onOfflineChanged', false);
  }
};

userMgr.checkOnline = function () {
  // Try to reconnect if we are offline but we have some network
  if (isOffline === true && navigator.onLine === true && offlineTime + config.CHECK_ONLINE_PERIOD < utils.currentTime) {
    offlineTime = utils.currentTime;
    // Try to download anything to test the connection
    $.ajax({
      url: "//www.google.com/jsapi",
      timeout: config.AJAX_TIMEOUT,
      dataType: "script"
    }).done(function () {
      userMgr.setOnline();
    });
  }
};
userMgr.init = function () {
  // Do periodic tasks
  intervalId = window.setInterval(function () {
    utils.updateCurrentTime();
    checkWindowUnique();
    if (userMgr.isUserActive() === true || window.viewerMode === true) {
      //eventMgr.onPeriodicRun();
      //TODO
    //  messenger.publish.extension('onPeriodicRun');
      userMgr.checkOnline();
    }
  }, 1000);
};

module.exports = userMgr;
