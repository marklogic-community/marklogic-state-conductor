'use strict';

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const flowDocuments = sc.getFlowDocuments().toArray();
assertions.push(
  test.assertEqual(5, flowDocuments.length, 'Flow files are present')
);

const flowNames = sc.getFlowNames().sort();
assertions.push(
  test.assertEqual(5, flowNames.length, "flowNames count"),
  test.assertEqual('branching-flow', flowNames[0]),
  test.assertEqual('no-context-flow', flowNames[1]),
  test.assertEqual('noStates-flow', flowNames[2]),
  test.assertEqual('task-flow', flowNames[3]),
  test.assertEqual('test-flow', flowNames[4]),
);

const branchingFlow = sc.getFlowDocument('branching-flow');
assertions.push(
  test.assertTrue(!!branchingFlow),
  test.assertEqual('find-gender', branchingFlow.toObject().StartAt)
);

const testFlow = sc.getFlowDocument('test-flow');
assertions.push(
  test.assertTrue(!!testFlow),
  test.assertEqual('set-prop1', testFlow.toObject().StartAt),
  test.assertEqual(2, testFlow.toObject().mlDomain.context.length)
);

assertions.push(
  test.assertEqual('branching-flow', sc.getFlowNameFromUri(fn.documentUri(branchingFlow))),
  test.assertEqual('test-flow', sc.getFlowNameFromUri(fn.documentUri(testFlow)))
);

assertions.push(
  test.assertEqual('set-prop1', sc.getInitialState(testFlow.toObject())),
  test.assertEqual('find-gender', sc.getInitialState(branchingFlow.toObject()))
);

assertions;