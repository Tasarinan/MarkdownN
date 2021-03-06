  window.$ = window.jQuery = require("jquery");
  var path = require('path');
  var utils = require(path.resolve(__dirname, '../modules/utils'));
  var _ = require('lodash');
  var Extension = require(path.resolve(__dirname, '../modules/extension'));
  var load = require(path.resolve(__dirname, '../modules/load'));
  var buttonHtmlCode = new Extension("buttonHtmlCode", 'Button "HTML code"',
    true);
  var buttonHtmlCodeHTML = load.loadHtml("buttonHtmlCode.html");
  var buttonHtmlCodeSettingsBlockHTML = load.loadHtml(
    "buttonHtmlCodeSettingsBlock.html");
  buttonHtmlCode.settingsBlock = buttonHtmlCodeSettingsBlockHTML;
  buttonHtmlCode.defaultConfig = {
    template: "<%= documentHTML %>"
  };

  buttonHtmlCode.onLoadSettings = function () {
    utils.setInputValue("#textarea-html-code-template", buttonHtmlCode.config
      .template);
  };

  buttonHtmlCode.onSaveSettings = function (newConfig) {
    newConfig.template = utils.getInputValue(
      "#textarea-html-code-template");
  };

  var eventMgr;
  buttonHtmlCode.onEventMgrCreated = function (eventMgrParameter) {
    eventMgr = eventMgrParameter;
  };

  buttonHtmlCode.onCreatePreviewButton = function () {
    return buttonHtmlCodeHTML;
  };

  var selectedFileDesc;
  buttonHtmlCode.onFileSelected = function (fileDesc) {
    selectedFileDesc = fileDesc;
  };

  var htmlWithComments, htmlWithoutComments;
  buttonHtmlCode.onPreviewFinished = function (htmlWithCommentsParam,
    htmlWithoutCommentsParam) {
    htmlWithComments = htmlWithCommentsParam;
    htmlWithoutComments = htmlWithoutCommentsParam;
  };

  buttonHtmlCode.onReady = function () {
    var textareaElt = document.getElementById('input-html-code');
    $(".action-html-code").click(function () {
      setTimeout(function () {
        $("#input-html-code").each(function () {
          if ($(this).is(":hidden")) {
            return;
          }
          this.select();
        });
      }, 10);
    }).parent().on('show.bs.dropdown', function () {
      try {
        var htmlCode = _.template(buttonHtmlCode.config.template, {
          documentTitle: selectedFileDesc.title,
          documentMarkdown: selectedFileDesc.content,
          strippedDocumentMarkdown: selectedFileDesc.content.substring(
            selectedFileDesc.frontMatter ? selectedFileDesc.frontMatter
            ._frontMatter.length : 0),
          documentHTML: htmlWithoutComments,
          documentHTMLWithFrontMatter: (selectedFileDesc.frontMatter ?
              selectedFileDesc.frontMatter._frontMatter : '') +
            htmlWithoutComments,
          documentHTMLWithComments: htmlWithComments,
          frontMatter: selectedFileDesc.frontMatter,
          publishAttributes: undefined
        });
        textareaElt.value = htmlCode;
      } catch (e) {
        eventMgr.onError(e);
      }
    });
  };

  module.exports = buttonHtmlCode;
