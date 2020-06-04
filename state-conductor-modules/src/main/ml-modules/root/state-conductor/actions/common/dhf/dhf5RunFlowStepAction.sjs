const DataHub = require('/data-hub/5/datahub.sjs');
const datahub = new DataHub();

function performAction(uri, options = {}, context = {}) {
  // find the dhf flow and step to execute
  const step = options.step || null;
  const flowName = options.flowName || null;
  const flowOptions = options.flowOptions || {};
  const flowContext = options.flowContext || {};

  flowOptions.stateConductorContext = context;

  // setup the dhf runFlow content
  const contentObjs = {
    uri: uri,
    context: flowContext,
    value: fn.head(xdmp.invokeFunction(() => cts.doc(uri))),
  };

  xdmp.log(
    Sequence.from([
      'Execute DHF flow:',
      '  uri:         ' + uri,
      '  flowName:    ' + flowName,
      '  step:        ' + step,
      '  flowOptions: ' + flowOptions,
      '  flowContext: ' + flowContext,
    ])
  );

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

  context[flowName] = context[flowName] || {};
  context[flowName]['' + step] = flowResponse;

  return context;
}

exports.performAction = performAction;
