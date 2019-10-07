'use strict';

const FLOW_COLLECTION           = 'state-conductor-flow';
const FLOW_STATE_PROP_NAME      = 'state-conductor-status';
const FLOW_PROVENANCE_PROP_NAME = 'state-conductor-status-event';
const FLOW_STATE_WORKING        = 'working';
const FLOW_STATE_COMPLETE       = 'complete';

const sortFn = (prop, dir = 'desc') => ((a, b) => {
  let p1 = a[prop] || 0;
  let p2 = b[prop] || 0;
  return (dir === 'desc') ? p2 - p1 : p1 - p2;
});

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
    cts.elementValueQuery(fn.QName('', FLOW_STATE_PROP_NAME), FLOW_STATE_WORKING)
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
      .filter(prop => prop.firstChild.nodeValue === FLOW_STATE_WORKING)
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
function setFlowStatus(uri, flowName, stateName, status = FLOW_STATE_WORKING) {
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
function checkFlowContext(uri, { context = [] }) {
  if (fn.docAvailable(uri)) {
    const cols = xdmp.documentGetCollections(uri);
    const match = context.reduce((acc, ctx) => {
      let isMatch = false;
      if (ctx.domain === 'collection') {
        // does this document have the proper collection
        isMatch = cols.includes(ctx.value);
      } else if (ctx.domain === 'directory') {
        // is this document within the proper directory
        isMatch = fn.head(cts.uris('', null, cts.andQuery([
          cts.directoryQuery(ctx.value, 'infinity'),
          cts.documentQuery(uri)
        ]))) === uri;
        // TODO
      } else if (ctx.domain === 'query') {
        // TODO
      }
      return acc || isMatch;
    }, false);
    return match;
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
 * Give a document, a flow, and the state in that flow, perform all actions for that state.
 *
 * @param {*} uri
 * @param {*} flow
 * @param {*} stateName
 */
function performStateActions(uri, flow, stateName) {
  const state = flow.states.filter(state => state.stateName === stateName)[0];
  if (state) {
    xdmp.log(`executing actions for state: ${stateName}`);
    state.actions.sortFn('priority').forEach(action => {
      executeModule(action.actionModule, uri, flow);
    });
  } else {
    fn.error(null, 'state not found', Sequence.from([`state "${stateName}" not found in flow`]));
  }
}

function executeModule(modulePath, uri, flow) {
  try {
    xdmp.invoke(modulePath, {
      uri: uri,
      flow: flow
    }, {
      database: xdmp.database(flow.contentDatabase),
      modules: xdmp.database(flow.modulesDatabase),
      isolation: 'same-statement'
    });
  } catch (err) {
    xdmp.log([`An error occured invoking module "${modulePath}"`, err]);
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

  if (!inTerminalState(uri, flow)) {
    let currState = flow.states.filter(state => state.stateName === currStateName)[0];  
    let transitions = currState.transitions.sort(sortFn('priority'));

    // find the target transition
    let target = null;
    transitions.forEach(trans => {
      if (!target) {
        if (trans.conditionModule) {
          let resp = executeModule(trans.conditionModule, uri, flow);
          target = resp ? trans.targetState : null;
        } else {
          target = trans.targetState;
        }
      }
    });

    // perform the transition
    if (target) {
      setFlowStatus(uri, flow.flowName, target);
      addProvenanceEvent(uri, flow.flowName, currStateName, target);
    } else {
      fn.error(null, 'No conditional or default transtion performed', Sequence.from([
        `uri:"${uri}"`,
        `flow:"${flow.flowName}"`,
        `state:"${currStateName}"`
      ]));
    }
  } else {
    setFlowStatus(uri, flow.flowName, currStateName, FLOW_STATE_COMPLETE);
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
  let currState = flow.states.filter(state => state.stateName === currStateName)[0];
  return !currState || !currState.transitions || currState.transitions.length === 0;
}


module.exports = {
  addProvenanceEvent,
  checkFlowContext,
  executeStateTransition,
  getApplicableFlows,
  getInProcessFlows,
  getFlowDocument,
  getFlowDocuments,
  getFlowState,
  getFlowStatus,
  inTerminalState,
  isDocumentInProcess,
  performStateActions,
  setFlowStatus
};