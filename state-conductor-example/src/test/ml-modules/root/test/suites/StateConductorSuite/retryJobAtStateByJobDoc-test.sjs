'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//checks a failed state working
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'parameters-check',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check working')
);

//checks a waiting state new
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_NEW,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check new')
);

//checks a waiting state waitting
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_WATING,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check new')
);

//checks a waiting state complete
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_COMPLETE,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check new')
);

//retry failed flowStatus
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

assertion = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);

assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'working retry')
);
assertions.push(
  test.assertFalse(
    assertion.hasOwnProperty('parameters-check'),
    'next step retry'
  )
);

//retry an unknown state
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'unknownStep', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE-DEFINITION', error.name, 'unknownStep')
);

//retry an NEW state
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;

try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'NEW', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE-DEFINITION', error.name, 'NEW')
);

//unKnown database (content)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;
try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('XDMP-NODB', error.name, 'unKnown database content')
);

//unKnown module database
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: 12345,
  provenance: [],
});

assertion = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);

assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'working retry')
);
assertions.push(
  test.assertFalse(
    assertion.hasOwnProperty('parameters-check'),
    'next step retry'
  )
);

//unKnown database both
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: sc.FLOW_STATUS_FAILED,
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: 12345,
  modules: 12345,
  provenance: [],
});

error = null;
try {
  error = sc.retryJobAtStateByJobDoc(jobDoc, 'dialUp', 'testing', false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('XDMP-NODB', error.name, 'unKnown database content')
);
assertions;
