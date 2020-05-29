/**
 * emmits an event
 */

const sc = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}, context = {}) {
  const event = options.event;

  if (!event) {
    fn.error(null, 'EVENT-NOT-FOUND', Sequence.from([`No event found in the parameters `]));
  }

  const output = sc.emmitEvent(options.event);

  context.emmitEvent = context.emmitEvent || {};
  context.emmitEvent[event] = output;

  return context;
}

exports.performAction = performAction;
