'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

var flowName;

deleteFlow(flowName);

/**
 * Delete a flow
 *
 * @param {string} flowName Name of the flow to be deleted
 */
function deleteFlow(flowName) {
  const cleanFlowName = flowName ? flowName.trim() : '';
  if (cleanFlowName === '') {
    fn.error(xs.QName("ERROR"), `Missing parameter "flowName"`);
  }
  const flow = sc.getFlowDocument(cleanFlowName);
  if(!flow) {
    fn.error(xs.QName("ERROR"), `Flow File "${cleanFlowName}" not found`);
  }
  const uri = fn.documentUri(flow);
  xdmp.documentDelete(uri);
}
