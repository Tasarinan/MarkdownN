/*jshint -W020 */
module = module.exports;
var path = require('path');

var utils = require(path.resolve(__dirname, '../utils'));
var FolderDescriptor = require(path.resolve(__dirname,
  './FolderDescriptor'));
var storage = require('local-storage');
var folderList = {};

// Retrieve folder descriptors from localStorage
utils.retrieveIndexArray("folder.list").forEach(function (folderIndex) {
  folderList[folderIndex] = new FolderDescriptor(folderIndex);
});

// Clean fields from deleted folders in local storage
Object.keys(storage).forEach(function (key) {
  var match = key.match(/(folder\.\S+?)\.\S+/);
  if (match && !folderList.hasOwnProperty(match[1])) {
    storage.removeItem(key);
  }
});

module = folderList;
