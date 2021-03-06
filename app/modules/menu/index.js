var remote = require('remote');
var Menu = remote.require('menu');
var path = require('path');
var messenger = require(path.resolve(__dirname, '../messenger'));

require(path.resolve(__dirname, './file.js'));
require(path.resolve(__dirname, './view.js'));
require(path.resolve(__dirname, './help.js'));
require(path.resolve(__dirname, './context.js'));

var handlers = {

  // File
  newMarkdownFile: function () {
    messenger.publish.menu('new', {
      format: 'markdown'
    });
  },
  newAsciiDocFile: function () {
    messenger.publish.menu('new', {
      format: 'asciidoc'
    });
  },
  open: function () {
    messenger.publish.menu('open');
  },
  save: function () {
    messenger.publish.menu('save');
  },
  saveAs: function () {
    messenger.publish.menu('saveAs');
  },
  saveAsHtml: function () {
    messenger.publish.menu('saveAsHtml');
  },
  saveAsPDF: function () {
    messenger.publish.menu('saveAsPDF');
  },
  quit: function () {
    messenger.publish.menu('quit');
  },

  // View
  reload: function () {
    messenger.publish.menu('reload');
  },
  devTools: function () {
    messenger.publish.menu('devToolsToggle');
  },
  fullScreen: function () {
    messenger.publish.menu('fullScreenToggle');
  },
  autoHideMenu: function () {
    messenger.publish.menu('autoHideMenu');
  },

  // Help
  issues: function () {
    messenger.publish.menu('issues');
  },
  about: function () {
    messenger.publish.menu('about');
  }
};

var template = [{
  label: 'File',
  submenu: [{
    label: 'New',
    submenu: [{
      label: 'AsciiDoc',
      accelerator: 'CmdOrCtrl+N',
      click: handlers.newAsciiDocFile
    }, {
      label: 'Markdown',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: handlers.newMarkdownFile
    }, ]
  }, {
    type: 'separator'
  }, {
    label: 'Open',
    accelerator: 'CmdOrCtrl+O',
    click: handlers.open
  }, {
    type: 'separator'
  }, {
    label: 'Save',
    accelerator: 'CmdOrCtrl+S',
    click: handlers.save
  }, {
    label: 'Save As',
    accelerator: 'CmdOrCtrl+Shift+S',
    click: handlers.saveAs
  }, {
    label: 'Save As HTML',
    accelerator: 'CmdOrCtrl+Shift+H',
    click: handlers.saveAsHtml
  }, {
    label: 'Save As PDF',
    accelerator: 'CmdOrCtrl+Shift+P',
    click: handlers.saveAsPDF
  }, {
    type: 'separator'
  }, {
    label: 'Quit',
    accelerator: 'CmdOrCtrl+Q',
    click: handlers.quit
  }, ]
}, {
  label: 'Publish',
  submenu: [{
    label: 'Github',
    accelerator: 'CmdOrCtrl+G',
    click: handlers.github
  }, {
    label: 'SSH Server',
    accelerator: 'CmdOrCtrl+P+S',
    click: handlers.sshServer
  }, {
    label: 'WordPress',
    accelerator: 'CmdOrCtrl+P+W',
    click: handlers.wordPress
  }, {
    label: 'Blog Server',
    accelerator: 'CmdOrCtrl+P+B',
    click: handlers.blogger
  }]
}, {
  label: 'View',
  submenu: [{
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: handlers.reload
  }, {
    label: 'Toggle DevTools',
    accelerator: 'CmdOrCtrl+Shift+T',
    click: handlers.devTools
  }, {
    label: 'Toggle Full Screen',
    accelerator: 'CmdOrCtrl+Shift+F',
    click: handlers.fullScreen
  }, {
    label: 'Toggle Auto Hide Menu',
    accelerator: 'CmdOrCtrl+Shift+M',
    click: handlers.autoHideMenu
  }]
}, {
  label: 'Help',
  submenu: [{
    label: 'Issues',
    click: handlers.issues
  }, {
    type: 'separator'
  }, {
    label: 'About',
    click: handlers.about
  }]
}];

var menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
