/*jslint browser:true*/
/*global window*/


//require('./vendor/ace-spell-check/spellcheck_ace.js');
require('./modules/menu');
//require('./modules/toolbars/formatting');
//require('./modules/toolbars/tabs');
//require('./modules/persistence');
require('./modules/files');
//require('./modules/results');
require('./modules/editor');
require('./modules/footer');
require('./modules/help');
require('./modules/global');
var core = require('./modules/core');

// Check browser compatibility
try {
  var test = 'seLocalStorageCheck';
  localStorage.setItem(test, test);
  localStorage.removeItem(test);
  var obj = {};
  Object.defineProperty(obj, 'prop', {
    get: function () {},
    set: function () {}
  });
} catch (e) {
  window.alert('Your browser is not supported, sorry!');
  throw e;
}

$(function () {
  // Keep the theme in a global variable
  window.theme = localStorage.themeV4 || 'default';
  // Here, all the modules are loaded and the DOM is ready
  core.onReady();
  $('body').fadeIn('50');
});
