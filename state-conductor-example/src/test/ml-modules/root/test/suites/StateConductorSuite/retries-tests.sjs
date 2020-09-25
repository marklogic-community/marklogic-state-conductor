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
let executionDoc, assertion;

//none prevous retries
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

assertions.push(test.assertEqual(1, assertion.retries['States.ALL'], 'none-All'));
assertions.push(test.assertEqual(1, assertion.provenance[0]['retryNumber'], 'none-number'));
assertions.push(test.assertEqual('working', assertion.status, 'none-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'none-error'));

//one below max retry
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
  retries: {
    'States.ALL': sc.DEFAULT_MAX_RETRY_ATTEMPTS - 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(sc.DEFAULT_MAX_RETRY_ATTEMPTS, assertion.retries['States.ALL'], 'below-all')
);
assertions.push(
  test.assertEqual(
    sc.DEFAULT_MAX_RETRY_ATTEMPTS,
    assertion.provenance[0]['retryNumber'],
    'below-number'
  )
);
assertions.push(test.assertEqual('working', assertion.status, 'below-stauts'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'below-error'));

//the limit
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
  retries: {
    'States.ALL': sc.DEFAULT_MAX_RETRY_ATTEMPTS,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(sc.DEFAULT_MAX_RETRY_ATTEMPTS, assertion.retries['States.ALL'], 'limit-all')
);

assertions.push(test.assertEqual('failed', assertion.status, 'limit-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'limit-error'));

//more than the limit
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
  retries: {
    'States.ALL': sc.DEFAULT_MAX_RETRY_ATTEMPTS + 10,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(
    sc.DEFAULT_MAX_RETRY_ATTEMPTS + 10,
    assertion.retries['States.ALL'],
    'limitMore-all'
  )
);

assertions.push(test.assertEqual('failed', assertion.status, 'limitMore-status'));
assertions.push(test.assertEqual('error', assertion.errors.errorOut.name, 'limitMore-error'));

// MaxAttempts set at 4
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'fourMaxAttempts',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'States.ALL': 3,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['States.ALL'], 'MaxAttemptsSet-all'));
assertions.push(
  test.assertEqual(4, assertion.provenance[0]['retryNumber'], 'MaxAttemptsSet-number')
);
assertions.push(test.assertEqual('working', assertion.status, 'MaxAttemptsSet-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.fourMaxAttempts.name, 'MaxAttemptsSet-error')
);

// named
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'named',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'named-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'named-number'));
assertions.push(test.assertEqual('working', assertion.status, 'named-status'));
assertions.push(test.assertEqual('error', assertion.errors.named.name, 'named-error'));

// star
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'star',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    '*': 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['*'], 'star-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'star-number'));
assertions.push(test.assertEqual('working', assertion.status, 'star-status'));
assertions.push(test.assertEqual('error', assertion.errors.star.name, 'star-error'));

// multipleMatch
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'multipleMatch-all'));
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMatch-number')
);
assertions.push(test.assertEqual('working', assertion.status, 'multipleMatch-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatch-error')
);

// multipleMatch  Max
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 4,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMatchMax-all'));
assertions.push(test.assertEqual(1, assertion.retries['*'], 'multipleMatchMax-all'));
assertions.push(
  test.assertEqual(1, assertion.provenance[0]['retryNumber'], 'multipleMatchMax-number')
);
assertions.push(test.assertEqual('working', assertion.status, 'multipleMatchMax-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatchMax-error')
);

// multipleMatch  MaxALL
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMatch',
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

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMatchMaxALL-all'));
assertions.push(test.assertEqual(4, assertion.retries['*'], 'multipleMatchMaxALL-all'));
assertions.push(test.assertEqual(4, assertion.retries['States.ALL'], 'multipleMatchMaxALL-all'));

assertions.push(test.assertEqual('failed', assertion.status, 'multipleMatchMaxALL-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMatch.name, 'multipleMatchMaxALL-error')
);

// multiple
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error'], 'multiple-all'));
assertions.push(test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multiple-number'));
assertions.push(test.assertEqual('working', assertion.status, 'multiple-status'));
assertions.push(test.assertEqual('error', assertion.errors.multiple.name, 'multiple-error'));

// multipleMax
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    error: 4,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(4, assertion.retries['error'], 'multipleMax-all'));

assertions.push(test.assertEqual('failed', assertion.status, 'multipleMax-status'));
assertions.push(test.assertEqual('error', assertion.errors.multiple.name, 'multipleMax-error'));

// multipleOnRetry
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleOnRetry',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,someName': 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(test.assertEqual(2, assertion.retries['error,someName'], 'multipleOnRetry-all'));
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleOnRetry-number')
);
assertions.push(test.assertEqual('working', assertion.status, 'multipleOnRetry-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleOnRetry.name, 'multipleOnRetry-error')
);

// multipleMultiple
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMultiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(2, assertion.retries['error,*,States.ALL'], 'multipleMultiple-all')
);
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMultiple-number')
);
assertions.push(test.assertEqual('working', assertion.status, 'multipleMultiple-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMultiple.name, 'multipleMultiple-error')
);

// multipleMultipleMax
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMultiple',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(4, assertion.retries['error,*,States.ALL'], 'multipleMultipleMax-all')
);

assertions.push(test.assertEqual('failed', assertion.status, 'multipleMultipleMax-status'));
assertions.push(
  test.assertEqual('error', assertion.errors.multipleMultiple.name, 'multipleMultipleMax-error')
);

// multipleMultipleMatch
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMultipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 1,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(2, assertion.retries['error,*,States.ALL'], 'multipleMultipleMatch-all')
);
assertions.push(
  test.assertEqual(2, assertion.provenance[0]['retryNumber'], 'multipleMultipleMatch-number')
);
assertions.push(
  test.assertEqual('working', assertion.status, 'multipleMultipleMatch-status')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatch-error'
  )
);

// multipleMultipleMatchMax
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMultipleMatch',
  uri: '/data/johndoe.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  provenance: [],
  context: {},
  retries: {
    'error,*,States.ALL': 4,
  },
});

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

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
  test.assertEqual('working', assertion.status, 'multipleMultipleMatchMax-status')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatchMax-error'
  )
);

// multipleMultipleMatchMaxALL
executionDoc = xdmp.toJSON({
  id: '0405536f-dd84-4ca6-8de8-c57062b2252d',
  name: 'retry-state-machine',
  status: sc.STATE_MACHINE_STATUS_WORKING,
  state: 'multipleMultipleMatch',
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

assertion = isolate(() => sc.executeStateByExecutionDoc(executionDoc, false));

assertions.push(
  test.assertEqual(4, assertion.retries['error,*,States.ALL'], 'multipleMultipleMatchMaxALL-all')
);
assertions.push(
  test.assertEqual(4, assertion.retries['States.ALL'], 'multipleMultipleMatchMaxALL-all')
);

assertions.push(
  test.assertEqual('failed', assertion.status, 'multipleMultipleMatchMaxALL-status')
);
assertions.push(
  test.assertEqual(
    'error',
    assertion.errors.multipleMultipleMatch.name,
    'multipleMultipleMatchMaxALL-error'
  )
);

assertions;
