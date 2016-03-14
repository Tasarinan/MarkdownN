/**
 * @module
 * This is the master startup module for writer. It controls the core app and
 * looks after the various windows. Right now it doesn't do all that much, but
 * in the future it will deal with loading plugins and any initial start-up
 * stuff that needs to be done.
 */

'use strict';
const electron = require('electron');
const app = electron.app; // Module to control application life.
//const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
//const globalShortcut = electron.globalShortcut;
var DockedWindow = require('./app-window');

// Report crashes to our server.
electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var dockedWindows = [];


/**
 * Adds a window to the list of windows being tracked. Also adds a close
 * listener to remove it when it closes.
 */
function addWindow(window) {
  dockedWindows.push(window);
  window.on('closed', function () {
    // Remove this window from the windows array
    for (var i = 0; i < dockedWindows.length; i++) {
      if (dockedWindows[i] === window) {
        dockedWindows.splice(i, 1);
        window = null;
      }
    }
  });
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

function openNewWindow(files) {
  // Create the browser window.
  var newWindow = new DockedWindow();
  addWindow(newWindow);
  newWindow.once('ready', function () {
    if (files && files.length > 0) {
      newWindow.open(files);
    }
  });
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
  //var Menu = require('menu');
  // Build our menu
  //var menu = require('./dockedMenu').createMenu();
  //Menu.setApplicationMenu(menu);


  var files = [];
  // FIXME: Is this even remotely correct?
  for (var i = 2; i < process.argv.length; i++) {
    files.push(process.argv[i]);
  }
  openNewWindow(files);

});

app.on('will-quit', function () {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

exports.openNewWindow = openNewWindow;
