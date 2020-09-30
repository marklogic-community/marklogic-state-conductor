'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(
    null,
    'RESTAPI-SRVEXERR',
    Sequence.from([statusCode, statusMsg, body])
  );
}

/**
 * Emmits an event with the state conductor
 */
function put(context, params, input) {
  const event = params.event ? params.event.trim() : '';

  if (event.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "event"');
  }

  const resp = sc.emitEvent(event);

  context.outputStatus = [200, 'OK'];
  return resp;
}

exports.PUT = put;
