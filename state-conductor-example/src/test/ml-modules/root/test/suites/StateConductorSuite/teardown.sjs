'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

xdmp.directoryDelete('/data/');
xdmp.directoryDelete('/stateConductorExecution/');

xdmp.invokeFunction(
  () => {
    declareUpdate();
    xdmp.collectionDelete('test');
  },
  {
    database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  }
);

test.log('SampleTestSuite Test Teardown ENDING....');
