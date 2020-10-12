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

function getJobDocById(id) {
  return getJobDocByUri(`/stateConductorJob/${id}.json`);
}

function getJobDocByUri(uri) {
  return isolate(() => cts.doc(uri).toObject(), xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB));
}

let resp, err, id, doc, jobDoc, props;

/*
 * findFlowTargets tests
 */

resp = sc.findFlowTargets('branching-flow').toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc5, resp[0])
);

resp = sc.findFlowTargets('task-flow').toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc5, resp[0])
);

resp = sc.findFlowTargets('branching-flow', true).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(2, resp.length),
  test.assertEqual(doc3, resp[0]),
  test.assertEqual(doc5, resp[1])
);

resp = sc.findFlowTargets('task-flow', true).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(2, resp.length),
  test.assertEqual(doc2, resp[0]),
  test.assertEqual(doc5, resp[1])
);

resp = sc.findFlowTargets('task-flow', true, 1).toArray();
assertions.push(
  test.assertTrue(Array.isArray(resp)),
  test.assertEqual(1, resp.length),
  test.assertEqual(doc2, resp[0])
);

try {
  resp = sc.findFlowTargets('fake-flow', true, 1).toArray();
} catch (e) {
  err = e;
}

assertions.push(test.assertTrue(!!err), test.assertEqual('MISSING-FLOW-FILE', err.name));

/*
 * gatherAndCreateJobsForFlow tests
 */

resp = isolate(() => sc.gatherAndCreateJobsForFlow('branching-flow'));

assertions.push(
  test.assertEqual('branching-flow', resp.flowName),
  test.assertEqual(1, resp.total),
  test.assertEqual(1, Object.keys(resp.jobs).length),
  test.assertEqual(doc5, Object.keys(resp.jobs)[0])
);

id = resp.jobs[doc5];
doc = isolate(() => cts.doc(doc5));
props = isolate(() => sc.getJobIds(doc5, 'branching-flow'));
jobDoc = isolate(() => getJobDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc5, jobDoc.uri),
  test.assertEqual('branching-flow', jobDoc.flowName),
  test.assertEqual(1, props.length),
  test.assertEqual(id, props[0])
);

resp = isolate(() => sc.gatherAndCreateJobsForFlow('task-flow', true));

xdmp.log(resp);

assertions.push(
  test.assertEqual('task-flow', resp.flowName),
  test.assertEqual(2, resp.total),
  test.assertEqual(2, Object.keys(resp.jobs).length),
  test.assertEqual(doc2, Object.keys(resp.jobs)[0]),
  test.assertEqual(doc5, Object.keys(resp.jobs)[1])
);

id = resp.jobs[doc5];
doc = isolate(() => cts.doc(doc5));
props = isolate(() => sc.getJobIds(doc5, 'task-flow'));
jobDoc = isolate(() => getJobDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc5, jobDoc.uri),
  test.assertEqual('task-flow', jobDoc.flowName),
  test.assertEqual(1, props.length),
  test.assertEqual(id, props[0])
);

id = resp.jobs[doc2];
doc = isolate(() => cts.doc(doc2));
props = isolate(() => sc.getJobIds(doc2, 'task-flow'));
jobDoc = isolate(() => getJobDocById(id));

assertions.push(
  test.assertTrue(!!jobDoc),
  test.assertEqual(doc2, jobDoc.uri),
  test.assertEqual('task-flow', jobDoc.flowName),
  test.assertEqual(2, props.length),
  test.assertTrue(props.includes(id))
);

try {
  resp = sc.gatherAndCreateJobsForFlow('fake-flow', true, 1).toArray();
} catch (e) {
  err = e;
}

assertions.push(test.assertTrue(!!err), test.assertEqual('MISSING-FLOW-FILE', err.name));

// return
assertions;
