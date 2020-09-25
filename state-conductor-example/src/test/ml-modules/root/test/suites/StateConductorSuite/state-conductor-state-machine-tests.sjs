'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const stateMachineDocuments = sc.getStateMachines().toArray();
assertions.push(test.assertEqual(12, stateMachineDocuments.length, 'StateMachine files are present'));

const names = sc.getStateMachineNames().sort();
assertions.push(
  test.assertEqual(12, names.length, 'names count'),
  test.assertEqual('bad-state-machine', names[0]),
  test.assertEqual('branching-state-machine', names[1]),
  test.assertEqual('choice-state-machine', names[2]),
  test.assertEqual('contextual-state-machine', names[3]),
  test.assertEqual('no-context-state-machine', names[4]),
  test.assertEqual('noStates-state-machine', names[5]),
  test.assertEqual('ref-path-state-machine', names[6]),
  test.assertEqual('retry-state-machine', names[7]),
  test.assertEqual('task-state-machine', names[8]),
  test.assertEqual('test-state-machine', names[9]),
  test.assertEqual('test-time-wait', names[10]),
  test.assertEqual('wait-state-machine', names[11])
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
  test.assertEqual('branching-state-machine', sc.getStateMachineNameFromUri(fn.documentUri(branchingStateMachine))),
  test.assertEqual('test-state-machine', sc.getStateMachineNameFromUri(fn.documentUri(testStateMachine)))
);

assertions.push(
  test.assertEqual('set-prop1', sc.getInitialState(testStateMachine.toObject())),
  test.assertEqual('find-gender', sc.getInitialState(branchingStateMachine.toObject()))
);

assertions;
