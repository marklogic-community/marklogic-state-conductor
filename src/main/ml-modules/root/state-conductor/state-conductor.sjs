'use strict';

const TRACE_EVENT = 'state-conductor';

const FLOW_FILE_EXTENSION       = '.asl.json';
const FLOW_COLLECTION           = 'state-conductor-flow';
const FLOW_DIRECTORY            = '/state-conductor-flow/';
const FLOW_STATE_PROP_NAME      = 'state-conductor-status';
const FLOW_PROVENANCE_PROP_NAME = 'state-conductor-status-event';
const FLOW_STATUS_WORKING       = 'working';
const FLOW_STATUS_COMPLETE      = 'complete';

const SUPPORTED_STATE_TYPES = [
  'choice',
  'fail', 
  'pass', 
  'succeed', 
  'task'
];

const parseSerializedQuery = (serializedQuery) => {
  return cts.query(fn.head(xdmp.fromJsonString(serializedQuery)));
};

/**
 * Gets a flow definition by flowName
 *
 * @param {*} name
 * @returns
 */
function getFlowDocument(name) {
  name = fn.normalizeSpace(name) + FLOW_FILE_EXTENSION;
  const uri = fn.head(cts.uriMatch('*' + name,
    [
      'document',
      'case-sensitive'
    ],
    cts.collectionQuery(FLOW_COLLECTION)
  ));
  return uri ? cts.doc(uri) : null;
}

/**
 * Gets all flow definition documents
 *
 * @returns
 */
function getFlowDocuments() {
  return fn.collection(FLOW_COLLECTION);
}


/**
 * Given a flow definition URI, determine it's flow name
 *
 * @param {*} uri
 * @returns
 */
function getFlowNameFromUri(uri) {
  uri = uri.toString(); 
  uri = uri.slice(uri.lastIndexOf('/') + 1);
  return uri.lastIndexOf(FLOW_FILE_EXTENSION) !== -1 ? uri.slice(0, uri.lastIndexOf(FLOW_FILE_EXTENSION)) : uri;
}

/**
 * Returns the initial state for the given state machine definition
 *
 * @param {*} { flowName, StartAt }
 * @returns
 */
function getInitialState({ flowName, StartAt }) {
  if (!StartAt || StartAt.length === 0) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `no "StartAt" defined for state machine "${flowName}"`);
  }
  return StartAt;
}

/**
 * Gets the flow-conductor-status property for the given flowName
 *
 * @param {*} uri
 * @param {*} flowName
 * @returns
 */
function getFlowStatusProperty(uri, flowName) {
  if (fn.docAvailable(uri)) {
    return xdmp.documentGetProperties(uri, fn.QName('', FLOW_STATE_PROP_NAME))
      .toArray()
      .filter(prop => prop.getAttributeNode('flow-name').nodeValue === flowName)[0];
  }
}

/**
 * Determines if this document is being processed by any state conductor flow
 * <state-conductor-status flow="flow-name" state="state-name">flow-status</state-conductor-status>
 * @param {*} uri
 * @returns
 */
function isDocumentInProcess(uri) {
  return cts.contains(
    xdmp.documentProperties(uri), 
    cts.elementValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), FLOW_STATUS_WORKING)
  );
}


/**
 * Gets the flowName for each flow currently processing this document
 *
 * @param {*} uri
 * @returns
 */
function getInProcessFlows(uri) {
  if (fn.docAvailable(uri)) {
    return xdmp.documentGetProperties(uri, fn.QName('', FLOW_STATE_PROP_NAME))
      .toArray()
      .filter(prop => prop.firstChild.nodeValue === FLOW_STATUS_WORKING)
      .map(prop => prop.getAttributeNode('flow-name').nodeValue);
  }
}

/**
 * Sets this document's flow status for the given flow
 *
 * @param {*} uri
 * @param {*} flowName
 * @param {*} stateName
 * @param {*} status
 */
