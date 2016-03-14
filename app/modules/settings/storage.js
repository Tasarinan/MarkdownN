//Setup an empty localStorage or upgrade an existing one
var _ = require('underscore');

function retrieveIndexArray(storeIndex) {
  try {
    return _.compact(localStorage[storeIndex].split(";"));
  } catch (e) {
    localStorage[storeIndex] = ";";
    return [];
  }
}

var fileIndexList = retrieveIndexArray("file.list");
var currentFileIndex, settings;

//localStorage versioning
var version = localStorage.version;
if (version === undefined) {
  _.each(fileIndexList, function (fileIndex) {
    localStorage[fileIndex + ".publish"] = ";";
  });
  version = "v1";
}

if (version == "v1") {
  currentFileIndex = localStorage["file.current"];
  if (currentFileIndex !== undefined && localStorage["file.list"].indexOf(
      ";" + currentFileIndex + ";") === -1) {
    localStorage.removeItem("file.current");
  }
  version = "v2";
}

if (version == "v2") {
  _.each(fileIndexList, function (fileIndex) {
    var publishIndexList = retrieveIndexArray(fileIndex + ".publish");
    _.each(publishIndexList, function (publishIndex) {
      var publishAttributes = JSON.parse(localStorage[
        publishIndex]);
      if (publishAttributes.provider == "gdrive") {
        // Change fileId to Id to be consistent with syncAttributes
        publishAttributes.id = publishAttributes.fileId;
        publishAttributes.fileId = undefined;
        localStorage[publishIndex] = JSON.stringify(
          publishAttributes);
      }
    });
  });
  version = "v3";
}

if (version == "v3") {
  currentFileIndex = localStorage["file.current"];
  if (currentFileIndex !== undefined) {
    localStorage[currentFileIndex + ".selectTime"] = new Date().getTime();
    localStorage.removeItem("file.current");
  }
  version = "v4";
}

if (version == "v4") {
  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    // Have to reset the font because of Monaco issue with ACE
    delete settings.editorFontFamily;
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v5";
}

if (version == "v5") {

  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    if (((settings.extensionSettings || {}).markdownExtra || {}).extensions) {
      settings.extensionSettings.markdownExtra.extensions.push('newlines');
      settings.extensionSettings.markdownExtra.extensions.push(
        'strikethrough');
    }
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v9";
}

if (version == "v9") {
  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    delete settings.shortcuts;
    delete settings.editorFontFamily;
    delete settings.editorFontSize;
    delete settings.maxWidth;
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v10";
}

if (version == 'v10') {
  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    ((settings.extensionSettings || {}).markdownExtra || {}).diagrams =
      true;
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v11";
}

if (version == 'v11') {
  // Force new theme by using themeV4 variable
  localStorage.removeItem("themeV3");
  // Force welcome tour
  localStorage.removeItem("welcomeTour");
  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    // New web services
    delete settings.pdfTemplate;
    delete settings.pdfPageSize;
    delete settings.sshProxy;
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v12";
}

if (version == 'v12') {
  if (_.has(localStorage, 'settings')) {
    settings = JSON.parse(localStorage.settings);
    // Force use of text/plain
    delete settings.markdownMimeType;
    localStorage.settings = JSON.stringify(settings);
  }
  version = "v13";
}
localStorage.version = version;
module.exports = localStorage;
