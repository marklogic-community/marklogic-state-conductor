const sc = require('/state-conductor/state-conductor.sjs');
const dhf5Ingestion = require('/data-hub/5/builtins/steps/ingestion/default/main.sjs');

function performAction(uri, options = {}, context = {}) {
  const doc = cts.doc(uri);

  // setup the dhf content
  const content = {
    uri: uri,
    value: doc,
  };

  xdmp.trace(
    sc.TRACE_EVENT,
    Sequence.from([
      'Execute DHF make envelope step:',
      '- uri:     ' + uri,
      '- options: ' + options,
    ])
  );

  // execute the dhf flow step
  const flowResponse = dhf5Ingestion.main(content, options);

  // capture any errors
  if (flowResponse.errors && flowResponse.errors.length) {
    fn.error(null, flowResponse.errors[0].message, flowResponse.errors[0].stack);
  }

  // save the enveloped response
  xdmp.log(flowResponse, 'debug');
  xdmp.nodeReplace(doc.root, flowResponse.value);

  // add optional collections
  if (options.collections) {
    xdmp.documentAddCollections(uri, options.collections);
  }

  context.makeEnvelope = flowResponse;

  return context;
}

exports.performAction = performAction;
