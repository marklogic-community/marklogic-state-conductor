'use strict';
const test = require('/test/test-helper.xqy');
const dhf5RunFlowAction = require('/state-conductor/actions/common/dhf/dhf5RunFlowAction.sjs');

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

// run a test document through the full PersonFlow flow
let uri = '/data/johndoe.json';
let flowName = 'PersonFlow';

let original = isolate(() => cts.doc(uri).toObject());
let resp = isolate(() =>
  dhf5RunFlowAction.performAction(uri, {
    flowName: flowName,
  })
);
let ingested = isolate(() => cts.doc(uri).toObject());
let mapped = isolate(
  () => cts.doc(uri).toObject(),
  xdmp.database('sce-dh5-FINAL')
);

let flowResult = resp[flowName];
assertions.push(test.assertTrue(flowResult !== null));

let step1Result = flowResult['1'];
assertions.push(test.assertTrue(step1Result !== null));

let step2Result = flowResult['2'];
assertions.push(test.assertTrue(step2Result !== null));

// check step 1 results
assertions.push(
  test.assertTrue(step1Result.jobId.length > 0),
  test.assertTrue(step1Result.totalCount === 1),
  test.assertTrue(step1Result.errorCount === 0),
  test.assertTrue(step1Result.completedItems[0] === uri),
  test.assertTrue(ingested.envelope != null),
  test.assertTrue(ingested.envelope.headers != null),
  test.assertEqual(xdmp.getCurrentUser(), ingested.envelope.headers.createdBy),
  test.assertTrue(ingested.envelope.triples != null),
  test.assertTrue(ingested.envelope.instance != null),
  test.assertEqual('John', ingested.envelope.instance.firstName),
  test.assertEqual('Doe', ingested.envelope.instance.lastName),
  test.assertEqual(
    JSON.stringify(original),
    JSON.stringify(ingested.envelope.instance)
  ),
  test.assertTrue(
    isolate(() =>
      xdmp.documentGetCollections(uri).includes('default-ingestion')
    )
  ),
  test.assertTrue(
    isolate(
      () => xdmp.documentGetMetadata(uri).datahubCreatedInFlow === 'PersonFlow'
    )
  ),
  test.assertTrue(
    isolate(
      () =>
        xdmp.documentGetMetadata(uri).datahubCreatedByStep ===
        'default-ingestion'
    )
  )
);

// check step 2 results
assertions.push(
  test.assertTrue(step2Result.jobId.length > 0),
  test.assertTrue(step2Result.totalCount === 1),
  test.assertTrue(step2Result.errorCount === 0),
  test.assertTrue(step2Result.completedItems[0] === uri),
  test.assertTrue(mapped.envelope != null),
  test.assertTrue(mapped.envelope.headers != null),
  test.assertEqual(xdmp.getCurrentUser(), mapped.envelope.headers.createdBy),
  test.assertTrue(mapped.envelope.triples != null),
  test.assertTrue(mapped.envelope.instance != null),
  test.assertEqual('Person', mapped.envelope.instance.info.title),
  test.assertEqual('0.0.1', mapped.envelope.instance.info.version),
  test.assertEqual('John', mapped.envelope.instance.Person.firstName),
  test.assertEqual('Doe', mapped.envelope.instance.Person.lastName),
  test.assertEqual(
    JSON.stringify(ingested),
    JSON.stringify(mapped.envelope.attachments)
  ),
  test.assertEqual(
    JSON.stringify(original),
    JSON.stringify(mapped.envelope.attachments.envelope.instance)
  ),
  test.assertTrue(
    isolate(() =>
      xdmp.documentGetCollections(uri).includes('default-ingestion')
    )
  ),
  test.assertTrue(
    isolate(
      () => xdmp.documentGetMetadata(uri).datahubCreatedInFlow === 'PersonFlow'
    )
  ),
  test.assertTrue(
    isolate(
      () =>
        xdmp.documentGetMetadata(uri).datahubCreatedByStep ===
        'default-ingestion'
    )
  )
);

// return
assertions;
