'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
const doc1 = '/data/test-doc1.json';
const doc2 = '/data/test-doc2.json';
const doc3 = '/data/test-doc3.json';
const doc4 = '/data/test-doc4.json';
const doc5 = '/data/test-doc5.json';

function isolate(func, dbId) {
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: 'different-transaction',
        commit: 'auto',
        database: dbId || xdmp.database(),
      }
    )
  );
}

function getExecutionDocById(id) {
  return getExecutionDocByUri(`/stateConductorExecution/${id}.json`);
}

function getExecutionDocByUri(uri) {
  return isolate(() => cts.doc(uri).toObject(), xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB));
}

let resp, err, id, doc, jobDoc, props;

/*
 * findFlowTargets tests
 */

resp = sc.findStateMachineTargets('branching-state-machine').toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc5, resp[0])
);

resp = sc.findStateMachineTargets('task-state-machine').toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc5, resp[0])
);

resp = sc.findStateMachineTargets('branching-state-machine', true).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(2, resp.length),
  test.assertEqual(doc3, resp[0]),
  test.assertEqual(doc5, resp[1])
);

resp = sc.findStateMachineTargets('task-state-machine', true).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(2, resp.length),
  test.assertEqual(doc2, resp[0]),
  test.assertEqual(doc5, resp[1])
);

resp = sc.findStateMachineTargets('task-state-machine', true, 1).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc2, resp[0])
);

try {
  resp = sc.findStateMachineTargets('fake-state-machine', true, 1).toArray();
} catch (e) {
  err = e;
}

assertions.push(test.assertTrue(!!err), test.assertEqual('MISSING-STATE-MACHINE-FILE', err.name));

/*
 * gatherAndCreateJobsForFlow tests
 */

resp = isolate(() => sc.gatherAndCreateExecutionsForStateMachine('branching-state-machine'));

assertions.push(
  test.assertEqual('branching-state-machine', resp.name),
  test.assertEqual(1, resp.total),
  test.assertEqual(1, Object.keys(resp.executions).length),
  test.assertEqual(doc5, Object.keys(resp.executions)[0])
);

id = resp.executions[doc5];
doc = isolate(() => cts.doc(doc5));
props = isolate(() => sc.getExecutionIds(doc5, 'branching-state-machine'));
jobDoc = isolate(() => getExecutionDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc5, jobDoc.uri),
  test.assertEqual('branching-state-machine', jobDoc.name),
  test.assertEqual(1, props.length),
  test.assertEqual(id, props[0])
);

resp = isolate(() => sc.gatherAndCreateExecutionsForStateMachine('task-state-machine', true));

xdmp.log(resp);

assertions.push(
  test.assertEqual('task-state-machine', resp.name),
  test.assertEqual(2, resp.total),
  test.assertEqual(2, Object.keys(resp.executions).length),
  test.assertEqual(doc2, Object.keys(resp.executions)[0]),
  test.assertEqual(doc5, Object.keys(resp.executions)[1])
);

id = resp.executions[doc5];
doc = isolate(() => cts.doc(doc5));
props = isolate(() => sc.getExecutionIds(doc5, 'task-state-machine'));
jobDoc = isolate(() => getExecutionDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc5, jobDoc.uri),
  test.assertEqual('task-state-machine', jobDoc.name),
  test.assertEqual(1, props.length),
  test.assertEqual(id, props[0])
);

id = resp.executions[doc2];
doc = isolate(() => cts.doc(doc2));
props = isolate(() => sc.getExecutionIds(doc2, 'task-state-machine'));
jobDoc = isolate(() => getExecutionDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc2, jobDoc.uri),
  test.assertEqual('task-state-machine', jobDoc.name),
  test.assertEqual(2, props.length),
  test.assertTrue(props.includes(id))
);

try {
  resp = sc.gatherAndCreateExecutionsForStateMachine('fake-state-machine', true, 1).toArray();
} catch (e) {
  err = e;
}

assertions.push(test.assertTrue(!!err), test.assertEqual('MISSING-STATE-MACHINE-FILE', err.name));

// return
assertions;
