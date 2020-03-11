'use strict';

function performAction(uri, parameters) {
  return "Hello "+ parameters.name + ". Shall we play a game?"
}

exports.performAction = performAction;