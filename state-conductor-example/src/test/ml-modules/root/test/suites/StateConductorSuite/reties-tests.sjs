'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

const test = require('/test/test-helper.xqy');

// helper to allow processing in seperate transactions
function isolate(func, db) {
  db = db || xdmp.database();
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: 'different-transaction',
        commit: 'auto',
        database: db,
      }
    )
  );
}

const assertions = [];
let jobDoc, assertion;

//checks see if the new status check is working
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'errorOut',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {}
});


assertion = isolate(() => executeStateByJobDoc(jobDoc, false) );

test.assertEqual(assertion.retries["States.ALL"], 1)
test.assertEqual(assertion.provenance[0]["retryNumber"], 1)
test.assertEqual(assertion.flowStatus, "working", "")
test.assertEqual(assertion.errors.errorOut.name, "error", "")

//checks see if the new status check is working
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'errorOut',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  "retries": {
    "States.ALL": 2
  }
});


assertion = isolate(() => executeStateByJobDoc(jobDoc, false) );

test.assertEqual(assertion.retries["States.ALL"], 3)
test.assertEqual(assertion.provenance[0]["retryNumber"], 3)
test.assertEqual(assertion.flowStatus, "working", "")
test.assertEqual(assertion.errors.errorOut.name, "error", "")

//more than the limit
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'errorOut',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  "retries": {
    "States.ALL": 4
  }
});


assertion = isolate(() => executeStateByJobDoc(jobDoc, false) );

test.assertEqual(assertion.retries["States.ALL"], 4)

test.assertEqual(assertion.flowStatus, "failed", "")
test.assertEqual(assertion.errors.errorOut.name, "error", "")


//more MaxAttempts higher
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'fourMaxAttempts',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  "retries": {
    "States.ALL": 3
  }
});


assertion = isolate(() => executeStateByJobDoc(jobDoc, false) );

test.assertEqual(assertion.retries["States.ALL"], 4)
test.assertEqual(assertion.provenance[0]["retryNumber"], 4)
test.assertEqual(assertion.flowStatus, "working", "")
test.assertEqual(assertion.errors.fourMaxAttempts.name, "error", "")

assertions;
