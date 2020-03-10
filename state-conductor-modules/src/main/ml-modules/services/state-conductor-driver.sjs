'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

function parseArrayParam(input, delim = ',') {
  let value = [];
  if (typeof input === 'string') {
    value = input.split(delim);
  }
  if (Array.isArray(input)) {
    value = input;
  }
  return value;
}

/**
 * Searches for state conductor job documents matching the parameters
 */
function get(context, params) {
  let options = {
    count: Math.max(0, parseInt('0' + params.count)),
    flowStatus: parseArrayParam(params.flowStatus),
    flowNames: parseArrayParam(params.flowNames),
    startDate: params.startDate,
    endDate: params.endDate
  }

  context.outputStatus = [200, 'OK'];
  return sc.getJobDocuments(options);
}

/**
 * Executes the given state conductor job - performing state actions and transitions
 */
function put(context, { uri = '' }, input) {
  if (uri.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uri"');
  }

  const continueJob = fn.head(xdmp.invokeFunction(() => {
    declareUpdate();
    return sc.processJob(uri);
  }, {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
  }));

  const resp = {
    reschedule: continueJob
  };

  context.outputStatus = [200, 'OK'];
  return resp;
}

exports.GET = get;
exports.PUT = put;
