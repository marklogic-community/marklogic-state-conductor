'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists the job id for the given document of the named State Conductor Flow
 */
function get(context, params) {
  if (!params.uri) {
    returnError(400, 'Bad Request', 'Missing required parameter "uri"');
  }
  if (!params.flowName) {
    returnError(400, 'Bad Request', 'Missing required parameter "flowName"');
  }

  //runs the query in the jobs database
  const JobIds = fn.head(xdmp.invokeFunction(() => {

    if (!fn.docAvailable(params.uri)) {
      returnError(404, 'NOT FOUND', `Document at uri "${params.uri}" not found.`);
    }
    if (!sc.getFlowDocument(params.flowName)) {
      returnError(404, 'NOT FOUND', `Flow File "${params.flowName}" not found.`);
    }

    return sc.getJobIds(params.uri, params.flowName);

  }, {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
  }))

  context.outputStatus = [200, 'Success'];

  return JobIds
}

/**
 * Inserts a State Conductor Job for one or more uris
 */
function put(context, { uris = [], flowName = '' }, input) {
  if (typeof uris === 'string') {
    uris = uris.split(',');
  }

  if (uris.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uris"');
  }
  if (flowName === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "flowName"');
  }
  if (!sc.getFlowDocument(flowName)) {
    returnError(404, 'NOT FOUND', `Flow File "${flowName}" not found.`);
  }

  //runs the update in the jobs database
  const resp = uris.reduce((acc, uri) => {
      if (fn.docAvailable(uri)) {
        const jobId = sc.createStateConductorJob(flowName, uri);
        acc[uri] = jobId;
        return acc;
      } else {
        returnError(400, 'Bad Request', `Document "${uri}" not found.`);
      }
    });

  context.outputStatus = [201, 'Created'];
  return resp;
}

exports.GET = get;
exports.PUT = put;
