/**
 * @module Docked Menu
 * Module for creating the menus.
 */
'use strict';
const electron = require('electron');

const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.

const Menu = electron.Menu;

var app = require('./app');

function createTemplate() {
  var command = process.platform == 'darwin' ? 'Command' : 'Ctrl';
  var template = [{
    label: 'File',
    submenu: [{
      label: 'New Window',
      accelerator: command + '+N',
      click: function () {
        app.openNewWindow();
      }
    }, {
      label: 'Open...',
      accelerator: command + '+O',
      click: function () {
        BrowserWindow.getFocusedWindow().app.showOpenDialog();
      }
    }, {
      type: 'separator'
    }, {
      label: 'Close',
      accelerator: command + '+W',
      click: function () {
        BrowserWindow.getFocusedWindow().app.closePane();
      }
    }]
  }, {
    label: 'View',
    submenu: [{
        label: 'Jump to position',
        accelerator: command + '+J',
        click: function () {
          BrowserWindow.getFocusedWindow().app.sendMenu('jump-to');
        }
      },
      /* Not implemented ... yet. {
        label: 'Run JavaScript',
        accelerator: 'Alt+' + command + '+J',
        click: function() { BrowserWindow.getFocusedWindow().hexed.sendMenu('run-javascript'); }
      },*/
      {
        type: 'separator'
      }, {
        label: 'Reload',
        accelerator: command + '+R',
        click: function () {
          BrowserWindow.getFocusedWindow().app.reload();
        }
      }, {
        label: 'Toggle DevTools',
        accelerator: command + '+Shift+I',
        click: function () {
          BrowserWindow.getFocusedWindow().toggleDevTools();
        }
      },
    ]
  }, {
    label: 'Search',
    submenu: [
      /*{
        label: 'Find...',
        accelerator: command + '+F',
        click: function() { BrowserWindow.getFocusedWindow().hexed.sendMenu('find'); }
      },*/
      {
        label: 'Strings...',
        click: function () {
          BrowserWindow.getFocusedWindow().app.sendMenu('strings');
        }
      }
    ]
  }, {
    label: 'Help',
    submenu: [{
      label: 'About',
      click: function () {
        BrowserWindow.getFocusedWindow().app.sendMenu('about');
      }
    }]
  }];
  // TODO: Only do this when not on OS X and add an approriate Quit option when
  // on OS X
  if (process.platform == 'darwin') {
    // On OS X, we need to insert the app menu as the first menu
    template.unshift({
      'label': 'dockWriter',
      'submenu': [{
        label: 'About dockWriter',
        selector: 'orderFrontStandardAboutPanel:'
      }, {
        type: 'separator'
      }, {
        label: 'Services',
        submenu: []
      }, {
        type: 'separator'
      }, {
        label: 'Hide dockWriter',
        accelerator: 'Command+H',
        selector: 'hide:'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        selector: 'hideOtherApplications:'
      }, {
        label: 'Show All',
        selector: 'unhideAllApplications:'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        selector: 'terminate:'
      }]
    });
  } else {
    // Place the Exit/Quit menu item as appropriate:
    template[0].submenu.push({
      type: 'separator'
    }, {
      label: 'Exit',
      click: function () {
        // TODO: Not this
        app.quit();
      }
    });
  }
  return template;
}

function createMenu() {
  return Menu.buildFromTemplate(createTemplate());
}

exports.createTemplate = createTemplate;
exports.createMenu = createMenu;
