'use strict';

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const testFlow = sc.getFlowDocument('test-flow').toObject();
const branchingFlow = sc.getFlowDocument('branching-flow').toObject();

const doc1 = '/data/test-doc1.json';
const doc2 = '/data/test-doc2.json';
const doc3 = '/data/test-doc3.json';

function isolate(func) {
  return fn.head(xdmp.invokeFunction(() => {
    declareUpdate();
    return func();
  }, {
    isolation: 'different-transaction',
    commit: 'auto'
  }));
}

// initial state
assertions.push(
  test.assertEqual(false, sc.checkFlowContext(doc1, testFlow)),
  test.assertEqual(false, sc.checkFlowContext(doc1, branchingFlow)),
  test.assertEqual(true, sc.checkFlowContext(doc2, testFlow)),
  test.assertEqual(false, sc.checkFlowContext(doc2, branchingFlow)),
  test.assertEqual(false, sc.checkFlowContext(doc3, testFlow)),
  test.assertEqual(true, sc.checkFlowContext(doc3, branchingFlow))
);

// update 1
isolate(() => xdmp.documentAddCollections(doc1, ['test']));
assertions.push(
  test.assertEqual(true, isolate(() => sc.checkFlowContext(doc1, testFlow))),
  test.assertEqual(false, isolate(() => sc.checkFlowContext(doc1, branchingFlow)))
);

// update 2
isolate(() => xdmp.documentAddCollections(doc1, ['enrollee']));
assertions.push(
  test.assertEqual(true, isolate(() => sc.checkFlowContext(doc1, testFlow))),
  test.assertEqual(true, isolate(() => sc.checkFlowContext(doc1, branchingFlow)))
);

assertions;