'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
const doc1 = '/data/test-doc1.json';
const doc2 = '/data/test-doc2.json';
const doc3 = '/data/test-doc3.json';

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

// doc 1 - we manually add this to the branching flow
const jobId1 = isolate(() =>
  sc.createStateConductorJob('branching-flow', doc1, { collections: ['test'] })
);
const jobUri1 = `/stateConductorJob/${jobId1}.json`;
const jobDoc1 = isolate(
  () => cts.doc(jobUri1).toObject(),
  xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
);

assertions.push(
  test.assertTrue(!!jobId1),
  test.assertTrue(!!jobDoc1),
  test.assertEqual(doc1, jobDoc1.uri),
  test.assertEqual('branching-flow', jobDoc1.flowName),
  test.assertEqual(
    jobId1,
    isolate(() => sc.getJobIds(doc1, 'branching-flow')[0])
  )
);

// doc 2 - is added to the test flow during setup via trigger
const jobId2 = sc.getJobIds(doc2, 'test-flow')[0];
const jobId2_2 = sc.getJobIds(doc2, 'branching-flow')[0];
const jobUri2 = `/stateConductorJob/${jobId2}.json`;
const jobDoc2 = isolate(
  () => cts.doc(jobUri2).toObject(),
  xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
);

assertions.push(
  test.assertTrue(!!jobId2),
  test.assertEqual(null, jobId2_2),
  test.assertTrue(!!jobDoc2),
  test.assertEqual('test-flow', jobDoc2.flowName)
);

// doc 3 - is added to the branching flow during setup via trigger
const jobId3 = sc.getJobIds(doc3, 'branching-flow')[0];
const jobId3_2 = sc.getJobIds(doc3, 'test-flow')[0];
const jobUri3 = `/stateConductorJob/${jobId3}.json`;
const jobDoc3 = isolate(
  () => cts.doc(jobUri3).toObject(),
  xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
);

assertions.push(
  test.assertTrue(!!jobId3),
  test.assertEqual(null, jobId3_2),
  test.assertTrue(!!jobDoc3),
  test.assertEqual('branching-flow', jobDoc3.flowName)
);

assertions;
