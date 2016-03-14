var path = require('path');
var Extension = require(path.resolve(__dirname, '../modules/extension'));


var emailConverter = new Extension("emailConverter", "Markdown Email", true);
emailConverter.settingsBlock =
  '<p>Converts email addresses in the form &lt;email@example.com&gt; into clickable links.</p>';

emailConverter.onPagedownConfigure = function (editor) {
  editor.getConverter().hooks.chain("postConversion", function (text) {
    return text.replace(/<(mailto\:)?([^\s>]+@[^\s>]+\.\S+?)>/g, function (
      match, mailto, email) {
      return '<a href="mailto:' + email + '">' + email + '</a>';
    });
  });
};

module.exports = emailConverter;
