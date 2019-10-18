'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/flow-file-validator.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

/**
 * Lists the installed State Conductor Flows
 */
function get(context, params) {
  if (params.flowName) {
    const flow = sc.getFlowDocument(params.flowName);
    if (flow) {
      context.outputStatus = [200, 'Success'];
      return flow;
    } else {
      returnError(404, 'NOT FOUND', `Flow File "${params.flowName}" not found.`);
    }
  } else {
    const flows = sc.getFlowDocuments();
    const resp = flows.toArray().reduce((acc, flow) => {
      let name = sc.getFlowNameFromUri(fn.documentUri(flow));
      acc[name] = flow.toObject();
      return acc;
    }, {});
    context.outputStatus = [200, 'Success'];
    return resp;
  }
}

/**
 * Inserts or Updates an installed State Conductor Flow
 */
function put(context, params, input) {
  const flowName = params.flowName ? params.flowName.trim() : '';
  if (flowName === '') {
    returnError(400, 'Bad Request', 'Missing parameter "flowName"');
  } else if (!input || !context.inputTypes || context.inputTypes[0] !== 'application/json') {
    returnError(400, 'Bad Request', 'Invalid request body');
  } else if (!validator.validateFlowFile(input.toObject())) {
    returnError(400, 'Bad Request', 'Invalid state-conductor flow file');
  } else {
    const uri = `${sc.FLOW_DIRECTORY}${flowName}.asl.json`;
    xdmp.documentInsert(uri, input, {
      permissions: xdmp.defaultPermissions(),
      collections: [sc.FLOW_COLLECTION]
    });
    context.outputStatus = [201, 'Created'];
    return '';
  }
}

/**
 * Removes and installed State Conductor Flow
 */
function deleteFunction(context, params) {
  const flowName = params.flowName ? params.flowName.trim() : '';
  if (flowName === '') {
    returnError(400, 'Bad Request', 'Missing parameter "flowName"');
  } else {
    const flow = sc.getFlowDocument(flowName);
    if (!flow) {
      returnError(404, 'NOT FOUND', `Flow File "${params.flowName}" not found.`);
    } else {
      const uri = fn.documentUri(flow);
      xdmp.documentDelete(uri);
      context.outputStatus = [204, 'Deleted'];
      return '';
    }    
  }
}

exports.GET = get;
exports.PUT = put;
exports.DELETE = deleteFunction;