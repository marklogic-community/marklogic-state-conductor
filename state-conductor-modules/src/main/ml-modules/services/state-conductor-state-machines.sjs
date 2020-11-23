'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/state-machine-validator.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists the installed State Conductor StateMachines
 */
function get(context, params) {
  if (params.name) {
    const stateMachine = sc.getStateMachine(params.name);
    if (stateMachine) {
      context.outputStatus = [200, 'Success'];
      return stateMachine;
    } else {
      returnError(404, 'NOT FOUND', `StateMachine File "${params.name}" not found.`);
    }
  } else {
    const stateMachines = sc.getStateMachines();
    const resp = stateMachines.toArray().reduce((acc, stateMachine) => {
      let name = sc.getStateMachineNameFromUri(fn.documentUri(stateMachine));
      acc[name] = stateMachine.toObject();
      return acc;
    }, {});
    context.outputStatus = [200, 'Success'];
    return resp;
  }
}

/**
 * Inserts or Updates an installed State Conductor StateMachine
 */
function put(context, params, input) {
  const name = params.name ? params.name.trim() : '';
  if (name === '') {
    returnError(400, 'Bad Request', 'Missing parameter "name"');
  } else if (!input || !context.inputTypes || context.inputTypes[0] !== 'application/json') {
    returnError(400, 'Bad Request', 'Invalid request body');
  } else if (!validator.validateStateMachineFile(input.toObject())) {
    returnError(400, 'Bad Request', 'Invalid state-conductor stateMachine file');
  } else {
    const uri = sc.createStateMachine(name, input);
    context.outputStatus = [201, 'Created'];
    return '';
  }
}

/**
 * Removes an installed State Conductor StateMachine
 */
function deleteFunction(context, params) {
  const name = params.name ? params.name.trim() : '';
  if (name === '') {
    returnError(400, 'Bad Request', 'Missing parameter "name"');
  } else {
    const stateMachine = sc.getStateMachine(name);
    if (!stateMachine) {
      returnError(404, 'NOT FOUND', `StateMachine File "${params.name}" not found.`);
    } else {
      const uri = fn.documentUri(stateMachine);
      xdmp.documentDelete(uri);
      context.outputStatus = [204, 'Deleted'];
      return '';
    }
  }
}

exports.GET = get;
exports.PUT = put;
exports.DELETE = deleteFunction;
