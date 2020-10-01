'use strict';

function performAction(uri, options, context) {
  //wait 30 seconds
  //sleep is in milliseconds
  xdmp.sleep(1000 * 30);

  context.waitIsOver = true;

  return context;
}

exports.performAction = performAction;
