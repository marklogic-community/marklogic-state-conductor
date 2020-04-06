'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//checks see if the new status check is working
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

error = null;

try {
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check working')
);

//check waiting status
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
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-FLOW-STATUS', error.name, 'status check waiting')
);

//check for missing flow file
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'random-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;
try {
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('MISSING-FLOW-FILE', error.name, 'missing flow file')
);

//check for missing flow file
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'noStates-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;
try {
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('INVALID-STATE-DEFINITION', error.name, 'no StartAt step')
);

//check for missing flow file
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

assertion = sc.startProcessingFlowByJobDoc(jobDoc, false);

assertions.push(test.assertEqual('working', assertion.flowStatus, 'new flow'));

//unKnown database (content)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 1233456,
  modules: xdmp.modulesDatabase(),
  provenance: [],
});

error = null;
try {
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('XDMP-NODB', error.name, 'unKnown database content')
);

//unKnown database (module)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: xdmp.database(),
  modules: 1233456,
  provenance: [],
});

assertion = sc.startProcessingFlowByJobDoc(jobDoc, false);

assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'unKnown database module')
);

//unKnown database (both)
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'new',
  flowState: 'find-gender',
  uri: '/data/test-doc3.json',
  database: 9678094,
  modules: 1233456,
  provenance: [],
});

error = null;
try {
  error = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual('XDMP-NODB', error.name, 'unKnown database both')
);

assertions;
