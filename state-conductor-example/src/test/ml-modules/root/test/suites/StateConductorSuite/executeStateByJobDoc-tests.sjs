'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//checks see the working statuts
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.executeStateByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check working || new'));

jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'waiting',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.executeStateByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check working || waiting')
);

//checks see the working statuts
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual(1, assertion.provenance.length, 'provenance check'));

//checks see if there are states
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'noStates-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual('INVALID-STATE-DEFINITION', assertion.errors['find-gender'].name)
);

//checks see if the context was updated with a task
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'task-flow',
  flowStatus: 'working',
  flowState: 'update-context',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual('Hello Word', assertion.context, 'context check'));

//checks see if the the parameters is used
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'task-flow',
  flowStatus: 'working',
  flowState: 'parameters-check',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual(
    'Hello David. Shall we play a game?',
    assertion.context.parametersCheck,
    'parameters check'
  )
);

//checks a waiting state
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'working',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual('waiting', assertion.flowStatus, 'waiting flowStatus'));
assertions.push(
  test.assertEqual(
    'series-of-clicks-and-beeps-connected',
    assertion.currentlyWaiting.event,
    'waiting currentlyWaiting'
  )
);

//eventPath tests start
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'working',
  flowState: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    eventName: 'series-of-clicks-and-beeps:1234',
  },
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual('waiting', assertion.flowStatus, 'waiting flowStatus'));
assertions.push(
  test.assertEqual(
    'series-of-clicks-and-beeps:1234',
    assertion.currentlyWaiting.event,
    'waiting currentlyWaiting'
  )
);

jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'working',
  flowState: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {
    eventName: '',
  },
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    assertion.errors['dialUpPath'].name,
    'eventPath empty string'
  )
);

//checks a waiting state
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'working',
  flowState: 'dialUpPath',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual(
    'INVALID-STATE-DEFINITION',
    assertion.errors['dialUpPath'].name,
    'eventPath missing property'
  )
);
//eventPath tests end

//unKnown database (content)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database content')
);

//unKnown module database
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database modules')
);

//unKnown database both
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 12345,
  modules: 12345,
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual('XDMP-NODB', assertion.errors['find-gender'].name, 'unknown database both')
);

// missing action modules test
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'bad-flow',
  flowStatus: 'working',
  flowState: 'set-prop1',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual(
    'XDMP-MODNOTFOUND',
    assertion.errors['set-prop1'].name,
    'detected missing action module'
  )
);

// missing condition modules test
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'bad-flow',
  flowStatus: 'working',
  flowState: 'branch',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'status check'),
  test.assertEqual(
    'XDMP-MODNOTFOUND',
    assertion.errors['branch'].name,
    'detected missing condition module'
  )
);

assertions;
