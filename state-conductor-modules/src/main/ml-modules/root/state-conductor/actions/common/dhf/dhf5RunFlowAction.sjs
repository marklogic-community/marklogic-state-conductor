const DataHubSingleton = require('/data-hub/5/datahub-singleton.sjs');
const datahub = DataHubSingleton.instance();

const sc = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}, context = {}) {
  // find the dhf flow to execute
  const flowName = options.flowName || null;
  const flowOptions = options.flowOptions || {};
  const flowContext = options.flowContext || {};
  const flow = datahub.flow.getFlow(flowName);

  flowOptions.stateConductorContext = context;
  if (!flow) {
    fn.error(null, 'DHF-FLOW-NOT-FOUND', Sequence.from([`DHF flow "${flowName}" not found.`]));
  }

  // get the steps for the given flow
  const numSteps = Object.keys(flow.steps).length;

  xdmp.trace(
    sc.TRACE_EVENT,
    Sequence.from([
      'Execute DHF flow:',
      '  uri:         ' + uri,
      '  flowName:    ' + flowName,
      '  numSteps:    ' + numSteps,
      '  flowOptions: ' + flowOptions,
      '  flowContext: ' + flowContext,
    ])
  );

  const resp = {};

  // execute the flow's steps in sequence
  for (let i = 1; i <= numSteps; i++) {
    // setup the dhf runFlow content
    const contentObj = {
      uri: uri,
      context: flowContext,
      value: fn.head(xdmp.invokeFunction(() => cts.doc(uri))),
    };
    // execute the flows step
    xdmp.log(`Executing Flow: "${flowName}" Step: "${i}"`);
    let flowResponse = fn.head(
      xdmp.invokeFunction(() => {
        return datahub.flow.runFlow(flowName, null, [contentObj], flowOptions, i);
      })
    );
    // abort on error
    if (flowResponse.errors && flowResponse.errors.length) {
      datahub.debug.log(flowResponse.errors[0]);
      fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
    }

    resp['' + i] = flowResponse;
  }

  context[flowName] = resp;

  return context;
}

exports.performAction = performAction;
