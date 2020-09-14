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
 * Lists the execution id for the given document of the named State Conductor State Machine
 */
function get(context, params) {
  if (!params.uri) {
    returnError(400, 'Bad Request', 'Missing required parameter "uri"');
  }
  if (!params.name) {
    returnError(400, 'Bad Request', 'Missing required parameter "name"');
  }

  if (!fn.docAvailable(params.uri)) {
    returnError(404, 'NOT FOUND', `Document at uri "${params.uri}" not found.`);
  }
  if (!sc.getStateMachineDocument(params.name)) {
    returnError(404, 'NOT FOUND', `StateMachine "${params.name}" not found.`);
  }

  context.outputStatus = [200, 'Success'];
  return sc.getExecutionIds(params.uri, params.name);
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
  if (!sc.getStateMachineDocument(name)) {
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