function setFlowStatus(uri, flowName, stateName, status = FLOW_STATUS_WORKING) {
  declareUpdate();
  const existingStatusProp = getFlowStatusProperty(uri, flowName);
  const builder = new NodeBuilder();
  builder.startElement(FLOW_STATE_PROP_NAME);
  builder.addAttribute('flow-name', flowName);
  builder.addAttribute('state-name', stateName);
  builder.addText(status);
  builder.endElement();
  let statusElem = builder.toNode();
  
  if (existingStatusProp) {
    // replace the exsting property
    xdmp.nodeReplace(existingStatusProp, statusElem);
  } else {
    // insert the new property
    xdmp.documentAddProperties(uri, [statusElem]);
  }
}

function addProvenanceEvent(uri, flowName, currState = '', nextState = '') {
  const builder = new NodeBuilder();
  builder.startElement(FLOW_PROVENANCE_PROP_NAME);
  builder.addAttribute('date', (new Date()).toISOString());
  builder.addAttribute('flow-name', flowName);
  builder.addAttribute('from', currState);
  builder.addAttribute('to', nextState);
  builder.endElement();
  let newEvent = builder.toNode();
  xdmp.documentAddProperties(uri, [newEvent]);
}

/**
 * Gets the document's state in the given flow
 *
 * @param {*} uri
 * @param {*} flowName
 * @returns
 */
function getFlowState(uri, flowName) {
  const statusProp = getFlowStatusProperty(uri, flowName);
  return statusProp ? statusProp.getAttributeNode('state-name').nodeValue : null;
}

/**
 * Gets the document's status in the given flow
 *
 * @param {*} uri
 * @param {*} flowName
 * @returns
 */
function getFlowStatus(uri, flowName) {
  const statusProp = getFlowStatusProperty(uri, flowName);
  return statusProp ? statusProp.firstChild.nodeValue : null;
}

/**
 * Determines if the given document matches the given flow's context
 *
 * @param {*} uri
 * @param {*} flow
 * @returns
 */
function checkFlowContext(uri, flow) {
  if (fn.docAvailable(uri)) {
    const query = getFlowContextQuery(flow);
    const uris = cts.uris('', null, cts.andQuery([
      cts.documentQuery(uri),
      query
    ]));
    return uri === fn.string(fn.head(uris));
  }

  return false;
}

/**
 * Given a document's uri, finds all the flows whose context applies,
 * and which have not previously processed this document.
 *
 * @param {*} uri
 * @returns
 */
function getApplicableFlows(uri) {
  const flows = getFlowDocuments().toArray().filter(flow => {
    let flowName = getFlowNameFromUri(fn.documentUri(flow));
    let flowOjb = flow.toObject();
    return !getFlowStatus(uri, flowName) && checkFlowContext(uri, flowOjb);
  });

  return flows;
}


/**
 * Given a flow, generate a cts query for it's context
 *
 * @param {*} flow
 * @returns
 */
function getFlowContextQuery(flow) {
  const domain = flow.mlDomain;
  const context = domain.context || [];
  let queries = context.map(ctx => {
    if (ctx.scope === 'collection') {
      return cts.collectionQuery(ctx.value);
    } else if (ctx.scope === 'directory') {
      return cts.directoryQuery(ctx.value, 'infinity');
    } else if (ctx.scope === 'query') {
      return parseSerializedQuery(ctx.value);
    }
    return cts.falseQuery();
  });

  if (queries.length > 1) {
    queries = cts.orQuery(queries);
  } else {
    queries = queries.pop();
  }

  return queries;
}


/**
 * Generate a cts query matching the context of all flows
 *
 * @returns
 */
function getAllFlowsContextQuery() {
  let queries = getFlowDocuments().toArray().map(flow => getFlowContextQuery(flow.toObject()));

  if (queries.length === 0) {
    queries = cts.falseQuery();
  } else if (queries.length === 1) {
    queries = queries.pop();
  } else {
    queries = cts.orQuery(queries);
  }

  return queries;
}

/**
 * Given a document, a flow, and the state in that flow, perform all actions for that state.
 *
 * @param {*} uri
 * @param {*} flow
 * @param {*} stateName
 */
