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
 * Lists the status of the given State Conductor StateMachine
 */
function get(context, params) {
  if (params.name && !sc.getStateMachine(params.name)) {
    returnError(404, 'NOT FOUND', `StateMachine File "${params.name}" not found.`);
  }

  if (params.startDate && !isValidTemporal(params.startDate)) {
    returnError(400, 'BAD REQUEST', `Invalid startDate: "${params.startDate}".`);
  }

  if (params.endDate && !isValidTemporal(params.endDate)) {
    returnError(400, 'BAD REQUEST', `Invalid endDate: "${params.endDate}".`);
  }

  const stateMachineNames = params.name ? [params.name] : sc.getStateMachineNames();
  const startDate = params.startDate;
  const endDate = params.endDate;
  const detailed = params.detailed === 'true';

  const resp = stateMachineNames.reduce((acc, name) => {
    acc[name] = sc.getStateMachineCounts(name, {
      startDate: startDate,
      endDate: endDate,
      detailed: detailed,
    });
    return acc;
  }, {});

  context.outputStatus = [200, 'Success'];
  return resp;
}

exports.GET = get;
