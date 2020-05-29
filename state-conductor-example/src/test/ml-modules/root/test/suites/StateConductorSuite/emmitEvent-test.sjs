'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//"found waiting job")
assertion = sc.emmitEvent('series-of-clicks-and-beeps-connected', 100, false);

//they dont come back as as string so we have to convert them
assertion = assertion.jobDocumentsTriggered.map((item) => item.toString());

assertions.push(
  test.assertTrue(assertion.includes('/stateConductorJob/test-wait-job.json'), 'found waiting job')
);

//random event jobs shouldnt be found
assertion = sc.emmitEvent('theEndOfDays', 100, false);

//they dont come back as as string so we have to convert them
assertion = assertion.jobDocumentsTriggered.map((item) => item.toString());

assertions.push(test.assertEqual(assertion, [], 'jobs shouldnt be found'));

//context event
assertion = sc.emmitEvent('test', 100, false);

assertions.push(test.assertTrue(fn.exists(xdmp.toJSON(assertion).xpath("flowsTriggered[flowName = 'contextual-flow']")), 'context event'))

//context event with another context
assertion = sc.emmitEvent('context-test', 100, false);

assertions.push(test.assertTrue(fn.empty(xdmp.toJSON(assertion).xpath("flowsTriggered[flowName = 'contextual-flow']")), 'context event with another context'))

assertions;
