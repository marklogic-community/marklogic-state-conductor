const DataHubSingleton = require('/data-hub/5/datahub-singleton.sjs');
const datahub = DataHubSingleton.instance();

const sc = require('/state-conductor/state-conductor.sjs');

/**
 * Creates a content descriptor array suitable for passing to the DataHub run step api.
 * Will generate descriptors for the passed in uri or for documents matching the step's "sourceQuery".
 *
 * Note: this implementation works with DHF 5.0.3-5.2.X.  It should be revisited for 5.4+ compabibility.
 *
 * @param {*} uri - uri of document to generate context object for - if null the step's "sourceQuery" will be used.
 * @param {*} flowName - DHF flow name
 * @param {*} stepNumber - step number of in the flow
 * @param {*} options - step options
 * @returns
 */
function getContentDescriptorArray(uri, flowName, stepNumber, options) {
  let flow = datahub.flow.getFlow(flowName);
  if (!flow)
    fn.error(null, 'MISSING-FLOW', `The flow with the name ${flowName} could not be found.`);
  let stepRef = flow.steps[stepNumber];
  if (!stepRef)
    fn.error(
      null,
      'MISSING-STEP',
      `Step ${stepNumber} for the flow: ${flowName} could not be found.`
    );

  let stepDetails = datahub.flow.step.getStepByNameAndType(
    stepRef.stepDefinitionName,
    stepRef.stepDefinitionType
  );
  let flowOptions = flow.options || {};
  let stepRefOptions = stepRef.options || {};
  let stepDetailsOptions = stepDetails.options || {};
  let combinedOptions = Object.assign({}, stepDetailsOptions, flowOptions, stepRefOptions, options);
  let sourceDatabase = combinedOptions.sourceDatabase || datahub.flow.globalContext.sourceDatabase;
  let sourceQuery = combinedOptions.sourceQuery || flow.sourceQuery;
  let query = uri
    ? cts.documentQuery(uri)
    : sourceQuery
    ? cts.query(fn.head(xdmp.eval(sourceQuery)).toObject())
    : null;

  let contentObjs = [];
  if (typeof datahub.hubUtils.queryToContentDescriptorArray === 'function') {
    // DHF >=5.2.X
    contentObjs = datahub.hubUtils.queryToContentDescriptorArray(
      query,
      combinedOptions,
      sourceDatabase
    );
  } else {
    // DHF 5.0.3
    xdmp.invokeFunction(
      () => {
        const results = cts.search(query, cts.indexOrder(cts.uriReference()));
        for (let doc of results) {
          contentObjs.push({
            uri: xdmp.nodeUri(doc),
            value: doc,
            context: {},
          });
        }
      },
      {
        update: 'false',
      }
    );
  }

  if (stepDetails.name === 'default-merging' && stepDetails.type === 'merging') {
    // merge step requires we grab the URIsToProcess values from the match summaries
    const urisPathReference = cts.pathReference('/matchSummary/URIsToProcess', [
      'type=string',
      'collation=http://marklogic.com/collation/',
    ]);
    const summaryUris = contentObjs.map((content) => content.uri);
    const uriValues = cts.values(urisPathReference, null, null, cts.documentQuery(summaryUris));
    contentObjs = uriValues.toArray().map((uri) => ({ uri }));
  }
  return contentObjs;
}

function performAction(uri, options = {}, context = {}) {
  // find the dhf flow and step to execute
  const jobId = options.jobId || null;
  const step = options.step || null;
  const flowName = options.flowName || null;
  const flowOptions = options.flowOptions || {};
  const flowContext = options.flowContext || {};

  flowOptions.stateConductorContext = context;

  let contentObjs = [];

  // setup the dhf runFlow content
  if (!options.useSourceQuery && uri) {
    // use the passed in uri
    contentObjs = getContentDescriptorArray(uri, flowName, step, flowOptions);
  } else {
    // use the source query
    contentObjs = getContentDescriptorArray(null, flowName, step, flowOptions);
  }

  xdmp.trace(
    sc.TRACE_EVENT,
    Sequence.from([
      'Execute DHF flow:',
      '  uri:         ' + uri,
      '  records:     ' + contentObjs.length,
      '  flowName:    ' + flowName,
      '  step:        ' + step,
      '  flowOptions: ' + JSON.stringify(flowOptions),
      '  flowContext: ' + JSON.stringify(flowContext),
    ])
  );

  // execute the dhf flow step
  // utilizing an invoke to avoid locking on the batched documents
  let flowResponse;
  xdmp.invokeFunction(() => {
    flowResponse = datahub.flow.runFlow(flowName, jobId, contentObjs, flowOptions, step);
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
