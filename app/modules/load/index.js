module = module.exports;
var fs = require('fs');
var path = require('path');
var xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im;
var bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im;

var less = require('less');

var debuglog = require(path.resolve(__dirname, '../log/debuglog')).debuglog(
  'load');

function strip(content) {
  //Strips <?xml ...?> declarations so that external SVG and XML
  //documents can be added to a document without worry. Also, if the string
  //is an HTML document, only the part inside the body tag is returned.
  if (content) {
    content = content.replace(xmlRegExp, "");
    var matches = content.match(bodyRegExp);
    if (matches) {
      content = matches[1];
    }
  } else {
    content = "";
  }
  return content;
}

function jsEscape(content) {
  return content.replace(/(['\\])/g, '\\$1')
    .replace(/[\f]/g, "\\f")
    .replace(/[\b]/g, "\\b")
    .replace(/[\n]/g, "\\n")
    .replace(/[\t]/g, "\\t")
    .replace(/[\r]/g, "\\r")
    .replace(/[\u2028]/g, "\\u2028")
    .replace(/[\u2029]/g, "\\u2029");
}

module.loadHtml = function (filename, callback) {
  if (arguments.length < 2 || callback === null) {
    callback = function () {};
  }
  debuglog("read %s", filename);
  var fullPath = path.resolve(__dirname, '../../html/' +
    filename);
  var text = fs.readFileSync(fullPath, {
    encoding: 'utf8'
  });
  //Remove BOM (Byte Mark Order) from utf8 files if it is there.
  if (text.indexOf('\uFEFF') === 0) {
    text = text.substring(1);
  }
  return strip(text);
};



// TODO: At some point, the generated files should probably be cached and we
// should load them that way. Actually I guess ultimately all that stuff should
// happen during startup, maybe.

module.loadLess = function (filename, callback) {
  if (arguments.length < 2 || callback === null) {
    callback = function () {};
  }
  debuglog("read %s", filename);
  fs.readFile(filename, {
    encoding: 'utf8'
  }, function (err, src) {
    if (err) {
      debuglog("error reading %s: %j", filename, err);
      return callback(err);
    } else {
      less.render(src, {
        filename: filename
      }).then(function (result) {
        // Append a new stylesheet to the result
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.appendChild(document.createTextNode(result.css));
        document.head.appendChild(style);
      }, function (err) {
        // FIXME: Arguably this should be sent to console.error, but we're in
        // the browser context, so it can't. This should be a "higher level"
        // error or something.
        console.log("LESS error: " + err);
        callback(err);
      })
    }
  });
};
