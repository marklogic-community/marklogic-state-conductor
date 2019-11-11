'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists the status of the given State Conductor Flow
 */
function get(context, params) {
  if (params.flowName && !sc.getFlowDocument(params.flowName)) {
    returnError(404, 'NOT FOUND', `Flow File "${params.flowName}" not found.`);
  }

  const flowNames = params.flowName ? [params.flowName] : sc.getFlowNames();

  const resp = flowNames.reduce((acc, name) => {
    acc[name] = sc.getFlowCounts(name);
    return acc;
  }, {});

  context.outputStatus = [200, 'Success'];
  return resp;
}

exports.GET = get;