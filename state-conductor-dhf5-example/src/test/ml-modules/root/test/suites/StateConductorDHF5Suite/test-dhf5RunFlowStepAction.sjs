"use strict";
const test = require("/test/test-helper.xqy");
const dhf5RunFlowStepAction = require("/state-conductor/actions/common/dhf/dhf5RunFlowStepAction.sjs");

// helper to allow processing in seperate transactions
function isolate(func, db) {
  db = db || xdmp.database()
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: "different-transaction",
        commit: "auto",
        database: db
      }
    )
  );
}

const assertions = [];

// run a test document through the PersonFlow flow step 1
let uri = "/data/janedoe.json";
let flowName = "PersonFlow";
let step = 1;

let original = isolate(() => cts.doc(uri).toObject());
let resp = isolate(() => dhf5RunFlowStepAction.performAction(uri, {
  flowName: flowName,
  step: step
}));
let ingested = isolate(() => cts.doc(uri).toObject());

let flowResult = resp[flowName];
assertions.push(test.assertTrue(flowResult !== null));

let stepResult = flowResult['' + step];
assertions.push(test.assertTrue(stepResult !== null));

assertions.push(
    test.assertTrue(stepResult.jobId.length > 0),
    test.assertTrue(stepResult.totalCount === 1),
    test.assertTrue(stepResult.errorCount === 0),
    test.assertTrue(stepResult.completedItems[0] === uri),
    test.assertTrue(ingested.envelope != null),
    test.assertTrue(ingested.envelope.headers != null),
    test.assertEqual(xdmp.getCurrentUser(), ingested.envelope.headers.createdBy),
    test.assertTrue(ingested.envelope.triples != null),
    test.assertTrue(ingested.envelope.instance != null),
    test.assertEqual('Jane', ingested.envelope.instance.firstName),
    test.assertEqual('Doe', ingested.envelope.instance.lastName),
    test.assertEqual(JSON.stringify(original), JSON.stringify(ingested.envelope.instance)),
    test.assertTrue(isolate(() => xdmp.documentGetCollections(uri).includes('default-ingestion'))),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedInFlow === 'PersonFlow')),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedByStep === 'default-ingestion'))
);

// run a test document through the PersonFlow flow step 2
step = 2;

resp = isolate(() => dhf5RunFlowStepAction.performAction(uri, {
  flowName: flowName,
  step: step
}));
let mapped = isolate(() => cts.doc(uri).toObject(), xdmp.database('sce-dh5-FINAL'));

flowResult = resp[flowName];
assertions.push(test.assertTrue(flowResult !== null));

stepResult = flowResult['' + step];
assertions.push(test.assertTrue(stepResult !== null));

assertions.push(
    test.assertTrue(stepResult.jobId.length > 0),
    test.assertTrue(stepResult.totalCount === 1),
    test.assertTrue(stepResult.errorCount === 0),
    test.assertTrue(stepResult.completedItems[0] === uri),
    test.assertTrue(mapped.envelope != null),
    test.assertTrue(mapped.envelope.headers != null),
    test.assertEqual(xdmp.getCurrentUser(), mapped.envelope.headers.createdBy),
    test.assertTrue(mapped.envelope.triples != null),
    test.assertTrue(mapped.envelope.instance != null),
    test.assertEqual('Person', mapped.envelope.instance.info.title),
    test.assertEqual('0.0.1', mapped.envelope.instance.info.version),
    test.assertEqual('Jane', mapped.envelope.instance.Person.firstName),
    test.assertEqual('Doe', mapped.envelope.instance.Person.lastName),
    test.assertEqual(JSON.stringify(ingested), JSON.stringify(mapped.envelope.attachments)),
    test.assertEqual(JSON.stringify(original), JSON.stringify(mapped.envelope.attachments.envelope.instance)),
    test.assertTrue(isolate(() => xdmp.documentGetCollections(uri).includes('default-ingestion'))),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedInFlow === 'PersonFlow')),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedByStep === 'default-ingestion'))
);

// run a test document through the CustomFlow flow step 1
uri = "/data/johndoe.json";
flowName = "CustomFlow";
step = 1;

original = isolate(() => cts.doc(uri).toObject());
resp = isolate(() => dhf5RunFlowStepAction.performAction(uri, {
  flowName: flowName,
  step: step,
  flowOptions: {
    secret: "testing-testing-1-2-3"
  }
}));
let custom = isolate(() => cts.doc(uri).toObject());

flowResult = resp[flowName];
assertions.push(test.assertTrue(flowResult !== null));

stepResult = flowResult['' + step];
assertions.push(test.assertTrue(stepResult !== null));

assertions.push(
    test.assertTrue(stepResult.jobId.length > 0),
    test.assertTrue(stepResult.totalCount === 1),
    test.assertTrue(stepResult.errorCount === 0),
    test.assertTrue(stepResult.completedItems[0] === uri),
    test.assertTrue(custom.envelope != null),
    test.assertTrue(custom.envelope.headers != null),
    test.assertEqual('testing-testing-1-2-3', custom.envelope.headers.secret),
    test.assertTrue(custom.envelope.headers.randomUuid.length > 0),
    test.assertTrue(custom.envelope.headers.createdOn.length > 0),
    test.assertTrue(custom.envelope.triples != null),
    test.assertTrue(custom.envelope.instance != null),
    test.assertEqual(JSON.stringify(original), JSON.stringify(custom.envelope.instance)),
    test.assertTrue(isolate(() => xdmp.documentGetCollections(uri).includes('MyCustomStep'))),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedInFlow === 'CustomFlow')),
    test.assertTrue(isolate(() => xdmp.documentGetMetadata(uri).datahubCreatedByStep === 'MyCustomStep'))
);


// return
assertions;