function performStateActions(uri, flow, stateName) {
  const state = flow.States[stateName];
  if (state) {
    if (state.Type && state.Type.toLowerCase() === 'task') {
      xdmp.trace(TRACE_EVENT, `executing action for state: ${stateName}`);

      if (state.Resource) {
        executeModule(state.Resource, uri, state.Parameters, flow);
      } else {
        fn.error(null, 'INVALID-STATE-DEFINITION', `no "Resource" defined for Task state "${stateName}"`);
      }
    }
  } else {
    fn.error(null, 'state not found', Sequence.from([`state "${stateName}" not found in flow`]));
  }
}

function executeModule(modulePath, uri, options, flow) {
  return xdmp.invoke(modulePath, {
    uri: uri,
    options: options,
    flow: flow
  }, {
    database: xdmp.database(flow.mlDomain.contentDatabase),
    modules: xdmp.database(flow.mlDomain.modulesDatabase),
    isolation: 'same-statement'
  });
}

/**
 * Peforms a state transition for the given flow on the given document.
 * If the document is in a terminal state, it marks the flow as complete.
 * Executes condition modules to determin which state to transition too.
 *
 * @param {*} uri
 * @param {*} flow
 */
function executeStateTransition(uri, flowName, flow) {
  const currStateName = getFlowState(uri, flowName);
  xdmp.trace(TRACE_EVENT, `executing transtions for state: ${currStateName}`);

  if (!inTerminalState(uri, flowName, flow)) {
    let currState = flow.States[currStateName];  
    
    // find the target transition
    let target = null;
    
    if ('task' === currState.Type.toLowerCase()) {
      target = currState.Next;
    } else if ('pass' === currState.Type.toLowerCase()) {
      target = currState.Next;
    } else if ('choice' === currState.Type.toLowerCase()) {
      if (currState.Choices && currState.Choices.length > 0) {
        currState.Choices.forEach(choice => {
          if (!target) {
            if (choice.Resource) {
              let resp = fn.head(executeModule(choice.Resource, uri, choice.Parameters, flow));
              target = resp ? choice.Next : null;
            } else {
              fn.error(null, 'INVALID-STATE-DEFINITION', `Choices defined without "Resource" in state "${currStateName}"`);  
            }
          }
        });
        target = target || currState.Default;
      } else {
        fn.error(null, 'INVALID-STATE-DEFINITION', `no "Choices" defined for Choice state "${currStateName}"`);  
      }
    } else {
      fn.error(null, 'INVALID-STATE-DEFINITION', `unsupported transition from state type "${currState.Type}"`);
    }

    // perform the transition
    if (target) {
      setFlowStatus(uri, flowName, target);
      addProvenanceEvent(uri, flowName, currStateName, target);
    } else {
      fn.error(null, 'INVALID-STATE-DEFINITION', `No suitable transition found in non-terminal state "${currStateName}"`);
    }
  } else {
    setFlowStatus(uri, flowName, currStateName, FLOW_STATUS_COMPLETE);
    addProvenanceEvent(uri, flowName, currStateName, 'COMPLETED');
  }
}


/**
 * Processes a caught error for "Task" and "Choice" states
 * Uses "Choices" to transition to a failure state
 *
 * @param {*} uri
 * @param {*} flowName
 * @param {*} flow
 * @param {*} stateName
 * @param {*} err
 * @returns
 */
function handleStateFailure(uri, flowName, flow, stateName, err) {
  const currState = flow.States[stateName];
  xdmp.trace(TRACE_EVENT, `handling state failures for state: ${stateName}`);

  if ('task' === currState.Type.toLowerCase() || 'choice' === currState.Type.toLowerCase()) {
    if (currState.Catch && currState.Catch.length > 0) {
      // find a matching fallback state
      let target = currState.Catch.reduce((acc, fallback) => {
        if (!acc) {
          if (
            fallback.ErrorEquals.includes(err.name) ||
            fallback.ErrorEquals.includes('States.ALL') ||
            fallback.ErrorEquals.includes('*')
          ) {
            acc = fallback.Next;
          }
        }
        return acc;
      }, null);
      
      if (target) {
        xdmp.trace(TRACE_EVENT, `transitioning to fallback state "${target}"`);
        setFlowStatus(uri, flowName, target);
        addProvenanceEvent(uri, flowName, stateName, target);
        return;
      }
    }
  }
  // unhandled exception
  xdmp.trace(TRACE_EVENT, `no Catch defined for error "${err.name}" in state "${stateName}"`);
  fn.error(null, 'INVALID-STATE-DEFINITION', Sequence.from([
    `Unhandled exception of type ${err.name} in state "${stateName}`,
    err
  ]));
}

