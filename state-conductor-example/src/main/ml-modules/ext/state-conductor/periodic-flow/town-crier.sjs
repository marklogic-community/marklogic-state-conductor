'use strict';

function performAction(uri, parameters = {}, context = {}) {
  xdmp.log(`THE TIME IS ${fn.currentDateTime()} AND ALL IS WELL!`);
  return context;
}

exports.performAction = performAction;
