'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, resp;

executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'choice-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    name: 'John Doe',
    gender: 'male',
    phone: '555-5555',
  },
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, resp.status),
  test.assertEqual('enroll-in-mens-health', resp.state)
);

executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'choice-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    name: 'John Doe',
    gender: 'm',
    phone: '555-5555',
  },
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, resp.status),
  test.assertEqual('enroll-in-mens-health', resp.state)
);

executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'choice-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    name: 'Jane Doe',
    gender: 'female',
    phone: '555-5555',
  },
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, resp.status),
  test.assertEqual('enroll-in-womens-health', resp.state)
);

executionDoc = xdmp.toJSON({
  id: sem.uuidString(),
  name: 'choice-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    name: 'Jane Doe',
    gender: 'f',
    phone: '555-5555',
  },
});

resp = sc.executeStateByExecutionDoc(executionDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.STATE_MACHINE_STATUS_WORKING, resp.status),
  test.assertEqual('enroll-in-womens-health', resp.state)
);

// return
assertions;
