'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, assertion;

executionDoc = xdmp.toJSON({
  id: '4164b17b-06a5-499b-8870-539add9f69c2',
  name: 'test-time-wait',
  status: 'working',
  state: 'run-in-the-future',
  uri: '/data/test-doc1.json',
  database: xdmp.database(),
  modules: xdmp.modulesDatabase(),
  createdDate: '2020-03-17T21:41:19.022Z',
  context: {},
  provenance: [],
  errors: {},
});

//"test excute execution")
//"test excute execution")
assertion = sc.executeStateByExecutionDoc(executionDoc, false);
assertions.push(
  test.assertEqual('waiting', assertion.status, 'waiting status'));
assertions.push(
  test.assertTrue(assertion.hasOwnProperty('currentlyWaiting'))
);
assertions.push(
  test.assertTrue(assertion.currentlyWaiting.hasOwnProperty("nextTaskTime"))
);
assertions.push(
  test.assertTrue(assertion.provenance[0].waiting.hasOwnProperty("doneNextTaskTime"))
);

executionDoc = xdmp.toJSON({
  id: '4164b17b-06a5-499b-8870-539add9f69c2',
  name: 'test-time-wait',
  status: 'waiting',
  state: 'run-in-the-future',
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

//"found waiting execution")
assertion = sc.resumeWaitingExecutionByExecutionDoc(executionDoc, 'waitTask', false);
assertions.push(test.assertEqual('working', assertion.status, 'working status'));
assertions.push(
  test.assertEqual('needs-envelope', assertion.provenance[3].to, 'went to next state')
);
assertions.push(
  test.assertFalse(assertion.hasOwnProperty('currentlyWaiting'), 'waiting currentlyWaiting')
);
assertions.push(test.assertEqual('needs-envelope', assertion.state, 'working status'));
assertions;
