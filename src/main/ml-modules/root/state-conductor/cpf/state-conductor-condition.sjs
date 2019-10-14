'use strict';

const cpf = require('/MarkLogic/cpf/cpf.xqy');
const sc  = require('/state-conductor/state-conductor.sjs');

const FIELD_CTX_QUERY_ID        = 'STATE-CONDUCTOR-CTX-QUERY';
const FIELD_CTX_QUERY_TIMESTAMP = 'STATE-CONDUCTOR-CTX-QUERY-TIMESTAMP';
const FIELD_CTX_QUERY_TIMEOUT   = 300000; // milliseconds (5 mins)

var uri;

function executeContextRegQuery(uri, regQueryId) {
  return cts.uris('', null, 
    cts.andQuery([
      cts.documentQuery(uri),
      cts.registeredQuery(regQueryId, 'unfiltered')
    ])
  );
}

function registerCtxQuery() {
  let query = sc.getAllFlowsContextQuery();
  let regCtxQueryId = cts.register(query);
  xdmp.setServerField(FIELD_CTX_QUERY_ID, regCtxQueryId);
  xdmp.setServerField(FIELD_CTX_QUERY_TIMESTAMP, (new Date()).getTime());
  return regCtxQueryId;
}

function getCtxRegQueryId() {
  let regCtxQueryId = fn.head(xdmp.getServerField(FIELD_CTX_QUERY_ID));
  let timestamp = fn.head(xdmp.getServerField(FIELD_CTX_QUERY_TIMESTAMP));
  let curr = (new Date()).getTime();
  
  if (!regCtxQueryId || curr > (timestamp + FIELD_CTX_QUERY_TIMEOUT)) {
    xdmp.log('registered context query not found or timestamp expired - registering new context query');
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
      xdmp.log('registered query not found - reregistering context query');
      // need to register a new query
      regCtxQueryId = registerCtxQuery();
      // execute the query
      resp = executeContextRegQuery(uri, regCtxQueryId);
    } else {
      xdmp.rethrow();
    }
  }

  // does this uri match the flow context?
  return uri === fn.string(fn.head(resp));
}


xdmp.log(`state-conductor-condition check for "${uri}"`);

checkUriAgainstContext(uri);