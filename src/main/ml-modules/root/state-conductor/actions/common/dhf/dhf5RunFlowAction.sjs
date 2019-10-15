const DataHub = require('/data-hub/5/datahub.sjs');
const datahub = new DataHub();

var uri;
var options;

function performAction(uri, options = {}) {
  const doc = cts.doc(uri);

  // find the dhf flow to execute
  const flowName = options.flowName || doc.root.flowName || null;
  const flowOptions = options.flowOptions || doc.root.flowOptions || {};
  const flow = datahub.flow.getFlow(flowName);

  if (!flow) {
    fn.error(null, 'DHF-FLOW-NOT-FOUND', Sequence.from([`DHF flow "${flowName}" not found.`]));
  }

  // get the steps for the given flow
  const numSteps = Object.keys(flow.steps).length;

  // setup the dhf runFlow content
  const content = {
    uri: uri,
    value: doc
  };

  xdmp.log(Sequence.from([
    'Execute DHF flow:',
    '  uri:         ' + uri,
    '  flowName:    ' + flowName,
    '  numSteps:    ' + numSteps,
    '  flowOptions: ' + flowOptions,
  ]), 'debug');

  // execute the flow's steps in sequence
  for (let i = 1; i <= numSteps; i++) {
    // execute the flows step
    const flowResponse = datahub.flow.runFlow(flowName, null, [content], flowOptions, i);
    // abort on error
    if (flowResponse.errors && flowResponse.errors.length) {
      datahub.debug.log(flowResponse.errors[0]);
      fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
    }
    xdmp.log(flowResponse, 'debug');  
  }

  // TODO what to return?
  return fn.true();
}

performAction(uri, options);