/**
 * Determines if the given document is in terminal (final) state for the given flow
 *
 * @param {*} uri
 * @param {*} flow
 * @returns
 */
function inTerminalState(uri, flowName, flow) {
  const currStateName = getFlowState(uri, flowName);
  let currState = flow.States[currStateName];
  
  if (currState && !SUPPORTED_STATE_TYPES.includes(currState.Type.toLowerCase())) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `unsupported state type: "${currState.Type}"`);
  }
  //return !currState || !currState.transitions || currState.transitions.length === 0;
  return (
    !currState || 
    currState.Type.toLowerCase() === 'succeed' ||
    currState.Type.toLowerCase() === 'fail' ||
    (currState.Type.toLowerCase() === 'task' && currState.End === true)
  );
}

/**
 * Calculates the state of documents being processed by, and completed through this flow
 *
 * @param {*} flowName
 * @returns
 */
function getFlowCounts(flowName) {
  const flow = getFlowDocument(flowName).toObject();
  const states = Object.keys(flow.States);

  const numInStatus = (status) => fn.count(
    cts.uris('', 'properties', 
      cts.elementQuery(fn.QName('', FLOW_STATE_PROP_NAME), cts.andQuery([
        cts.elementAttributeValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), fn.QName('', 'flow-name'), flowName),
        cts.elementValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), status)
      ]))
    )
  );

  const numInState = (status, state) => fn.count(
    cts.uris('', 'properties', 
      cts.elementQuery(fn.QName('', FLOW_STATE_PROP_NAME), cts.andQuery([
        cts.elementAttributeValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), fn.QName('', 'flow-name'), flowName),
        cts.elementAttributeValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), fn.QName('', 'state-name'), state),
        cts.elementValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), status)
      ]))
    )
  );

  let numComplete = numInStatus(FLOW_STATUS_COMPLETE);
  let numWorking = numInStatus(FLOW_STATUS_WORKING);

  const resp = {
    flowName: flowName,
    totalComplete: numComplete,
    totalWorking: numWorking
  };

  resp[FLOW_STATUS_WORKING] = {};
  resp[FLOW_STATUS_COMPLETE] = {};

  [FLOW_STATUS_WORKING, FLOW_STATUS_COMPLETE].forEach(status => {
    states.forEach(state => {
      resp[status][state] = numInState(status, state);
    });
  });  

  return resp;
}


/**
 * Convienence function to create a json record for a batch of documents to be
 * processed by state conductor flows.  The created document contains a "uris"
 * array, and context object.  The document is created in the "/batch"
 * directory with the "stateConductorBatch" collection
 *
 * @param {*} [uris=[]]
 * @param {*} [context={}]
 * @param {*} [options={}]
 */
function createBatchRecord(uris = [], context = {}, options = {}) {
  const collections = ['stateConductorBatch'].concat(options.collections || []);
  const directory = options.directory || '/batch/';
  
  const id = sem.uuidString();
  const batchUri = directory + id + '.json';

  const batch = {
    id: id,
    uris: uris,
    createdDate: (new Date()).getTime(),
    context: context
  };

  xdmp.log(`inserting batch document: ${batchUri}`);
  xdmp.documentInsert(batchUri, batch, {
    collections: collections
  });
}

module.exports = {
  TRACE_EVENT,
  FLOW_COLLECTION,
  FLOW_DIRECTORY,
  addProvenanceEvent,
  checkFlowContext,
  createBatchRecord,
  executeStateTransition,
  getApplicableFlows,
  getInitialState,
  getInProcessFlows,
  getFlowCounts,
  getFlowDocument,
  getFlowDocuments,
  getFlowNameFromUri,
  getFlowState,
  getFlowStatus,
  handleStateFailure,
  inTerminalState,
  isDocumentInProcess,
  performStateActions,
  setFlowStatus,
  getAllFlowsContextQuery,
  getFlowContextQuery
};