const DataHub = require('/data-hub/5/datahub.sjs');
const datahub = new DataHub();

// THIS OPERATES ON A BATCH OF URIS
function performAction(uri, options = {}) {
  const doc = cts.doc(uri);
  const batch = doc.toObject();
  const context = batch.context || {};

  // find the dhf flow to execute
  const flowName = options.flowName || context.flowName || null;
  const flowOptions = options.flowOptions || context.flowOptions || {};
  const flow = datahub.flow.getFlow(flowName);

  if (!flow) {
    fn.error(null, 'DHF-FLOW-NOT-FOUND', Sequence.from([`DHF flow "${flowName}" not found.`]));
  }

  // get the steps for the given flow
  const numSteps = Object.keys(flow.steps).length;

  // setup the dhf runFlow content
  const contentObjs = batch.uris.map(uri => {  
    return {
      uri: uri,
    };  
  });

  xdmp.log(Sequence.from([
    'Execute DHF flow:',
    '  uri:         ' + uri,
    '  flowName:    ' + flowName,
    '  numSteps:    ' + numSteps,
    '  flowOptions: ' + flowOptions,
  ]));

  // execute the flow's steps in sequence
  for (let i = 1; i <= numSteps; i++) {
    // execute the flows step
    let flowResponse;
    xdmp.invokeFunction(() => {
      flowResponse = datahub.flow.runFlow(flowName, null, contentObjs, flowOptions, i);
    });
    // abort on error
    if (flowResponse.errors && flowResponse.errors.length) {
      datahub.debug.log(flowResponse.errors[0]);
      fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
    }
    xdmp.log(flowResponse);  
  }

  // TODO what to return?
  return fn.true();
}

exports.performAction = performAction;