'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists the execution id for the given document of the named State Conductor State Machine
 */
function get(context, { uri, name, historic = 'false', full = 'true' }) {
  historic = historic === 'true';
  full = full === 'true';

  if (!uri) {
    returnError(400, 'Bad Request', 'Missing required parameter "uri"');
  }

  if (!fn.docAvailable(uri)) {
    returnError(404, 'NOT FOUND', `Document at uri "${uri}" not found.`);
  }
  if (name && !sc.getStateMachine(name)) {
    returnError(404, 'NOT FOUND', `StateMachine "${name}" not found.`);
  }

  let resp = [];
  if (full) {
    resp = sc.getExecutionsForUri(uri, name, historic);
  } else {
    resp = sc.getExecutionIds(uri, name);
  }

  context.outputStatus = [200, 'Success'];
  return resp;
}

/**
 * Inserts a State Conductor Execution for one or more uris
 */
function put(context, { uris = [], name = '' }, input) {
  if (typeof uris === 'string') {
    uris = uris.split(',');
  }

  if (uris.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uris"');
  }
  if (name === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "name"');
  }
  if (!sc.getStateMachine(name)) {
    returnError(404, 'NOT FOUND', `StateMachine File "${name}" not found.`);
  }

  const resp = uris.reduce((acc, uri) => {
    if (fn.docAvailable(uri)) {
      const executionId = sc.createStateConductorExecution(name, uri);
      acc[uri] = executionId;
      return acc;
    } else {
      returnError(400, 'Bad Request', `Document "${uri}" not found.`);
    }
  }, {});

  context.outputStatus = [201, 'Created'];
  return resp;
}

exports.GET = get;
exports.PUT = put;
