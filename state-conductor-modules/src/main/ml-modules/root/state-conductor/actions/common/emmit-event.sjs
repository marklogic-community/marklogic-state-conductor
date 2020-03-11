/**
 * emmits an event
 */

const sc  = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}) {
  const event = options.event

  if (!event) {
    fn.error(null, 'EVENT-NOT-FOUND', Sequence.from([`No event found in the parameters `]));
  }

  return sc.emmitEvent(options.event);

}

exports.performAction = performAction;
