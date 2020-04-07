'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

xdmp.directoryDelete(sc.FLOW_DIRECTORY);
xdmp.directoryDelete('/data/');
xdmp.directoryDelete('/stateConductorJob/');

xdmp.invokeFunction(
  () => {
    declareUpdate();
    xdmp.collectionDelete('unitTest');
  },
  {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB),
  }
);

test.log('SampleTestSuite Suite Teardown ENDING....');
