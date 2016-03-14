window.$ = window.jQuery = require("jquery");
var path = require('path');
var Extension = require(path.resolve(__dirname, '../modules/extension'));

var config = require(path.resolve(__dirname, '../modules/config')).get();
var utils = require(path.resolve(__dirname, '../modules/utils'));
var load = require(path.resolve(__dirname, '../modules/load'));
var _ = require('underscore');
var dialogAbout = new Extension("dialogAbout", 'Dialog "About"');
var dialogAboutHTML = load.loadHtml('dialogAbout.html');
dialogAbout.onReady = function () {
	utils.addModal('modal-about', _.template(dialogAboutHTML, {
		product: config.PRODUCT_NAME,
		version: config.VERSION
	}));
};

module.exports = dialogAbout;
