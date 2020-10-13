'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists documents matching the given flow file's context
 */
function get(context, { flowName = '', includeAlreadyProcessed = false, limit = 1000 }) {
  includeAlreadyProcessed = includeAlreadyProcessed === 'true';
  if (flowName === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "flowName"');
  }
  if (!sc.getFlowDocument(flowName)) {
    returnError(404, 'NOT FOUND', `Flow File "${flowName}" not found.`);
  }

  context.outputStatus = [200, 'Success'];
  let resp = sc.findFlowTargets(flowName, includeAlreadyProcessed, limit);
  return resp.toArray();
}

/**
 * Given a flow, find and created jobs for document's matching its context
 */
function put(context, { flowName = '', includeAlreadyProcessed = false, limit = 1000 }, input) {
  includeAlreadyProcessed = includeAlreadyProcessed === 'true';
  if (flowName === '') {
    returnError(400, 'Bad Request', 'Missing required parameter "flowName"');
  }
  if (!sc.getFlowDocument(flowName)) {
    returnError(404, 'NOT FOUND', `Flow File "${flowName}" not found.`);
  }

  context.outputStatus = [201, 'Created'];
  return sc.gatherAndCreateJobsForFlow(flowName, includeAlreadyProcessed, limit);
}

exports.GET = get;
exports.PUT = put;
