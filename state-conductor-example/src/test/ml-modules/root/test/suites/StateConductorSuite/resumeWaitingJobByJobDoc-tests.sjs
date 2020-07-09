'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//checks a waiting state working
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

error = null;

try {
  error = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check working'));

//checks a waiting state working
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'new',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check new'));

//resume waiting
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.flowStatus, 'working flowStatus'));
assertions.push(
  test.assertFalse(assertion.hasOwnProperty('currentlyWaiting'), 'waiting currentlyWaiting')
);

//unKnown database (content)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'flowStatus check'),
  test.assertEqual('XDMP-NODB', assertion.errors['dialUp'].name, 'unknown database content')
);

//unKnown module database
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);

assertions.push(test.assertEqual('working', assertion.flowStatus, 'working flowStatus'));
assertions.push(
  test.assertFalse(assertion.hasOwnProperty('currentlyWaiting'), 'waiting currentlyWaiting')
);

//unKnown database both
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 12345,
  modules: 12345,
  provenance: [],
});

error = null;
try {
  error = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);
} catch (e) {
  error = e;
}

//processJob event
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
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
  error = sc.resumeWaitingJobByJobDoc(jobDoc, 'processJob', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-CurrentlyWaiting', error.name, 'processJob event'));

//processJob wait to early
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
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
  error = sc.resumeWaitingJobByJobDoc(jobDoc, 'processJob', false);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-CurrentlyWaiting', error.name, 'wait to early'));

//processJob wait after
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime().subtract(xs.dayTimeDuration('P0DT1M')),
  },
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'processJob', false);

assertions.push(test.assertEqual('working', assertion.flowStatus, 'wait after'));

//processJob wait now
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
  currentlyWaiting: {
    nextTaskTime: fn.currentDateTime(),
  },
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'processJob', false);

assertions.push(test.assertEqual('working', assertion.flowStatus, 'wait now'));

assertions;
