window.$ = window.jQuery = require("jquery");
var path = require('path');
var Extension = require(path.resolve(__dirname, '../modules/extension'));
var load = require(path.resolve(__dirname, '../modules/load'));
var buttonViewer = new Extension("buttonViewer", 'Button "Viewer"', true,
  true);
var buttonViewerHTML = load.loadHtml('buttonViewer.html');
buttonViewer.settingsBlock =
  '<p>Adds a "Viewer" button over the preview.</p>';

buttonViewer.onCreatePreviewButton = function () {
  return buttonViewerHTML;
};

module.exports = buttonViewer;
