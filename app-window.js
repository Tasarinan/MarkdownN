/**
 * @module dockwindow
 * Basic docked window. Can contain multiple panes (well, WILL be able to) that
 * display the window.
 */
'use strict';

const electron = require('electron');
const app = electron.app; // Module to control application life.
const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
const ipcMain = electron.ipcMain;
const dialog = require('electron').dialog;
const globalShortcut = electron.globalShortcut;

var debuglog = require('util').debuglog('app-window');

/**
 * Internal ID for windows. Just keeps on counting up.
 */
var id = 0;

/**
 * Map of IDs to windows.
 */
var dockedWindows = {};

ipcMain.on('files-dropped', function (event, winId, files) {
  var win = dockedWindows[winId];
  if (win) {
    win.open(files);
  }
});

function DockedWindow() {
  this.window = new BrowserWindow({
    width: 1050,
    height: 595,
    icon: __dirname + '/icon.png',
    frame: process.platfrom != 'darwin',
    transparent: false
  });
  console.log('load: file://' + __dirname + '/app/index.html');

  // and load the index.html of the app.
  this.window.loadURL('file://' + __dirname + '/app/index.html');


  this.window.app = this;
  this.id = id++;
  this._tabId = 0;
  dockedWindows[this.id] = this;
  this._loaded = false;
  this._pendingMessages = [];
  this._openFiles = [];

  // Register a ''CmdOrCtrl+F12' shortcut listener.
  var ret = globalShortcut.register('CmdOrCtrl+F12', (function (me) {
    return function () {
      console.log('CmdOrCtrl+F12 is pressed');
      me.window.show();
    };
  })(this));

  if (!ret) {
    console.log('registration failed');
  }

  // Check whether a shortcut is registered.
  console.log(globalShortcut.isRegistered('CmdOrCtrl+F12'));

  this.window.webContents.on('will-navigate', function (event) {
    // Never load up new contents - prevents drag and drop from loading files
    // directly into the webview
    event.preventDefault();
  });
  this.window.webContents.on('did-finish-load', (function (me) {
    return function () {
      me.window.webContents.send('set-id', me.id);
      me.window.emit('ready');
      if (process.platform.toLowerCase() === 'darwin') {
        me.window.webContents.send('isMac', true);
      }
    };
  })(this));
  // Emitted when the window is closed.
  this.window.on('closed', (function (me) {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    return function (event) {
      // Kill this window entirely as it's no longer valid
      debuglog("Window %s closed", me.id);
      delete dockedWindows[me.id];
    };
  })(this));

  this.window.on('focus', (function (me) {
    return function () {
      if (me.window && me.window.webContents) {
        me.window.webContents.send('focusWindow');
      }
    };
  })(this));

  this.window.on('blur', (function (me) {
    return function () {
      if (me.window && me.window.webContents) {
        me.window.webContents.send('blurWindow');
      }
    };
  })(this));

  this.window.on('close', (function (me) {
    return function (event) {
      me.window.hide();
      event.preventDefault();
      me.window.webContents.send('closeWindow');
    }
  })(this));
}

DockedWindow.prototype = {
  /**
   * Dev utility: reload all HTML for the window.
   */
  reload: function () {
    this.window.reloadIgnoringCache();
    if (this._openFiles.length > 0) {
      // Bind a new ready listener
      var me = this,
        files = this._openFiles;
      this._openFiles = [];
      this.window.once('ready', function () {
        me.open(files);
      });
    }
  },
  on: function (event, handler) {
    // Pass through to the window
    this.window.on(event, handler);
  },
  once: function (event, handler) {
    this.window.once(event, handler);
  },
  /**
   * Open the given file/files. If given a string, opens that single file. If
   * given an array, opens all files given.
   */
  open: function (path) {
    if (typeof path == 'string') {
      this.window.webContents.send('open-files', [path]);
      this._openFiles.push(path);
    } else if (typeof path == 'object' && typeof path.forEach == 'function') {
      var paths = [];
      path.forEach(function (p) {
        if (typeof p == 'string') {
          paths.push(p);
        }
      });
      if (paths.length > 0) {
        this.window.webContents.send('open-files', paths);
        Array.prototype.push.apply(this._openFiles, paths);
      }
    }
  },
  /**
   * Show the open file dialog, allowing the user to open a file.
   */
  showOpenDialog: function () {
    var me = this;
    dialog.showOpenDialog(this.window, {}, function (files) {
      if (files) {
        files.forEach(function (f) {
          me.open(f);
        });
      }
    });
  },
  closePane: function () {
    this.sendMenu('close-pane');
  },
  /**
   * Sends a notification that a menu option was chosen. These menu items have
   * no processing done on the "main process" side and are instead entirely
   * self-contained in the HTML side.
   */
  sendMenu: function (menu) {
    this.window.webContents.send('menu', menu);
  }
}

module.exports = DockedWindow;
