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
let executionDoc, error, respDoc, updated;

// test reference to missing DHF flow
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'missing-dhf-state-machine',
  status: 'working',
  state: 'runStep1',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

respDoc = sc.executeStateByExecutionDoc(executionDoc, false);
xdmp.log(respDoc);
assertions.push(
  test.assertEqual('failed', respDoc.status, 'status check'),
  test.assertEqual('JS-JAVASCRIPT', respDoc.errors['runStep1'].name, 'handled missing dhf flow'),
  test.assertTrue(
    respDoc.errors['runStep1'].data.includes(
      'Error: The flow with the name MissingFlow could not be found.'
    ),
    'handled missing dhf flow'
  )
);

// test executing flow step
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'person-steps-state-machine',
  status: 'working',
  state: 'runStep1',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

respDoc = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, respDoc.status, 'excecuted step 1'),
  test.assertEqual('runStep2', respDoc.state),
  test.assertEqual(1, respDoc.context['PersonFlow']['1'].totalCount),
  test.assertEqual(0, respDoc.context['PersonFlow']['1'].errorCount),
  test.assertEqual('/data/johndoe.json', respDoc.context['PersonFlow']['1'].completedItems[0])
);

// proceed to next step
respDoc = sc.executeStateByExecutionDoc(xdmp.toJSON(respDoc), false);

assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, respDoc.status, 'excecuted step 2'),
  test.assertEqual('Success', respDoc.state),
  test.assertEqual(1, respDoc.context['PersonFlow']['2'].totalCount),
  test.assertEqual(0, respDoc.context['PersonFlow']['2'].errorCount),
  test.assertEqual('/data/johndoe.json', respDoc.context['PersonFlow']['2'].completedItems[0])
);

// test executing custom flow step
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'custom-steps-state-machine',
  status: 'working',
  state: 'runStep1',
  uri: '/data/janedoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

respDoc = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));
updated = isolate(() => cts.doc('/data/janedoe.json').toObject());

assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, respDoc.status, 'excecuted step 1'),
  test.assertEqual('Success', respDoc.state),
  test.assertEqual(1, respDoc.context['CustomFlow']['1'].totalCount),
  test.assertEqual(0, respDoc.context['CustomFlow']['1'].errorCount),
  test.assertEqual('/data/janedoe.json', respDoc.context['CustomFlow']['1'].completedItems[0]),
  test.assertEqual(
    'find me!',
    updated.envelope.headers.secret,
    'Flow Options were passed successfully'
  )
);

// return
assertions;
