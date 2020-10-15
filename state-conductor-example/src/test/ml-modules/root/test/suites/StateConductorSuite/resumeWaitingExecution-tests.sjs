'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let executionDoc, error, assertion;

//checks a waiting state working
executionDoc = '/randomUIR/thatis/not/here.json';

error = null;

try {
  error = sc.resumeWaitingExecution(executionDoc);
} catch (e) {
  error = e;
}

assertions.push(test.assertEqual('INVALID-EXECUTION-DOCUMENT', error.name, 'check if execution doc is there'));

assertions;
