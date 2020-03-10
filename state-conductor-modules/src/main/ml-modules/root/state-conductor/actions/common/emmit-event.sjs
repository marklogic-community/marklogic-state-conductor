/**
 * emmits an event
 */

const sc  = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}) {

  if (options.event) {
    return sc.emmitEvent(options.event);
  }
  
}

exports.performAction = performAction;