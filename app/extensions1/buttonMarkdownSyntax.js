  window.$ = window.jQuery = require("jquery");
  var path = require('path');
  var Extension = require(path.resolve(__dirname, '../modules/extension'));
  var load = require(path.resolve(__dirname, '../modules/load'));
  var buttonMarkdownSyntax = new Extension("buttonMarkdownSyntax",
    'Button "Markdown syntax', true, true);
  buttonMarkdownSyntax.settingsBlock =
    '<p>Adds a "Markdown syntax" button over the preview.</p>';
  var buttonMarkdownSyntaxHTML = load.loadHtml(
    'buttonMarkdownSyntax.html');
  buttonMarkdownSyntax.onCreatePreviewButton = function () {
    return buttonMarkdownSyntaxHTML;
  };

  module.exports = buttonMarkdownSyntax;
