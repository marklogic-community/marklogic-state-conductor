'use strict';

function performAction(uri, parameters = {}, context = {}) {
  xdmp.log(`THE TIME IS ${fn.currentDateTime()} AND ALL IS WELL!`);
}

exports.performAction = performAction;
