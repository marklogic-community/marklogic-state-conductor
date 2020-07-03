'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

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
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'find-gender',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = sc.executeStateByJobDoc(jobDoc, false);

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
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'branching-flow',
  flowStatus: 'working',
  flowState: 'enroll-in-mens-health',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

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
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'task-flow',
  flowStatus: 'working',
  flowState: 'update-context',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

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

//resumeWaitingJobByJobDoc
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'wait-flow',
  flowStatus: 'waiting',
  flowState: 'dialUp',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
});

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'testing', false);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'resumeWaitingJobByJobDoc-date'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[0].state, 'dialUp', 'resumeWaitingJobByJobDoc-state')
);
assertions.push(
  test.assertEqual(assertion.provenance[0].resumeBy, 'testing', 'resumeWaitingJobByJobDoc-testing')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'resumeWaitingJobByJobDoc-executionTime'
  )
);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[1].date),
    'resumeWaitingJobByJobDoc-date2'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[1].from, 'dialUp', 'resumeWaitingJobByJobDoc-from')
);
assertions.push(
  test.assertEqual(assertion.provenance[1].to, 'parameters-check', 'resumeWaitingJobByJobDoc-to')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[1].executionTime
    ),
    'resumeWaitingJobByJobDoc-executionTime2'
  )
);

//retryJobAtStateByJobDoc
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
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[0].date),
    'retryJobAtStateByJobDoc-date'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[0].state, 'dialUp', 'retryJobAtStateByJobDoc-state')
);
assertions.push(
  test.assertEqual(assertion.provenance[0].retriedBy, 'testing', 'retryJobAtStateByJobDoc-testing')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[0].executionTime
    ),
    'retryJobAtStateByJobDoc-executionTime'
  )
);

assertions.push(
  test.assertTrue(
    xdmp.castableAs('http://www.w3.org/2001/XMLSchema', 'dateTime', assertion.provenance[1].date),
    'retryJobAtStateByJobDoc-date2'
  )
);
assertions.push(
  test.assertEqual(assertion.provenance[1].from, 'dialUp', 'retryJobAtStateByJobDoc-from')
);
assertions.push(
  test.assertEqual(assertion.provenance[1].to, 'parameters-check', 'retryJobAtStateByJobDoc-to')
);
assertions.push(
  test.assertTrue(
    xdmp.castableAs(
      'http://www.w3.org/2001/XMLSchema',
      'duration',
      assertion.provenance[1].executionTime
    ),
    'retryJobAtStateByJobDoc-executionTime2'
  )
);

// retry
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'errorOut',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

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
