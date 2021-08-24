'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

var uri;
var trigger;

const DATABASE_NAME = xdmp.databaseName(xdmp.database());
const FIELD_CTX_QUERY_ID = `STATE-CONDUCTOR-CTX-QUERY-${xdmp.database()}`;
const FIELD_ALLSM_CTX_QUERY_ID = `STATE-CONDUCTOR-ALLSM-CTX-QUERY-${xdmp.database()}`;
const FIELD_CTX_QUERY_TIMESTAMP = `STATE-CONDUCTOR-CTX-QUERY-TIMESTAMP-${xdmp.database()}`;
const FIELD_CTX_QUERY_TIMEOUT = 300000; // milliseconds (5 mins)

function executeContextRegQuery(uri, regQueryId) {
  return cts.uris(
    '',
    'limit=1',
    cts.andQuery([cts.documentQuery(uri), cts.registeredQuery(regQueryId, 'unfiltered')])
  );
}

function registerCtxQuery() {
  let query = sc.getAllStateMachinesContextQuery();
  let regCtxQueryId = cts.register(query);
  xdmp.setServerField(FIELD_CTX_QUERY_ID, regCtxQueryId);
  xdmp.setServerField(FIELD_CTX_QUERY_TIMESTAMP, new Date().getTime());
  return regCtxQueryId;
}

function registerAllStateMachineCtxQuery() {
  const regQueryMap = {};
  sc.getStateMachines()
    .toArray()
    .forEach((stateMachine) => {
      let name = sc.getStateMachineNameFromUri(fn.documentUri(stateMachine));
      let query = sc.getStateMachineContextQuery(stateMachine.toObject());
      regQueryMap[name] = cts.register(query);
    });
  xdmp.setServerField(FIELD_ALLSM_CTX_QUERY_ID, JSON.stringify(regQueryMap));
  xdmp.setServerField(FIELD_CTX_QUERY_TIMESTAMP, new Date().getTime());
  return regQueryMap;
}

function getCtxRegQueryId() {
  let regCtxQueryId = fn.head(xdmp.getServerField(FIELD_CTX_QUERY_ID));
  let timestamp = fn.head(xdmp.getServerField(FIELD_CTX_QUERY_TIMESTAMP));
  let curr = new Date().getTime();

  if (!regCtxQueryId || curr > timestamp + FIELD_CTX_QUERY_TIMEOUT) {
    xdmp.trace(
      sc.TRACE_EVENT,
      `registered context query not found or timestamp expired - registering new context query (${DATABASE_NAME})`
    );
    regCtxQueryId = registerCtxQuery();
  }

  return regCtxQueryId;
}

function getAllStateMachineRegQueryMap() {
  let regAllCtxQueryMap = fn.head(xdmp.getServerField(FIELD_ALLSM_CTX_QUERY_ID));
  let timestamp = fn.head(xdmp.getServerField(FIELD_CTX_QUERY_TIMESTAMP));
  let curr = new Date().getTime();

  if (!regAllCtxQueryMap || curr > timestamp + FIELD_CTX_QUERY_TIMEOUT) {
    xdmp.trace(
      sc.TRACE_EVENT,
      `all state-machines registered context query not found or timestamp expired - registering new context query for all state-machines (${DATABASE_NAME})`
    );
    regAllCtxQueryMap = registerAllStateMachineCtxQuery();
  } else {
    regAllCtxQueryMap = JSON.parse(regAllCtxQueryMap);
  }

  return regAllCtxQueryMap;
}

function checkUriAgainstContext(uri) {
  let resp = null;
  let regCtxQueryId = getCtxRegQueryId();

  try {
    // attempt to use the registered query
    resp = executeContextRegQuery(uri, regCtxQueryId);
  } catch (err) {
    if (err.name === 'XDMP-UNREGISTERED') {
      xdmp.trace(
        sc.TRACE_EVENT,
        `registered query not found - reregistering context query (${DATABASE_NAME})`
      );
      // need to register a new query
      regCtxQueryId = registerCtxQuery();
      // execute the query
      resp = executeContextRegQuery(uri, regCtxQueryId);
    } else {
      xdmp.rethrow();
    }
  }

  // does this uri match the stateMachine context?
  return uri === fn.string(fn.head(resp));
}

function checkUriAgainstStateMachineContext(uri, name, ctxQueryId) {
  let match = false;
  try {
    // does this uri match this stateMachine's context?
    // attempt to use the registered query
    match = fn.count(executeContextRegQuery(uri, ctxQueryId)) === 1;
    // check if this has already been processed by this state-machine
    match = match && sc.getExecutionIds(uri, name).length === 0;
  } catch (err) {
    xdmp.trace(
      sc.TRACE_EVENT,
      `error executing registered query "${ctxQueryId}" (${DATABASE_NAME})`
    );
  }

  return match;
}

xdmp.trace(sc.TRACE_EVENT, `state-conductor-item-trigger check for "${uri}"`);

// does this doc match any state-conductor stateMachines' context?
if (checkUriAgainstContext(uri)) {
  // check the doc against each registered state machine context
  const ctxQueryMap = getAllStateMachineRegQueryMap();
  Object.keys(ctxQueryMap)
    .filter((stateMachineName) => {
      //xdmp.log(`checking ${uri} against state-machine "${stateMachineName}"`);
      return checkUriAgainstStateMachineContext(
        uri,
        stateMachineName,
        ctxQueryMap[stateMachineName]
      );
    })
    .forEach((stateMachineName) => {
      xdmp.trace(
        sc.TRACE_EVENT,
        `state-conductor-item-trigger found matching state-machine "${stateMachineName}" in ${DATABASE_NAME} for ${uri}`
      );
      sc.createStateConductorExecution(stateMachineName, uri);
    });
} else {
  xdmp.trace(sc.TRACE_EVENT, `no matching stateMachines in ${DATABASE_NAME} for ${uri}`);
}

xdmp.trace(sc.TRACE_EVENT, `state-conductor-item-trigger completed in "${xdmp.elapsedTime()}"`);
