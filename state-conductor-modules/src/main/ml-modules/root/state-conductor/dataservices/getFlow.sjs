'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

var flowName;

let result;
if (flowName) {
  result = getFlowDetail(flowName);
}
else {
  result = getAllFlows();
}
result

/**
 * Get a single flow by name
 *
 * @param {string} flowName The name of the flow to be returned
 */
function getFlowDetail(flowName) {
  const flow = sc.getFlowDocument(flowName);
  if (flow) {
    return flow;
  }
  else {
    fn.error(xs.QName("ERROR"), `Flow file "${flowName}" not found`);
  }
}

/**
 * Get all available flows
 */
function getAllFlows() {
  const flows = sc.getFlowDocuments();
  return flows.toArray().reduce((acc, flow) => {
      let name = sc.getFlowNameFromUri(fn.documentUri(flow));
      acc[name] = flow.toObject();
      return acc;
    }, {});
}
