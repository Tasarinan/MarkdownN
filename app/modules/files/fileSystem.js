/*jshint -W020 */
module = module.exports;
var path = require('path');
var utils = require(path.resolve(__dirname, '../utils'));
var FileDescriptor = require(path.resolve(__dirname, './FileDescriptor'));

var storage = require('local-storage');
var fileSystem = {};

// Retrieve file descriptors from localStorage
utils.retrieveIndexArray("file.list").forEach(function (fileIndex) {
  fileSystem[fileIndex] = new FileDescriptor(fileIndex);
});

// Clean fields from deleted files in local storage
Object.keys(storage).forEach(function (key) {
  var match = key.match(/(file\.\S+?)\.\S+/);
  if (match && !fileSystem.hasOwnProperty(match[1])) {
    storage.removeItem(key);
  }
});

module = fileSystem;
