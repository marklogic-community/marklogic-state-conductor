'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, assertion;

jobDoc = xdmp.toJSON({
  id: '4164b17b-06a5-499b-8870-539add9f69c2',
  flowName: 'test-time-wait',
  flowStatus: 'working',
  flowState: 'run-in-the-future',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  createdDate: '2020-03-17T21:41:19.022Z',
  context: {},
  provenance: [],
  errors: {},
});

//"test excute job")
assertion = sc.executeStateByJobDoc(jobDoc, false);
assertions.push(
  test.assertEqual('waiting', assertion.flowStatus, 'waiting flowStatus')
);
assertions.push(
  test.assertTrue(
    assertion.hasOwnProperty('currentlyWaiting'),
    'waiting currentlyWaiting'
  )
);

jobDoc = xdmp.toJSON({
  id: '4164b17b-06a5-499b-8870-539add9f69c2',
  flowName: 'test-time-wait',
  flowStatus: 'waiting',
  flowState: 'run-in-the-future',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  createdDate: '2020-03-17T21:41:19.022Z',
  context: {},
  provenance: [
    {
      date: '2020-03-17T21:41:19.510Z',
      from: 'NEW',
      to: 'run-in-the-future',
    },
    {
      date: '2020-03-17T21:41:19.527Z',
      state: 'run-in-the-future',
      waiting: {
        timestamp: '2020-03-17T13:15:00Z',
        nextTaskTime: '2020-03-17T13:15:00-04:00',
      },
    },
  ],
  errors: {},
  currentlyWaiting: {
    timestamp: '2020-03-17T13:15:00Z',
    nextTaskTime: '2020-03-17T13:15:00-04:00',
  },
});

//"found waiting job")
assertion = sc.resumeWaitingJobByJobDoc(jobDoc, 'waitTask', false);
assertions.push(
  test.assertEqual('working', assertion.flowStatus, 'working flowStatus')
);
assertions.push(
  test.assertEqual(
    'needs-envelope',
    assertion.provenance[3].to,
    'went to next state'
  )
);
assertions.push(
  test.assertFalse(
    assertion.hasOwnProperty('currentlyWaiting'),
    'waiting currentlyWaiting'
  )
);
assertions.push(
  test.assertEqual('needs-envelope', assertion.flowState, 'working flowStatus')
);
assertions;
