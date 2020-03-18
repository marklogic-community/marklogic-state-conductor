"use strict";
const test = require("/test/test-helper.xqy");
const dhf5MakeEnvelopeStep = require("/state-conductor/actions/common/dhf/dhf5MakeEnvelopeStep.sjs");

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

let original = isolate(() => cts.doc(uri).toObject());
let resp = isolate(() => dhf5MakeEnvelopeStep.performAction(uri));
let updated = isolate(() => cts.doc(uri).toObject());

assertions.push(
  test.assertTrue(resp !== null),
  test.assertTrue(resp.makeEnvelope !== null),
  test.assertEqual(uri, resp.makeEnvelope.uri),
  test.assertTrue(updated !== null),
  test.assertTrue(updated.envelope !== null),
  test.assertTrue(updated.envelope.headers !== null),
  test.assertTrue(updated.envelope.triples !== null),
  test.assertEqual(JSON.stringify(original), JSON.stringify(updated.envelope.instance))
);

// return
assertions;
