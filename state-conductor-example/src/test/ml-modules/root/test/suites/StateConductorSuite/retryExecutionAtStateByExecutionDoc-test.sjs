'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//checks a failed state working
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'parameters-check',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check working'));

//checks a waiting state new
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_NEW,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check new'));

//checks a waiting state waitting
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_WATING,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check new'));

//checks a waiting state complete
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_COMPLETE,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check new'));

//retry failed status
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, 'working retry'));
assertions.push(test.assertFalse(assertion.hasOwnProperty('parameters-check'), 'next step retry'));

//retry an unknown state
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'unknownStep', 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('INVALID-STATE-DEFINITION', assertion.errors['dialUp'].name, 'unknownStep')
);

//retry an NEW state
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'NEW', 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('INVALID-STATE-DEFINITION', assertion.errors['dialUp'].name, 'NEW')
);

//unKnown database (content)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['dialUp'].name, 'unknown database content')
);

//unKnown module database
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, 'working retry'));
assertions.push(test.assertFalse(assertion.hasOwnProperty('parameters-check'), 'next step retry'));

//unKnown database both
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: sc.STATE_MACHINE_STATUS_FAILED,
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 12345,
  modules: 12345,
  provenance: [],
});

assertion = sc.retryExecutionAtStateByExecutionDoc(executionDoc, 'dialUp', 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['dialUp'].name, 'unknown database both')
);

assertions;
