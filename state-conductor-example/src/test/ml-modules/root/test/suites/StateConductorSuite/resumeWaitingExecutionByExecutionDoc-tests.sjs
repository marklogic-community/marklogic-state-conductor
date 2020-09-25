'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//checks a waiting state working
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'working',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

error = null;

try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check working'));

//checks a waiting state working
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'new',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

error = null;

try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-STATE_MACHINE-STATUS', error.name, 'status check new'));

//resume waiting
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, 'working status'));
assertions.push(
  test.assertFalse(assertion.hasOwnProperty('currentlyWaiting'), 'waiting currentlyWaiting')
);

//unKnown database (content)
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.status, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['dialUp'].name, 'unknown database content')
);

//unKnown module database
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, 'working status'));
assertions.push(
  test.assertFalse(assertion.hasOwnProperty('currentlyWaiting'), 'waiting currentlyWaiting')
);

//unKnown database both
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 12345,
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

error = null;
try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);
} catch (e) {
  error = e;
}

//processExecution event
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    event: 'testing',
  },
});

error = null;
try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'processExecution', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-CurrentlyWaiting', error.name, 'processExecution event'));

//processExecution wait to early
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime().add(xs.dayTimeDuration('P0DT1M')),
  },
});

error = null;
try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'processExecution', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-CurrentlyWaiting', error.name, 'processExecution wait to early')
);

//processExecution wait after
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime().subtract(xs.dayTimeDuration('P0DT1M')),
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'processExecution', false);

assertions.push(test.assertEqual('working', assertion.status, 'processExecution wait after'));

//processExecution wait now
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime(),
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'processExecution', false);

//wait to early
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime().add(xs.dayTimeDuration('P0DT1M')),
  },
});

error = null;
try {
  error = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-CurrentlyWaiting', error.name, ' wait to early'));

//wait after
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime().subtract(xs.dayTimeDuration('P0DT1M')),
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, ' wait after'));

//wait now
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime(),
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.status, ' wait now'));

assertions;
