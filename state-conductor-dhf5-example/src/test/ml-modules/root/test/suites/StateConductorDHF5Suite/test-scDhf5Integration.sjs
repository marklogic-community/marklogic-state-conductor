'use strict';
declareUpdate();

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
let jobDoc, error, respDoc, updated;

// test reference to missing DHF flow
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'missing-dhf-flow',
  flowStatus: 'working',
  flowState: 'runStep1',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

try {
  respDoc = sc.executeStateByJobDoc(jobDoc, false);
} catch (err) {
  error = err;
}

assertions.push(
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    error.name,
    'handled missing dhf flow'
  )
);

// test executing flow step
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'person-steps-flow',
  flowStatus: 'working',
  flowState: 'runStep1',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

respDoc = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual(
    sc.FLOW_STATUS_WORKING,
    respDoc.flowStatus,
    'excecuted step 1'
  ),
  test.assertEqual('runStep2', respDoc.flowState),
  test.assertEqual(1, respDoc.context['PersonFlow']['1'].totalCount),
  test.assertEqual(0, respDoc.context['PersonFlow']['1'].errorCount),
  test.assertEqual(
    '/data/johndoe.json',
    respDoc.context['PersonFlow']['1'].completedItems[0]
  )
);

// proceed to next step
respDoc = sc.executeStateByJobDoc(xdmp.toJSON(respDoc), false);

assertions.push(
  test.assertEqual(
    sc.FLOW_STATUS_WORKING,
    respDoc.flowStatus,
    'excecuted step 2'
  ),
  test.assertEqual('Success', respDoc.flowState),
  test.assertEqual(1, respDoc.context['PersonFlow']['2'].totalCount),
  test.assertEqual(0, respDoc.context['PersonFlow']['2'].errorCount),
  test.assertEqual(
    '/data/johndoe.json',
    respDoc.context['PersonFlow']['2'].completedItems[0]
  )
);

// test executing custom flow step
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'custom-steps-flow',
  flowStatus: 'working',
  flowState: 'runStep1',
  uri: '/data/janedoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

respDoc = isolate(() => sc.executeStateByJobDoc(jobDoc, false));
updated = isolate(() => cts.doc('/data/janedoe.json').toObject());

assertions.push(
  test.assertEqual(
    sc.FLOW_STATUS_WORKING,
    respDoc.flowStatus,
    'excecuted step 1'
  ),
  test.assertEqual('Success', respDoc.flowState),
  test.assertEqual(1, respDoc.context['CustomFlow']['1'].totalCount),
  test.assertEqual(0, respDoc.context['CustomFlow']['1'].errorCount),
  test.assertEqual(
    '/data/janedoe.json',
    respDoc.context['CustomFlow']['1'].completedItems[0]
  ),
  test.assertEqual(
    'find me!',
    updated.envelope.headers.secret,
    'Flow Options were passed successfully'
  )
);

// return
assertions;
