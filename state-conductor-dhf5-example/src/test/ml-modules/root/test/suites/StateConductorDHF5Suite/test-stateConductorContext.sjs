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
  flowName: 'custom-steps-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'runStep1',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {}
});


assertion = isolate(() =>
  sc.executeStateByJobDoc(jobDoc, false)
);


assertions.push(test.assertTrue(assertion.context.hasOwnProperty("hasChanged"), 'hasOwnProperty hasChanged'));
assertions.push(test.assertTrue(assertion.context.hasChanged, 'hasChanged'));

assertions
