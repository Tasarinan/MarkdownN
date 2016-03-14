var _ = require('underscore');
var path = require('path');
var config = require(path.resolve(__dirname, '../config')).get();
var storage = require('local-storage');

var settings = {
  layoutOrientation: "horizontal",
  editMode: 'ltr',
  lazyRendering: true,
  editorFontClass: 'font-rich',
  fontSizeRatio: 1,
  maxWidthRatio: 1,
  cursorFocusRatio: 0.5,
  defaultContent: "\n\n\n> Written with (" + config.PRODUCT_NAME + ").",
  commitMsg: "Written by " + config.PRODUCT_NAME,
  conflictMode: 'merge',
  markdownMimeType: 'text/plain',
  template: [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title><%= documentTitle %></title>',
    '<link rel="stylesheet" href="res-min/themes/base.css" />',
    '<script type="text/javascript" src="https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML"></script>',
    '</head>',
    '<body><div class="container"><%= documentHTML %></div></body>',
    '</html>'
  ].join('\n'),
  pdfTemplate: [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<title><%= documentTitle %></title>',
    '<link rel="stylesheet" href="res-min/themes/base.css" />',
    '<script type="text/x-mathjax-config">',
    'MathJax.Hub.Config({ messageStyle: "none" });',
    '</script>',
    '<script type="text/javascript" src="res/bower-libs/MathJax/MathJax.js?config=TeX-AMS_HTML"></script>',
    '</head>',
    '<body><%= documentHTML %></body>',
    '</html>'
  ].join('\n'),
  pdfOptions: [
    '{',
    '    "marginTop": 25,',
    '    "marginRight": 25,',
    '    "marginBottom": 25,',
    '    "marginLeft": 25,',
    '    "pageSize": "A4"',
    '}'
  ].join('\n'),
  nedbPath: config.NEDB_DATA_PATH,
  extensionSettings: {},
  _editorWidth: '49%',
  editorWidth: function (value) {
    if (value) {
      settings._editorWidth = value;
    } else {
      return settings._editorWidth;
    }
  },

  split: function () {
    return (parseInt(settings._editorWidth) + 1) + '%';
  },

  resultsWidth: function () {
    if (parseInt(settings.editorWidth()) > 90) {
      return '0px';
    } else {
      return (100 - parseInt(settings.split()) - 1) + '%';
    }
  },

  editingContainerOffset: function () {
    return 113;
  },
  resultsButtonWidth: function () {
    return 22;
  }
};

try {
  _.extend(settings, JSON.parse(storage.settings));
} catch (e) {
  // Ignore parsing error
}

module.exports = settings;
