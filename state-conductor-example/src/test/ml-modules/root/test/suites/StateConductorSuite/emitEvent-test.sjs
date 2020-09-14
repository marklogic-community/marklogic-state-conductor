'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//"found waiting execution")
assertion = sc.emitEvent('series-of-clicks-and-beeps-connected', 100, false);

//they dont come back as as string so we have to convert them
assertion = assertion.executionDocumentsTriggered.map((item) => item.toString());

assertions.push(
  test.assertTrue(assertion.includes('/stateConductorExecution/test-wait-execution.json'), 'found waiting execution')
);

//random event executions shouldnt be found
assertion = sc.emitEvent('theEndOfDays', 100, false);

//they dont come back as as string so we have to convert them
assertion = assertion.executionDocumentsTriggered.map((item) => item.toString());

assertions.push(test.assertEqual(assertion, [], 'executions shouldnt be found'));

//context event
assertion = sc.emitEvent('test', 100, false);

assertions.push(test.assertTrue(fn.exists(xdmp.toJSON(assertion).xpath("stateMachinesTriggered[stateMachineName = 'contextual-state-machine']")), 'context event'))

//context event with another context
assertion = sc.emitEvent('context-test', 100, false);

assertions.push(test.assertTrue(fn.empty(xdmp.toJSON(assertion).xpath("stateMachinesTriggered[stateMachineName = 'contextual-state-machine']")), 'context event with another context'))

assertions;
