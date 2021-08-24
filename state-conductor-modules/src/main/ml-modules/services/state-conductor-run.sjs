'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists documents matching the given state machine definition's context
 */
function get(context, { name = '', includeAlreadyProcessed = false, start = 1, count = 1000 }) {
  includeAlreadyProcessed = includeAlreadyProcessed === 'true';
  if (name === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "name"');
  }
  if (!sc.getStateMachine(name)) {
    returnError(404, 'NOT FOUND', `Flow File "${name}" not found.`);
  }

  context.outputStatus = [200, 'Success'];
  let resp = sc.findStateMachineTargets(name, {
    includeAlreadyProcessed,
    start,
    count,
  });
  return resp.toArray();
}

/**
 * Given a state machine, find and create executions for documents matching its context
 */
function put(context, { name = '', includeAlreadyProcessed = false, limit = 1000 }, input) {
  includeAlreadyProcessed = includeAlreadyProcessed === 'true';
  if (name === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "name"');
  }
  if (!sc.getStateMachine(name)) {
    returnError(404, 'NOT FOUND', `Flow File "${name}" not found.`);
  }

  context.outputStatus = [201, 'Created'];
  return sc.gatherAndCreateExecutionsForStateMachine(name, includeAlreadyProcessed, limit);
}

exports.GET = get;
exports.PUT = put;
