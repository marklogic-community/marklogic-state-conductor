/**
 * emmits an event
 */

const sc = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}, context = {}) {
  const event = options.event;

  if (!event) {
    fn.error(null, 'EVENT-NOT-FOUND', Sequence.from([`No event found in the parameters `]));
  }

  const output = sc.emitEvent(options.event);

  context.emitEvent = context.emitEvent || {};
  context.emitEvent[event] = output;

  return context;
}

exports.performAction = performAction;
