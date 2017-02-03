/*jslint browser:true*/
/*jshint -W020 */
module = module.exports;
var path = require('path');
var fileSystem = require(path.resolve(__dirname, './fileSystem'));
var utils = require(path.resolve(__dirname, '../utils'));
var _ = require('lodash');
var storage = require('local-storage');

function FolderDescriptor(folderIndex, name) {
  this.folderIndex = folderIndex;
  this._name = name || storage[folderIndex + ".name"];
  // Retrieve file list from storage
  this.fileList = {};
  _.each(utils.retrieveIndexArray(folderIndex + ".files"), function (
    fileIndex) {
    try {
      var fileDesc = fileSystem[fileIndex];
      fileDesc.folder = this;
      this.fileList[fileIndex] = fileDesc;
    } catch (e) {
      // storage can be corrupted
      // Remove file from folder
      utils.removeIndexFromArray(folderIndex + ".files", fileIndex);
    }
  }, this);
  Object.defineProperty(this, 'name', {
    get: function () {
      return this._name;
    },
    set: function (name) {
      this._name = name;
      storage[this.folderIndex + ".name"] = name;
    }
  });
}

FolderDescriptor.prototype.addFile = function (fileDesc) {
  fileDesc.folder = this;
  utils.appendIndexToArray(this.folderIndex + ".files", fileDesc.fileIndex);
  this.fileList[fileDesc.fileIndex] = fileDesc;
};

FolderDescriptor.prototype.removeFile = function (fileDesc) {
  fileDesc.folder = undefined;
  utils.removeIndexFromArray(this.folderIndex + ".files", fileDesc.fileIndex);
  delete this.fileList[fileDesc.fileIndex];
};

module = FolderDescriptor;
