'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, resp, colls;

let uri = '/data/test-doc1.json';

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

// test filtering output by OutputPath
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'ref-path-state-machine',
  status: 'working',
  status: 'test-data',
  uri: uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

resp = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));
colls = isolate(() => xdmp.documentGetCollections(uri));

assertions.push(
  test.assertTrue(resp.context !== null, 'context was set'),
  test.assertEqual('test-col-1', resp.context.collections, 'context was filtered by OutputPath'),
  test.assertEqual('John', resp.context.name.first, 'context was filtered by OutputPath'),
  test.assertEqual('Doe', resp.context.name.last, 'context was filtered by OutputPath'),
  test.assertEqual(
    'testing, testing, 1-2-3',
    resp.context.test,
    'context was filtered by OutputPath'
  ),
  test.assertEqual('add-collections', resp.status),
  test.assertFalse(colls.includes('test-col-1'), 'doc does not yet have collection')
);

// test filtering Parameters and output by OutputPath
resp = isolate(() => sc.executeStateByExecutionDoc(xdmp.toJSON(resp), false));
colls = isolate(() => xdmp.documentGetCollections(uri));

assertions.push(
  test.assertTrue(resp.context !== null, 'context was set'),
  test.assertEqual('testing, testing, 1-2-3', resp.context, 'context was filtered by OutputPath'),
  test.assertEqual('success', resp.status),
  test.assertTrue(colls.includes('test-col-1'), 'doc had collection applied using params')
);

// test root level OutputPath
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'ref-path-state-machine',
  status: 'working',
  status: 'test-data2',
  uri: uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertTrue(resp.context !== null, 'context was set'),
  test.assertEqual(
    JSON.stringify({ inner: { name: { test: 'test' } } }),
    JSON.stringify(resp.context),
    'context was returned at root level'
  ),
  test.assertEqual('success', resp.status)
);

executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'ref-path-state-machine',
  status: 'working',
  status: 'test-data3',
  uri: uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertTrue(resp.context !== null, 'context was set'),
  test.assertEqual('foo', resp.context, 'context was returned at root level'),
  test.assertEqual('success', resp.status)
);

// test InputPath filtering
executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'ref-path-state-machine',
  status: 'working',
  status: 'add-collections2',
  uri: uri,
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  context: {
    nested: {
      nested: {
        deep: {
          collections: 'test-col-2',
          test: 'hello world',
        },
      },
    },
  },
  provenance: [],
});

colls = isolate(() => xdmp.documentGetCollections(uri));
assertions.push(test.assertFalse(colls.includes('test-col-2'), 'doc does not yet have collection'));

resp = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));
colls = isolate(() => xdmp.documentGetCollections(uri));

xdmp.log(resp);
xdmp.log(colls);

assertions.push(
  test.assertTrue(resp.context !== null, 'context was set'),
  test.assertTrue(colls.includes('test-col-2'), 'doc had collection applied using params'),
  test.assertEqual('hello world', resp.context, 'context was filtered by OutputPath'),
  test.assertEqual('success', resp.status)
);

// return
assertions;
