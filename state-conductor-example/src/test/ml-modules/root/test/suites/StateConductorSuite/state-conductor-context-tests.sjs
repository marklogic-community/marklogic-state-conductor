'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const testStateMachine = sc.getStateMachine('test-state-machine').toObject();
const branchingStateMachine = sc.getStateMachine('branching-state-machine').toObject();
const noContextStateMachine = sc.getStateMachine('no-context-state-machine').toObject();

const doc1 = '/data/test-doc1.json';
const doc2 = '/data/test-doc2.json';
const doc3 = '/data/test-doc3.json';

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

// initial state
assertions.push(
  test.assertEqual(false, sc.checkStateMachineContext(doc1, testStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc1, branchingStateMachine)),
  test.assertEqual(true, sc.checkStateMachineContext(doc2, testStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc2, branchingStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc3, testStateMachine)),
  test.assertEqual(true, sc.checkStateMachineContext(doc3, branchingStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc1, noContextStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc2, noContextStateMachine)),
  test.assertEqual(false, sc.checkStateMachineContext(doc3, noContextStateMachine))
);

// update 1
isolate(() => xdmp.documentAddCollections(doc1, ['test']));
assertions.push(
  test.assertEqual(
    true,
    isolate(() => sc.checkStateMachineContext(doc1, testStateMachine))
  ),
  test.assertEqual(
    false,
    isolate(() => sc.checkStateMachineContext(doc1, branchingStateMachine))
  ),
  test.assertEqual(
    false,
    isolate(() => sc.checkStateMachineContext(doc1, noContextStateMachine))
  )
);

// update 2
isolate(() => xdmp.documentAddCollections(doc1, ['enrollee']));
assertions.push(
  test.assertEqual(
    true,
    isolate(() => sc.checkStateMachineContext(doc1, testStateMachine))
  ),
  test.assertEqual(
    true,
    isolate(() => sc.checkStateMachineContext(doc1, branchingStateMachine))
  ),
  test.assertEqual(
    false,
    isolate(() => sc.checkStateMachineContext(doc1, noContextStateMachine))
  )
);

// check no context stateMachine's empty context produces a false query
assertions.push(
  test.assertEqual(cts.falseQuery().toString(), sc.getStateMachineContextQuery(noContextStateMachine).toString())
);

assertions;
