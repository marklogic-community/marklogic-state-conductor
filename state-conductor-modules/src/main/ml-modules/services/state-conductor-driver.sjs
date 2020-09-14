'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

function parseArrayParam(input, delim = ',') {
  let value;
  if (typeof input === 'string') {
    value = input.split(delim);
  }
  if (Array.isArray(input)) {
    value = input;
  }
  return value;
}

/**
 * Searches for state conductor execution documents matching the parameters
 */
function get(context, params) {
  let options = {
    count: Math.max(0, parseInt('0' + params.count)),
    status: parseArrayParam(params.status),
    names: parseArrayParam(params.names),
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const uris = sc.getExecutionDocuments(options);

  xdmp.trace(sc.TRACE_EVENT, `state-conductor-driver found ${uris.length} execution documents`);

  context.outputStatus = [200, 'OK'];
  return uris;
}

/**
 * Executes the given state conductor execution - performing state actions and transitions
 */
function put(context, { uri = '' }) {
  if (uri.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uri"');
  }

  const continueExecution = fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return sc.processExecution(uri);
      },
      {
        database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
      }
    )
  );

  const resp = {
    reschedule: continueExecution,
  };

  context.outputStatus = [200, 'OK'];
  return resp;
}

exports.GET = get;
exports.PUT = put;
