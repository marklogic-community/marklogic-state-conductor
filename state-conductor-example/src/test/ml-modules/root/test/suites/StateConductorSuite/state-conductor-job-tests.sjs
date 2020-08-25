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

function getJobDocById(id) {
  return getJobDocByUri(`/stateConductorJob/${id}.json`);
}

function getJobDocByUri(uri) {
  return isolate(() => cts.doc(uri).toObject(), xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB));
}

// doc 1 - we manually add this to the branching flow
const jobId1 = isolate(() =>
  sc.createStateConductorJob('branching-flow', doc1, { collections: ['test'] })
);
const jobDoc1 = getJobDocById(jobId1);

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
const jobDoc2 = getJobDocById(jobId2);

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

// getJobDocuments() tests

const jobBatch1Time = new Date().toISOString();
xdmp.sleep(100);
const jobBatch1 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorJob('test-flow', null, {}, { collections: ['test'] })
  )
);
xdmp.sleep(2000);
const jobBatch2Time = new Date().toISOString();
xdmp.sleep(100);
const jobBatch2 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorJob('task-flow', null, {}, { collections: ['test'] })
  )
);
xdmp.sleep(2000);
const jobBatch3Time = new Date().toISOString();
xdmp.sleep(100);
const jobBatch3 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorJob('choice-flow', null, {}, { collections: ['test'] })
  )
);

console.log('jobBatch1Time', jobBatch1Time);
console.log('jobBatch2Time', jobBatch2Time);
console.log('jobBatch3Time', jobBatch3Time);

const flowNames = ['test-flow', 'task-flow', 'choice-flow'];

let options = {
  start: 1,
  count: 2000,
  flowStatus: null,
  flowNames: flowNames,
  forestIds: null,
  startDate: null,
  endDate: null,
};

const jobUris = isolate(() => sc.getJobDocuments(options));
assertions.push(test.assertTrue(Array.isArray(jobUris)), test.assertEqual(2000, jobUris.length));
jobUris.forEach((uri) => {
  let jobDoc = getJobDocByUri(uri);
  assertions.push(test.assertTrue(flowNames.includes(jobDoc.flowName)));
});

// test page filters
options.start = 1;
options.count = 20;
const jobUris1 = isolate(() => sc.getJobDocuments(options));

options.start = 21;
options.count = 20;
const jobUris2 = isolate(() => sc.getJobDocuments(options));

options.start = 1001;
options.count = 20;
const jobUris3 = isolate(() => sc.getJobDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(jobUris1)),
  test.assertEqual(20, jobUris1.length),
  test.assertTrue(Array.isArray(jobUris2)),
  test.assertEqual(20, jobUris2.length),
  test.assertTrue(Array.isArray(jobUris3)),
  test.assertEqual(20, jobUris3.length),
  test.assertTrue(JSON.stringify(jobUris1.sort()) !== JSON.stringify(jobUris2.sort())),
  test.assertTrue(JSON.stringify(jobUris2.sort()) !== JSON.stringify(jobUris3.sort())),
  test.assertTrue(JSON.stringify(jobUris3.sort()) !== JSON.stringify(jobUris1.sort()))
);

// test time boxing
options.start = 1;
options.count = 2000;
options.startDate = jobBatch1Time;
options.endDate = jobBatch2Time;
const jobUrisBatch1Test = isolate(() => sc.getJobDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(jobUrisBatch1Test)),
  test.assertEqual(1000, jobUrisBatch1Test.length)
);
jobUrisBatch1Test.forEach((uri) => {
  let jobDoc = getJobDocByUri(uri);
  assertions.push(test.assertEqual('test-flow', jobDoc.flowName));
});

options.start = 1;
options.count = 2000;
options.startDate = jobBatch2Time;
options.endDate = jobBatch3Time;
const jobUrisBatch2Test = isolate(() => sc.getJobDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(jobUrisBatch2Test)),
  test.assertEqual(1000, jobUrisBatch2Test.length)
);
jobUrisBatch2Test.forEach((uri) => {
  let jobDoc = getJobDocByUri(uri);
  assertions.push(test.assertEqual('task-flow', jobDoc.flowName));
});

options.start = 1;
options.count = 2000;
options.startDate = jobBatch3Time;
options.endDate = null;
const jobUrisBatch3Test = isolate(() => sc.getJobDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(jobUrisBatch3Test)),
  test.assertEqual(1000, jobUrisBatch3Test.length)
);
jobUrisBatch3Test.forEach((uri) => {
  let jobDoc = getJobDocByUri(uri);
  assertions.push(test.assertEqual('choice-flow', jobDoc.flowName));
});

assertions;
