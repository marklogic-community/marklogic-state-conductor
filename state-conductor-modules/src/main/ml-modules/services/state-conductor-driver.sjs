'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
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

exports.PUT = put;