const DataHub = require('/data-hub/5/datahub.sjs');
const datahub = new DataHub();

// THIS OPERATES ON A BATCH OF URIS
function performAction(uri, options = {}) {
   
  // find the dhf flow and step to execute
  const step = options.step || null;
  const flowName = options.flowName || null;
  const flowOptions = options.flowOptions || {};
  const flowContext = options.flowContext || {};

  // setup the dhf runFlow content
  const contentObjs = {
    uri: uri,
    context: flowContext
  };

  xdmp.log(Sequence.from([
    'Execute DHF flow:',
    '  uri:         ' + uri,
    '  flowName:    ' + flowName,
    '  step:        ' + step,
    '  flowOptions: ' + flowOptions,
    '  flowContext: ' + flowContext
  ]));

  // execute the dhf flow step
  // utilizing an invoke to avoid locking on the batched documents
  let flowResponse;
  xdmp.invokeFunction(() => {
    flowResponse = datahub.flow.runFlow(flowName, null, [contentObjs], flowOptions, step);
  });

  if (flowResponse.errors && flowResponse.errors.length) {
    datahub.debug.log(flowResponse.errors[0]);
    fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
  }

  xdmp.log(flowResponse);
  
  return flowResponse;
}

exports.performAction = performAction;