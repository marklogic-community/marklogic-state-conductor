'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//checks see if the new status check is working
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check working')
);

//check waiting status
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'waiting',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;
try {
  error = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check waiting')
);

//check for missing stateMachine file
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'random-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'MISSING-STATE-MACHINE-FILE',
    assertion.errors['find-gender'].name,
    'missing state machine'
  )
);

//check for missing stateMachine file
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'noStates-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    assertion.errors['find-gender'].name,
    'no StartAt step'
  )
);

//check for missing stateMachine file
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('working', assertion.status, 'new stateMachine'));

//unKnown database (content)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database content')
);

//unKnown database (module)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: 1233456,
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('working', assertion.status, 'unKnown database module'));

//unKnown database (both)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'new',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 9678094,
  modules: 1233456,
  provenance: [],
});

assertion = sc.startProcessingStateMachineByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database both')
);

assertions;
