var isOffline = false;
var testA = {};


function changeOffline() {
  if (isOffline === true) {
    isOffline = false;
  } else {
    isOffline = true;
  }
}

testA.output = function () {
  console.log(isOffline);
};
changeOffline();
module.exports = testA;
