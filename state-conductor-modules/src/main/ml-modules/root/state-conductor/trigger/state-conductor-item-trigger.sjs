'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

var uri;
var trigger;

const DATABASE_NAME = xdmp.databaseName(xdmp.database());
const FIELD_CTX_QUERY_ID = `STATE-CONDUCTOR-CTX-QUERY-${xdmp.database()}`;
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

xdmp.trace(sc.TRACE_EVENT, `state-conductor-item-trigger check for "${uri}"`);

// does this doc match any state-conductor stateMachines' context?
if (checkUriAgainstContext(uri)) {
  // find the specific stateMachine that applies
  const stateMachines = sc.getApplicableStateMachines(uri);
  xdmp.trace(
    sc.TRACE_EVENT,
    `state-conductor-item-trigger found "${stateMachines.length}" matching stateMachines in ${DATABASE_NAME} for ${uri}`
  );
  // create a state conductor execution for each stateMachine that applies
  stateMachines.forEach((stateMachine) => {
    const stateMachineName = sc.getStateMachineNameFromUri(fn.documentUri(stateMachine));
    sc.createStateConductorExecution(stateMachineName, uri);
  });
} else {
  xdmp.trace(sc.TRACE_EVENT, `no matching stateMachines in ${DATABASE_NAME} for ${uri}`);
}

xdmp.trace(sc.TRACE_EVENT, `state-conductor-item-trigger completed in "${xdmp.elapsedTime()}"`);
