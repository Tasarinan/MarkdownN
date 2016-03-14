window.$ = window.jQuery = require("jquery");
var path = require('path');
var Extension = require(path.resolve(__dirname, '../modules/extension'));

var _ = require('underscore');
var dialogManageSynchronization = new Extension(
	"dialogManageSynchronization", 'Dialog "Manage synchronization"', false,
	true);
var dialogManageSynchronizationLocationHTML = dialogManageSynchronization.get(
	'dialogManageSynchronizationLocation');
var eventMgr;
dialogManageSynchronization.onEventMgrCreated = function (eventMgrParameter) {
	eventMgr = eventMgrParameter;
};

var synchronizer;
dialogManageSynchronization.onSynchronizerCreated = function (
	synchronizerParameter) {
	synchronizer = synchronizerParameter;
};

var fileDesc;
var syncListElt;
var $showAlreadySynchronizedElt;
var refreshDialog = function (fileDescParameter) {
	if (fileDescParameter !== undefined && fileDescParameter !== fileDesc) {
		return;
	}

	$showAlreadySynchronizedElt.toggleClass("hide", _.size(fileDesc.syncLocations) ===
		0);

	var syncListHtml = _.reduce(fileDesc.syncLocations, function (result,
		syncAttributes) {
		return result + _.template(dialogManageSynchronizationLocationHTML, {
			syncAttributes: syncAttributes,
			syncDesc: syncAttributes.id || syncAttributes.path,
			syncLocationLink: syncAttributes.provider.getSyncLocationLink &&
				syncAttributes.provider.getSyncLocationLink(syncAttributes)
		});
	}, '');

	syncListElt.innerHTML = syncListHtml;
};

dialogManageSynchronization.onFileSelected = function (fileDescParameter) {
	fileDesc = fileDescParameter;
	refreshDialog(fileDescParameter);
};

dialogManageSynchronization.onSyncExportSuccess = refreshDialog;
dialogManageSynchronization.onSyncRemoved = refreshDialog;

dialogManageSynchronization.onReady = function () {
	var modalElt = document.querySelector(".modal-manage-sync");
	syncListElt = modalElt.querySelector(".sync-list");

	$showAlreadySynchronizedElt = $(document.querySelectorAll(
		".show-already-synchronized"));

	$(syncListElt).on('click', '.remove-button', function () {
		var $removeButtonElt = $(this);
		var syncAttributes = fileDesc.syncLocations[$removeButtonElt.data(
			'syncIndex')];
		fileDesc.removeSyncLocation(syncAttributes);
		eventMgr.onSyncRemoved(fileDesc, syncAttributes);
	});
};

module.exports = dialogManageSynchronization;
