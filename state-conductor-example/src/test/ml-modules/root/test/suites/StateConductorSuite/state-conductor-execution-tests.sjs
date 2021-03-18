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

function getExecutionDocById(id) {
  return getExecutionDocByUri(`/stateConductorExecution/${id}.json`);
}

function getExecutionDocByUri(uri) {
  return isolate(() => cts.doc(uri).toObject(), xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB));
}

// doc 1 - we manually add this to the branching stateMachine
const executionId1 = isolate(() =>
  sc.createStateConductorExecution('branching-state-machine', doc1, { collections: ['test'] })
);
const executionDoc1 = getExecutionDocById(executionId1);

assertions.push(
  test.assertTrue(!!executionId1),
  test.assertTrue(!!executionDoc1),
  test.assertEqual(doc1, executionDoc1.uri),
  test.assertEqual('branching-state-machine', executionDoc1.name),
  test.assertEqual(
    executionId1,
    isolate(() => sc.getExecutionIds(doc1, 'branching-state-machine')[0])
  )
);

// doc 2 - is added to the test stateMachine during setup via trigger
const executionId2 = sc.getExecutionIds(doc2, 'test-state-machine')[0];
const executionId2_2 = sc.getExecutionIds(doc2, 'branching-state-machine')[0];
const executionDoc2 = getExecutionDocById(executionId2);

assertions.push(
  test.assertTrue(!!executionId2),
  test.assertEqual(null, executionId2_2),
  test.assertTrue(!!executionDoc2),
  test.assertEqual('test-state-machine', executionDoc2.name)
);

// doc 3 - is added to the branching stateMachine during setup via trigger
const executionId3 = sc.getExecutionIds(doc3, 'branching-state-machine')[0];
const executionId3_2 = sc.getExecutionIds(doc3, 'test-state-machine')[0];
const executionUri3 = `/stateConductorExecution/${executionId3}.json`;
const executionDoc3 = isolate(
  () => cts.doc(executionUri3).toObject(),
  xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB)
);

assertions.push(
  test.assertTrue(!!executionId3),
  test.assertEqual(null, executionId3_2),
  test.assertTrue(!!executionDoc3),
  test.assertEqual('branching-state-machine', executionDoc3.name)
);

// getExecutionDocuments() tests

const executionBatch1Time = fn.currentDateTime()
xdmp.sleep(100);
const executionBatch1 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorExecution('test-state-machine', null, {}, { collections: ['test'] })
  )
);
xdmp.sleep(2000);
const executionBatch2Time = fn.currentDateTime()
xdmp.sleep(100);
const executionBatch2 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorExecution('task-state-machine', null, {}, { collections: ['test'] })
  )
);
xdmp.sleep(2000);
const executionBatch3Time = fn.currentDateTime()
xdmp.sleep(100);
const executionBatch3 = isolate(() =>
  Array.from(Array(1000)).map(() =>
    sc.createStateConductorExecution('choice-state-machine', null, {}, { collections: ['test'] })
  )
);

console.log('executionBatch1Time', executionBatch1Time);
console.log('executionBatch2Time', executionBatch2Time);
console.log('executionBatch3Time', executionBatch3Time);

const names = ['test-state-machine', 'task-state-machine', 'choice-state-machine'];

let options = {
  start: 1,
  count: 2000,
  status: null,
  names: names,
  forestIds: null,
  startDate: null,
  endDate: null,
};

const executionUris = isolate(() => sc.getExecutionDocuments(options));
assertions.push(test.assertTrue(Array.isArray(executionUris)), test.assertEqual(2000, executionUris.length));
executionUris.forEach((uri) => {
  let executionDoc = getExecutionDocByUri(uri);
  assertions.push(test.assertTrue(names.includes(executionDoc.name)));
});

// test page filters
options.start = 1;
options.count = 20;
const executionUris1 = isolate(() => sc.getExecutionDocuments(options));

options.start = 21;
options.count = 20;
const executionUris2 = isolate(() => sc.getExecutionDocuments(options));

options.start = 1001;
options.count = 20;
const executionUris3 = isolate(() => sc.getExecutionDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(executionUris1)),
  test.assertEqual(20, executionUris1.length),
  test.assertTrue(Array.isArray(executionUris2)),
  test.assertEqual(20, executionUris2.length),
  test.assertTrue(Array.isArray(executionUris3)),
  test.assertEqual(20, executionUris3.length),
  test.assertTrue(JSON.stringify(executionUris1.sort()) !== JSON.stringify(executionUris2.sort())),
  test.assertTrue(JSON.stringify(executionUris2.sort()) !== JSON.stringify(executionUris3.sort())),
  test.assertTrue(JSON.stringify(executionUris3.sort()) !== JSON.stringify(executionUris1.sort()))
);

// test time boxing
options.start = 1;
options.count = 2000;
options.startDate = executionBatch1Time;
options.endDate = executionBatch2Time;
const executionUrisBatch1Test = isolate(() => sc.getExecutionDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(executionUrisBatch1Test)),
  test.assertEqual(1000, executionUrisBatch1Test.length)
);
executionUrisBatch1Test.forEach((uri) => {
  let executionDoc = getExecutionDocByUri(uri);
  assertions.push(test.assertEqual('test-state-machine', executionDoc.name));
});

options.start = 1;
options.count = 2000;
options.startDate = executionBatch2Time;
options.endDate = executionBatch3Time;
const executionUrisBatch2Test = isolate(() => sc.getExecutionDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(executionUrisBatch2Test)),
  test.assertEqual(1000, executionUrisBatch2Test.length)
);
executionUrisBatch2Test.forEach((uri) => {
  let executionDoc = getExecutionDocByUri(uri);
  assertions.push(test.assertEqual('task-state-machine', executionDoc.name));
});

options.start = 1;
options.count = 2000;
options.startDate = executionBatch3Time;
options.endDate = null;
const executionUrisBatch3Test = isolate(() => sc.getExecutionDocuments(options));

assertions.push(
  test.assertTrue(Array.isArray(executionUrisBatch3Test)),
  test.assertEqual(1000, executionUrisBatch3Test.length)
);
executionUrisBatch3Test.forEach((uri) => {
  let executionDoc = getExecutionDocByUri(uri);
  assertions.push(test.assertEqual('choice-state-machine', executionDoc.name));
});

assertions;
