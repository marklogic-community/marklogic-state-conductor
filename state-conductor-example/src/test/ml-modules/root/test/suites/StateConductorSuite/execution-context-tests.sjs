'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
const doc1Uri = '/data/test-doc1.json';
const doc1Obj = cts.doc(doc1Uri).toObject();

function isolate(func) {
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: 'different-transaction',
        commit: 'auto',
      }
    )
  );
}

let resp, executionDoc;

/*

This test utilizes the "create-doc" action module, which utilizes the context to create new documents based on old ones.
It wraps the content of the previous document in an object with an "old" key.
The "contextual-state-machine" does this three times, and passes a new uri via context each time.

*/

// start the processing
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'contextual-state-machine',
  status: 'working',
  state: 'createDoc1',
  uri: doc1Uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

resp = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

// make sure newDocUri was set in the context
assertions.push(
  test.assertTrue(!!resp.context.newDocUri, 'new document uri is not null'),
  test.assertTrue(resp.context.newDocUri !== '', 'new document uri was set')
);

// capture the newDocUri value
const doc2Uri = resp.context.newDocUri;
const doc2Obj = isolate(() => cts.doc(doc2Uri).toObject());

// make sure doc3 was created
assertions.push(
  test.assertEqual(
    JSON.stringify(doc2Obj.old),
    JSON.stringify(doc1Obj),
    'new document was created using context'
  )
);

// start the next step
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'contextual-state-machine',
  status: 'working',
  state: 'createDoc2',
  uri: doc1Uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    newDocUri: doc2Uri,
  },
});

resp = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

// make sure newDocUri was set in the context
assertions.push(
  test.assertTrue(!!resp.context.newDocUri, 'new document uri is not null'),
  test.assertTrue(resp.context.newDocUri !== '', 'new document uri was set')
);

// capture the newDocUri value
const doc3Uri = resp.context.newDocUri;
const doc3Obj = isolate(() => cts.doc(doc3Uri).toObject());

// make sure doc3 was created
assertions.push(
  test.assertEqual(
    JSON.stringify(doc3Obj.old.old),
    JSON.stringify(doc1Obj),
    'new document was created using context'
  )
);

// start the final step
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'contextual-state-machine',
  status: 'working',
  state: 'createDoc3',
  uri: doc1Uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    newDocUri: doc3Uri,
  },
});

resp = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

// make sure newDocUri was set in the context
assertions.push(
  test.assertTrue(!!resp.context.newDocUri, 'new document uri is not null'),
  test.assertTrue(resp.context.newDocUri !== '', 'new document uri was set')
);

// capture the newDocUri value
const doc4Uri = resp.context.newDocUri;
const doc4Obj = isolate(() => cts.doc(doc4Uri).toObject());

// make sure doc4 was created
assertions.push(
  test.assertEqual(
    JSON.stringify(doc4Obj.old.old.old),
    JSON.stringify(doc1Obj),
    'new document was created using context'
  )
);

assertions;
