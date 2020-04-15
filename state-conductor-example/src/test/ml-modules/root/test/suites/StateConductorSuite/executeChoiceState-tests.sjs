'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, resp;

jobDoc = xdmp.toJSON({
  id: sem.uuidString(),
  flowName: 'choice-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'find-gender',
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

resp = sc.executeStateByJobDoc(jobDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.FLOW_STATUS_WORKING, resp.flowStatus),
  test.assertEqual('enroll-in-mens-health', resp.flowState)
);

jobDoc = xdmp.toJSON({
  id: sem.uuidString(),
  flowName: 'choice-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'find-gender',
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

resp = sc.executeStateByJobDoc(jobDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.FLOW_STATUS_WORKING, resp.flowStatus),
  test.assertEqual('enroll-in-mens-health', resp.flowState)
);

jobDoc = xdmp.toJSON({
  id: sem.uuidString(),
  flowName: 'choice-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'find-gender',
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

resp = sc.executeStateByJobDoc(jobDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.FLOW_STATUS_WORKING, resp.flowStatus),
  test.assertEqual('enroll-in-womens-health', resp.flowState)
);

jobDoc = xdmp.toJSON({
  id: sem.uuidString(),
  flowName: 'choice-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'find-gender',
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

resp = sc.executeStateByJobDoc(jobDoc, false);

// tests that the correct choice state was applied
assertions.push(
  test.assertEqual(sc.FLOW_STATUS_WORKING, resp.flowStatus),
  test.assertEqual('enroll-in-womens-health', resp.flowState)
);

// return
assertions;
