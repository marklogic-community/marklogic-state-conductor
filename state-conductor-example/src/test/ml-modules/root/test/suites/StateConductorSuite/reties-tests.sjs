const sc = require('/state-conductor/state-conductor.sjs');

const test = require('/test/test-helper.xqy');

// helper to allow processing in seperate transactions
function isolate(func, db) {
  db = db || xdmp.database();
  return fn.head(
    xdmp.invokeFunction(
      () => {
        declareUpdate();
        return func();
      },
      {
        isolation: 'different-transaction',
        commit: 'auto',
        database: db,
      }
    )
  );
}

const assertions = [];
let jobDoc, assertion;

//none prevous retries
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

assertions.push(test.assertEqual(1, assertion.retries['States.ALL'], 'none-All'));
assertions.push(test.assertEqual(1, assertion.provenance[0]['retryNumber'], 'none-number'));
assertions.push(test.assertEqual('working', assertion.flowStatus, 'none-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'none-error'));

//one below max retry
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
  retries: {
    'States.ALL': sc.MAX_RETRY_ATTEMPTS - 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(sc.MAX_RETRY_ATTEMPTS, assertion.retries['States.ALL'], 'below-all')
);
assertions.push(
  test.assertEqual(sc.MAX_RETRY_ATTEMPTS, assertion.provenance[0]['retryNumber'], 'below-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'below-stauts'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'below-error'));

//the limit
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
  retries: {
    'States.ALL': sc.MAX_RETRY_ATTEMPTS,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(sc.MAX_RETRY_ATTEMPTS, assertion.retries['States.ALL'], 'limit-all')
);

assertions.push(test.assertEqual('failed', assertion.flowStatus, 'limit-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'limit-error'));

//more than the limit
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
  retries: {
    'States.ALL': sc.MAX_RETRY_ATTEMPTS + 10,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(sc.MAX_RETRY_ATTEMPTS + 10, assertion.retries['States.ALL'], 'limitMore-all')
);

assertions.push(test.assertEqual('failed', assertion.flowStatus, 'limitMore-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'limitMore-error'));

// MaxAttempts set at 4
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'fourMaxAttempts',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'States.ALL': 3,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['States.ALL'], 'MaxAttemptsSet-all'));
assertions.push(
  test.assertEqual(4, assertion.provenance[0]['retryNumber'], 'MaxAttemptsSet-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'MaxAttemptsSet-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.fourMaxAttempts.name, 'MaxAttemptsSet-error')
);

// named
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'named',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'named-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'named-number'));
assertions.push(test.assertEqual('working', assertion.flowStatus, 'named-flowStatus'));
assertions.push(test.assertEqual('error', assertion.errors.named.name, 'named-error'));

// star
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'star',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    '*': 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['*'], 'star-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'star-number'));
assertions.push(test.assertEqual('working', assertion.flowStatus, 'star-flowStatus'));
assertions.push(test.assertEqual('error', assertion.errors.star.name, 'star-error'));

// multipleMatch
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'multipleMatch-all'));
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMatch-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'multipleMatch-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatch-error')
);

// multipleMatch  Max
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMatchMax-all'));
assertions.push(test.assertEqual(1, assertion.retries['*'], 'multipleMatchMax-all'));
assertions.push(
  test.assertEqual(1, assertion.provenance[0]['retryNumber'], 'multipleMatchMax-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'multipleMatchMax-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatchMax-error')
);

// multipleMatch  MaxALL
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 4,
    '*': 4,
    'States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMatchMaxALL-all'));
assertions.push(test.assertEqual(4, assertion.retries['*'], 'multipleMatchMaxALL-all'));
assertions.push(test.assertEqual(4, assertion.retries['States.ALL'], 'multipleMatchMaxALL-all'));

assertions.push(test.assertEqual('failed', assertion.flowStatus, 'multipleMatchMaxALL-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatchMaxALL-error')
);

// multiple
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'multiple-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multiple-number'));
assertions.push(test.assertEqual('working', assertion.flowStatus, 'multiple-flowStatus'));
assertions.push(test.assertEqual('error', assertion.errors.multiple.name, 'multiple-error'));

// multipleMax
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMax-all'));

assertions.push(test.assertEqual('failed', assertion.flowStatus, 'multipleMax-flowStatus'));
assertions.push(test.assertEqual('error', assertion.errors.multiple.name, 'multipleMax-error'));

// multipleOnRetry
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleOnRetry',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,someName': 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error,someName'], 'multipleOnRetry-all'));
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleOnRetry-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'multipleOnRetry-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleOnRetry.name, 'multipleOnRetry-error')
);

// multipleMultiple
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMultiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(2, assertion.retries['error,*,States.ALL'], 'multipleMultiple-all')
);
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMultiple-number')
);
assertions.push(test.assertEqual('working', assertion.flowStatus, 'multipleMultiple-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMultiple.name, 'multipleMultiple-error')
);

// multipleMultipleMax
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMultiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(4, assertion.retries['error,*,States.ALL'], 'multipleMultipleMax-all')
);

assertions.push(test.assertEqual('failed', assertion.flowStatus, 'multipleMultipleMax-flowStatus'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMultiple.name, 'multipleMultipleMax-error')
);

// multipleMultipleMatch
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMultipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 1,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(2, assertion.retries['error,*,States.ALL'], 'multipleMultipleMatch-all')
);
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMultipleMatch-number')
);
assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'multipleMultipleMatch-flowStatus')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatch-error'
  )
);

// multipleMultipleMatchMax
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMultipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(4, assertion.retries['error,*,States.ALL'], 'multipleMultipleMatchMax-all')
);
assertions.push(
  test.assertEqual(1, assertion.retries['States.ALL'], 'multipleMultipleMatchMax-all')
);

assertions.push(
  test.assertEqual(1, assertion.provenance[0]['retryNumber'], 'multipleMultipleMatchMax-number')
);
assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'multipleMultipleMatchMax-flowStatus')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatchMax-error'
  )
);

// multipleMultipleMatchMaxALL
jobDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  flowName: 'retry-flow',
  flowStatus: sc.FLOW_STATUS_WORKING,
  flowState: 'multipleMultipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 4,
    'States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByJobDoc(jobDoc, false));

assertions.push(
  test.assertEqual(4, assertion.retries['error,*,States.ALL'], 'multipleMultipleMatchMaxALL-all')
);
assertions.push(
  test.assertEqual(4, assertion.retries['States.ALL'], 'multipleMultipleMatchMaxALL-all')
);

assertions.push(
  test.assertEqual('failed', assertion.flowStatus, 'multipleMultipleMatchMaxALL-flowStatus')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatchMaxALL-error'
  )
);

assertions;
