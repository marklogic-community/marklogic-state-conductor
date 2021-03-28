'use strict';
const test = require('/test/test-helper.xqy');
const dhf5RunFlowStepAction = require('/state-conductor/actions/common/dhf/dhf5RunFlowStepAction.sjs');

const uri1 = '/data/janedoe.json';
const uri2 = '/data/johndoe.json';

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

// run a test documents through the CustomFlow flow step 1 using it's sourceQuery
let flowName = 'CustomFlow';
let step = 1;

let original1 = isolate(() => cts.doc(uri1).toObject());
let original2 = isolate(() => cts.doc(uri2).toObject());
let resp = isolate(() =>
  dhf5RunFlowStepAction.performAction(null, {
    flowName: flowName,
    step: step,
    useSourceQuery: true,
  })
);
let transformed1 = isolate(() => cts.doc(uri1).toObject());
let transformed2 = isolate(() => cts.doc(uri2).toObject());

xdmp.log(resp);
xdmp.log(transformed1);
xdmp.log(transformed2);

let flowResult = resp[flowName];
assertions.push(test.assertTrue(flowResult !== null));

let stepResult = flowResult['' + step];
assertions.push(test.assertTrue(stepResult !== null));

assertions.push(
  test.assertTrue(stepResult.jobId.length > 0),
  test.assertEqual(2, stepResult.totalCount, 'found souceQuery docs'),
  test.assertEqual(0, stepResult.errorCount),
  test.assertTrue(stepResult.completedItems.includes(uri1)),
  test.assertTrue(stepResult.completedItems.includes(uri2)),

  test.assertTrue(transformed1.envelope != null),
  test.assertTrue(transformed1.envelope.headers != null),
  test.assertTrue(transformed1.envelope.headers.createdOn.length > 0),
  test.assertTrue(transformed1.envelope.headers.randomUuid.length > 0),
  test.assertTrue(transformed1.envelope.triples != null),
  test.assertTrue(transformed1.envelope.instance != null),
  test.assertEqual('Jane', transformed1.envelope.instance.firstName),
  test.assertEqual('Doe', transformed1.envelope.instance.lastName),
  test.assertEqual(JSON.stringify(original1), JSON.stringify(transformed1.envelope.instance)),
  test.assertTrue(isolate(() => xdmp.documentGetCollections(uri1).includes('MyCustomStep'))),
  test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri1).datahubCreatedInFlow === flowName)),
  test.assertTrue(
    isolate(() => xdmp.documentGetMetadata(uri1).datahubCreatedByStep === 'MyCustomStep')
  ),

  test.assertTrue(transformed2.envelope != null),
  test.assertTrue(transformed2.envelope.headers != null),
  test.assertTrue(transformed2.envelope.headers.createdOn.length > 0),
  test.assertTrue(transformed2.envelope.headers.randomUuid.length > 0),
  test.assertTrue(transformed2.envelope.triples != null),
  test.assertTrue(transformed2.envelope.instance != null),
  test.assertEqual('John', transformed2.envelope.instance.firstName),
  test.assertEqual('Doe', transformed2.envelope.instance.lastName),
  test.assertEqual(JSON.stringify(original2), JSON.stringify(transformed2.envelope.instance)),
  test.assertTrue(isolate(() => xdmp.documentGetCollections(uri2).includes('MyCustomStep'))),
  test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri2).datahubCreatedInFlow === flowName)),
  test.assertTrue(
    isolate(() => xdmp.documentGetMetadata(uri2).datahubCreatedByStep === 'MyCustomStep')
  )
);

// return
assertions;
