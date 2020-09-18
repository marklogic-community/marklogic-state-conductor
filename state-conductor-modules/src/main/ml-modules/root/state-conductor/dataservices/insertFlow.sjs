'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/flow-file-validator.sjs');

var flowName;
var flow;

insertFlow(flowName, flow);

/**
 * Create or update a flow
 *
 * @param {string} flowName Name of the flow to be created or updated
 * @param {object} flow Flow to be created or updated
 */
function insertFlow(flowName, flow) {
  const cleanFlowName = flowName ? flowName.trim() : '';
  if (cleanFlowName === '') {
    fn.error(xs.QName("ERROR"), `Missing parameter "flowName"`);
  }
  if(!flow || typeof flow != 'object') {
    fn.error(xs.QName("ERROR"), `Invalid parameter "flow"`);
  }
  if(!validator.validateFlowFile(flow)) {
    fn.error(xs.QName("ERROR"), `Invalid state-conductor flow`);
  }
  const uri = `${sc.FLOW_DIRECTORY}${cleanFlowName}.asl.json`;
  xdmp.documentInsert(uri, flow, {
    permissions: xdmp.defaultPermissions(),
    collections: [sc.FLOW_COLLECTION],
  });
}
