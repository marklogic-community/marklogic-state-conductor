const DataHub = require('/data-hub/5/datahub.sjs');
const datahub = new DataHub();

var uri;
var options;

function performAction(uri, options = {}) {
  const doc = cts.doc(uri);

  // find the dhf flow and step to execute
  const step = options.step || doc.root.step || null;
  const flowName = options.flowName || doc.root.flowName || null;
  const flowOptions = options.flowOptions || doc.root.flowOptions || {};

  // setup the dhf runFlow content
  const content = {
    uri: uri,
    value: doc
  };

  xdmp.log(Sequence.from([
    'Execute DHF flow:',
    '  uri:         ' + uri,
    '  flowName:    ' + flowName,
    '  step:        ' + step,
    '  flowOptions: ' + flowOptions,
  ]), 'debug');

  // execute the dhf flow step
  const flowResponse = datahub.flow.runFlow(flowName, null, [content], flowOptions, step);

  if (flowResponse.errors && flowResponse.errors.length) {
    datahub.debug.log(flowResponse.errors[0]);
    fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
  }

  xdmp.log(flowResponse, 'debug');
  return flowResponse;
}

performAction(uri, options);