'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * resumes the jobs with the URIS sent
 */
function put(context, { uris = [], stateName = sc.FLOW_NEW_STEP,  retriedBy = 'unspecified' }, input) {

  if (typeof uris === 'string') {
    uris = uris.split(',');
  }

  if (uris.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uris"');
  }

  retriedBy = "Rest Endpoint:" + retriedBy;

  const resp = {
    "uris": [],
    "jobs": {},
  };

  //runs the update in the jobs database
  sc.invokeOrApplyFunction(() => {
    declareUpdate();

    uris.forEach(function(uri){

      resp.uris.push(uri);

      resp.jobs[uri] = sc.retryJobAtState(uri, stateName, retriedBy);

    });

  }, {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
  })

  context.outputStatus = [200, 'OK'];
  return resp;
}

exports.PUT = put;
