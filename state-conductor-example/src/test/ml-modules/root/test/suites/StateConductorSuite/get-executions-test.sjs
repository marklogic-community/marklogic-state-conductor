'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
const doc1 = '/data/test-doc1.json';
const doc2 = '/data/test-doc2.json';
const doc3 = '/data/test-doc3.json';
const doc4 = '/data/test-doc4.json';

let ids;
let resp;

// get execution ids

resp = sc.getExecutionIds(doc1);
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertEqual(0, resp.length, 'no execution ids were found')
);

resp = sc.getExecutionIds(doc2);
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found')
);

resp = sc.getExecutionIds(doc2, 'test-state-machine');
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found')
);

resp = sc.getExecutionIds(doc2, 'no-context-state-machine');
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertEqual(0, resp.length, 'no execution ids were found')
);

resp = sc.getExecutionIds(doc4, 'test-time-wait');
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found')
);

// get execution documents

resp = sc.getExecutionsForUri(doc1);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertEqual(0, resp.length, 'no execution ids were found')
);

resp = sc.getExecutionsForUri(doc2);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found'),
  test.assertTrue(resp[0].uri.length > 0),
  test.assertEqual(
    0,
    resp.map((exec) => exec.doc.toObject()).filter((doc) => doc.uri !== doc2).length,
    'all executions are for doc2'
  )
);

ids = sc.getExecutionIds(doc2, 'test-state-machine');
resp = sc.getExecutionsForUri(doc2, 'test-state-machine');
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found'),
  test.assertTrue(resp[0].uri.length > 0),
  test.assertEqual(
    0,
    resp.map((exec) => exec.doc.toObject()).filter((doc) => doc.uri !== doc2).length,
    'all executions are for doc2'
  ),
  test.assertEqual(
    0,
    resp.map((exec) => exec.doc.toObject()).filter((doc) => doc.name !== 'test-state-machine')
      .length,
    'all executions are for "test-state-machine"'
  ),
  test.assertEqual(
    0,
    resp
      .map((exec) => exec.doc.toObject())
      .filter((doc) => {
        let idx = ids.indexOf(doc.id);
        if (idx >= 0) {
          ids.splice(idx, 1);
          return false;
        }
        return true;
      }).length,
    'all execution ids match'
  ),
  test.assertEqual(0, ids.length, 'all ids are accounted for')
);

resp = sc.getExecutionsForUri(doc1, null, true);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found'),
  test.assertEqual(
    1,
    resp.filter((exec) => exec.uri === '/stateConductorExecution/test-execution1.json').length,
    'found historic execution'
  )
);

resp = sc.getExecutionsForUri(doc2, 'test-state-machine', true);
console.log(resp);
assertions.push(
  test.assertTrue(Array.isArray(resp), 'api returns an array'),
  test.assertTrue(resp.length > 0, 'execution ids were found'),
  test.assertEqual(
    1,
    resp.filter((exec) => exec.uri === '/stateConductorExecution/test-execution2.json').length,
    'found historic execution'
  ),
  test.assertEqual(
    0,
    resp.map((exec) => exec.doc.toObject()).filter((doc) => doc.name !== 'test-state-machine')
      .length,
    'all executions are for "test-state-machine"'
  )
);

assertions;
