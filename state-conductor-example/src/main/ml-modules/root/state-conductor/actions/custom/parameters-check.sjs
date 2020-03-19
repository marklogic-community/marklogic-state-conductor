'use strict';

function performAction(uri, parameters, context = {}) {
  context.parametersCheck = "Hello "+ parameters.name + ". Shall we play a game?";
  return context;
}

exports.performAction = performAction;
