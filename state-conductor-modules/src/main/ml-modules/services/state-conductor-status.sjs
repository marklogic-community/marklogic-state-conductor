'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

function isValidTemporal(value) {
  try {
    xs.dateTime(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists the status of the given State Conductor Flow
 */
function get(context, params) {
  if (params.flowName && !sc.getFlowDocument(params.flowName)) {
    returnError(404, 'NOT FOUND', `Flow File "${params.flowName}" not found.`);
  }

  if (params.startDate && !isValidTemporal(params.startDate)) {
    returnError(400, 'BAD REQUEST', `Invalid startDate: "${params.startDate}".`);
  }

  if (params.endDate && !isValidTemporal(params.endDate)) {
    returnError(400, 'BAD REQUEST', `Invalid endDate: "${params.endDate}".`);
  }

  const flowNames = params.flowName ? [params.flowName] : sc.getFlowNames();
  const startDate = params.startDate;
  const endDate = params.endDate;

  const resp = flowNames.reduce((acc, name) => {
    acc[name] = sc.getFlowCounts(name, {
      startDate: startDate,
      endDate: endDate,
    });
    return acc;
  }, {});

  context.outputStatus = [200, 'Success'];
  return resp;
}

exports.GET = get;
