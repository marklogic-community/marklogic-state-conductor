'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, error, assertion;

//checks a waiting state working
jobDoc = '/randomUIR/thatis/not/here.json';

error = null;

try {
  error = sc.resumeWaitingJob(jobDoc);
} catch (e) {
  error = e;
}

assertions.push(
  test.assertEqual(
    'INVALID-JOB-DOCUMENT',
    error.name,
    'check if job doc is there'
  )
);

assertions;
