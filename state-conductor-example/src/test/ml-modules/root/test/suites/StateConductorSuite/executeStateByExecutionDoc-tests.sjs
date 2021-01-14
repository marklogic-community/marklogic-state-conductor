'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//checks see the working statuts
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

error = null;

try {
  error = sc.executeStateByExecutionDoc(executionDoc, false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check working || new'));

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
  error = sc.executeStateByExecutionDoc(executionDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check working || waiting')
);

//checks see the working statuts
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

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual(1, assertion.provenance.length, 'provenance check'));

//checks see if there are states
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'noStates-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('INVALID-STATE-DEFINITION', assertion.errors['find-gender'].name)
);

//checks see if the context was updated with a task
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'task-state-machine',
  status: 'working',
  state: 'update-context',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('Hello Word', assertion.context, 'context check'));

//checks see if the the parameters is used
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'task-state-machine',
  status: 'working',
  state: 'parameters-check',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual(
    'Hello David. Shall we play a game?',
    assertion.context.parametersCheck,
    'parameters check'
  )
);

//checks a waiting state
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'working',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('waiting', assertion.status, 'waiting status'));
assertions.push(
  test.assertEqual(
    'series-of-clicks-and-beeps-connected',
    assertion.currentlyWaiting.event,
    'waiting currentlyWaiting'
  )
);

//eventPath tests start
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'working',
  state: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    eventName: 'series-of-clicks-and-beeps:1234',
  },
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('waiting', assertion.status, 'waiting status'));
assertions.push(
  test.assertEqual(
    'series-of-clicks-and-beeps:1234',
    assertion.currentlyWaiting.event,
    'waiting currentlyWaiting'
  )
);

executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'working',
  state: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    eventName: '',
  },
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    assertion.errors['dialUpPath'].name,
    'eventPath empty string'
  )
);

//checks a waiting state
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'working',
  state: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    assertion.errors['dialUpPath'].name,
    'eventPath missing property'
  )
);
//eventPath tests end

//unKnown database (content)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database content')
);

//unKnown module database
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database modules')
);

//unKnown database both
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 12345,
  modules: 12345,
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database both')
);

// missing action modules test
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'bad-state-machine',
  status: 'working',
  state: 'set-prop1',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'XDMP-MODNOTFOUND',
    assertion.errors['set-prop1'].name,
    'detected missing action module'
  )
);

// missing condition modules test
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'bad-state-machine',
  status: 'working',
  state: 'branch',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual(
    'XDMP-MODNOTFOUND',
    assertion.errors['branch'].name,
    'detected missing condition module'
  )
);

// checks that a state machine that terminates in a "Fail" state has the "failed" status applied
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'test-state-machine',
  status: 'working',
  state: 'failed',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(test.assertEqual('failed', assertion.status, 'status check'));

assertions;
