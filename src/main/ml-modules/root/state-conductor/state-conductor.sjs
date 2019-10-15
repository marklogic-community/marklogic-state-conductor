'use strict';

const FLOW_COLLECTION           = 'state-conductor-flow';
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
  return fn.head(cts.search(
    cts.andQuery([
      cts.collectionQuery(FLOW_COLLECTION),
      cts.jsonPropertyValueQuery('flowName', name)
    ])
  ));
}

/**
 * Gets all flow definition documents
 *
 * @returns
 */
function getFlowDocuments() {
  return fn.collection('state-conductor-flow');
}


/**
 * Returns the initial state for the given state machine definition
 *
 * @param {*} { flowName, StartAt }
 * @returns
 */
function getInitialState({ flowName, StartAt }) {
  if (!StartAt || StartAt.length === 0) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `no "StartAt" defined for state machine"${flowName}"`);
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
    let flowOjb = flow.toObject();
    return !getFlowStatus(uri, flowOjb.flowName) && checkFlowContext(uri, flowOjb);
  });

  return flows;
}


/**
 * Given a flow, generate a cts query for it's context
 *
 * @param {*} {context = []}
 * @returns
 */
function getFlowContextQuery({context = []}) {
  let queries = context.map(ctx => {
    if (ctx.domain === 'collection') {
      return cts.collectionQuery(ctx.value);
    } else if (ctx.domain === 'directory') {
      return cts.directoryQuery(ctx.value, 'infinity');
    } else if (ctx.domain === 'query') {
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
      xdmp.log(`executing action for state: ${stateName}`);

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
  try {
    return xdmp.invoke(modulePath, {
      uri: uri,
      options: options,
      flow: flow
    }, {
      database: xdmp.database(flow.contentDatabase),
      modules: xdmp.database(flow.modulesDatabase),
      isolation: 'same-statement'
    });
  } catch (err) {
    xdmp.log(Sequence.from([`An error occured invoking module "${modulePath}"`, err]), 'error');
  }
}

/**
 * Peforms a state transition for the given flow on the given document.
 * If the document is in a terminal state, it marks the flow as complete.
 * Executes condition modules to determin which state to transition too.
 *
 * @param {*} uri
 * @param {*} flow
 */
function executeStateTransition(uri, flow) {
  const currStateName = getFlowState(uri, flow.flowName);
  xdmp.log(`executing transtions for state: ${currStateName}`);

  if (!inTerminalState(uri, flow)) {
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
      setFlowStatus(uri, flow.flowName, target);
      addProvenanceEvent(uri, flow.flowName, currStateName, target);
    } else {
      fn.error(null, 'INVALID-STATE-DEFINITION', `No suitable transition found in non-terminal state "${currStateName}"`);
    }
  } else {
    setFlowStatus(uri, flow.flowName, currStateName, FLOW_STATUS_COMPLETE);
    addProvenanceEvent(uri, flow.flowName, currStateName, 'COMPLETED');
  }
}

/**
 * Determines if the given document is in terminal (final) state for the given flow
 *
 * @param {*} uri
 * @param {*} flow
 * @returns
 */
function inTerminalState(uri, flow) {
  const currStateName = getFlowState(uri, flow.flowName);
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


module.exports = {
  addProvenanceEvent,
  checkFlowContext,
  executeStateTransition,
  getApplicableFlows,
  getInitialState,
  getInProcessFlows,
  getFlowDocument,
  getFlowDocuments,
  getFlowState,
  getFlowStatus,
  inTerminalState,
  isDocumentInProcess,
  performStateActions,
  setFlowStatus,
  getAllFlowsContextQuery,
  getFlowContextQuery
};