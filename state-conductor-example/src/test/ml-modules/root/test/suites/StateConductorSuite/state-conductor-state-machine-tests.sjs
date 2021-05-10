'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const stateMachineDocuments = sc.getStateMachines().toArray();
assertions.push(
  test.assertTrue(0 < stateMachineDocuments.length, 'StateMachine files are present')
);

const names = sc.getStateMachineNames().sort();
assertions.push(
  test.assertTrue(0 < names.length, 'names count'),
  test.assertTrue(names.includes('bad-state-machine')),
  test.assertTrue(names.includes('branching-state-machine')),
  test.assertTrue(names.includes('choice-state-machine')),
  test.assertTrue(names.includes('contextual-state-machine')),
  test.assertTrue(names.includes('no-context-state-machine')),
  test.assertTrue(names.includes('noStates-state-machine')),
  test.assertTrue(names.includes('ref-path-state-machine')),
  test.assertTrue(names.includes('retry-state-machine')),
  test.assertTrue(names.includes('task-state-machine')),
  test.assertTrue(names.includes('test-state-machine')),
  test.assertTrue(names.includes('test-time-wait')),
  test.assertTrue(names.includes('wait-state-machine'))
);

const branchingStateMachine = sc.getStateMachine('branching-state-machine');
assertions.push(
  test.assertTrue(!!branchingStateMachine),
  test.assertEqual('find-gender', branchingStateMachine.toObject().StartAt)
);

const testStateMachine = sc.getStateMachine('test-state-machine');
assertions.push(
  test.assertTrue(!!testStateMachine),
  test.assertEqual('set-prop1', testStateMachine.toObject().StartAt),
  test.assertEqual(2, testStateMachine.toObject().mlDomain.context.length)
);

assertions.push(
  test.assertEqual(
    'branching-state-machine',
    sc.getStateMachineNameFromUri(fn.documentUri(branchingStateMachine))
  ),
  test.assertEqual(
    'test-state-machine',
    sc.getStateMachineNameFromUri(fn.documentUri(testStateMachine))
  )
);

assertions.push(
  test.assertEqual('set-prop1', sc.getInitialState(testStateMachine.toObject())),
  test.assertEqual('find-gender', sc.getInitialState(branchingStateMachine.toObject()))
);

assertions;
