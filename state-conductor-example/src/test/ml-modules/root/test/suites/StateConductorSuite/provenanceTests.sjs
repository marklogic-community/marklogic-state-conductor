'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

function isolate(func) {
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: 'different-transaction',
        commit: 'auto',
      }
    )
  );
}

//new check
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

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'new-date'
  )
);
assertions.push(test.assertEqual(assertion.provenance[0].from, 'NEW', 'new-from'));
assertions.push(test.assertEqual(assertion.provenance[0].to, 'find-gender', 'new-to'));
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'new-executionTime'
  )
);

//choice check
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = sc.executeStateByExecutionDoc(executionDoc, false);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'choice-date'
  )
);
assertions.push(test.assertEqual(assertion.provenance[0].from, 'find-gender', 'choice-from'));
assertions.push(test.assertEqual(assertion.provenance[0].to, 'enroll-in-mens-health', 'choice-to'));
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'choice-executionTime'
  )
);

//COMPLETED check
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'branching-state-machine',
  status: 'working',
  state: 'enroll-in-mens-health',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'COMPLETED-date'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[0].from, 'enroll-in-mens-health', 'COMPLETED-from')
);
assertions.push(test.assertEqual(assertion.provenance[0].to, 'COMPLETED', 'COMPLETED-to'));
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'COMPLETED-executionTime'
  )
);

//task
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'task-state-machine',
  status: 'working',
  state: 'update-context',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'task-date'
  )
);
assertions.push(test.assertEqual(assertion.provenance[0].from, 'update-context', 'task-from'));
assertions.push(test.assertEqual(assertion.provenance[0].to, 'parameters-check', 'task-to'));
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'task-executionTime'
  )
);

//resumeWaitingExecutionByExecutionDoc
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'wait-state-machine',
  status: 'waiting',
  state: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  currentlyWaiting: {
    event: 'testing',
  },
});

assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'testing', false);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'resumeWaitingExecutionByExecutionDoc-date'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[0].resumeState, 'dialUp', 'resumeWaitingExecutionByExecutionDoc-state')
);
assertions.push(
  test.assertEqual(assertion.provenance[0].resumeBy, 'testing', 'resumeWaitingExecutionByExecutionDoc-testing')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'resumeWaitingExecutionByExecutionDoc-executionTime'
  )
);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[1].date),
    'resumeWaitingExecutionByExecutionDoc-date2'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[1].from, 'dialUp', 'resumeWaitingExecutionByExecutionDoc-from')
);
assertions.push(
  test.assertEqual(assertion.provenance[1].to, 'parameters-check', 'resumeWaitingExecutionByExecutionDoc-to')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[1].executionTime
    ),
    'resumeWaitingExecutionByExecutionDoc-executionTime2'
  )
);

//retryExecutionAtStateByExecutionDoc
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

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'retryExecutionAtStateByExecutionDoc-date'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[0].retryState, 'dialUp', 'retryExecutionAtStateByExecutionDoc-state')
);
assertions.push(
  test.assertEqual(assertion.provenance[0].retriedBy, 'testing', 'retryExecutionAtStateByExecutionDoc-testing')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'retryExecutionAtStateByExecutionDoc-executionTime'
  )
);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[1].date),
    'retryExecutionAtStateByExecutionDoc-date2'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[1].from, 'dialUp', 'retryExecutionAtStateByExecutionDoc-from')
);
assertions.push(
  test.assertEqual(assertion.provenance[1].to, 'parameters-check', 'retryExecutionAtStateByExecutionDoc-to')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[1].executionTime
    ),
    'retryExecutionAtStateByExecutionDoc-executionTime2'
  )
);

// retry
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'errorOut',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'retry-date'
  )
);
assertions.push(test.assertEqual(assertion.provenance[0].from, 'errorOut', 'retry-from'));
assertions.push(test.assertEqual(assertion.provenance[0].to, 'errorOut', 'retry-to'));
assertions.push(test.assertEqual(assertion.provenance[0].retryNumber, 1, 'retry-retryNumber'));
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'retry-executionTime'
  )
);

assertions;
