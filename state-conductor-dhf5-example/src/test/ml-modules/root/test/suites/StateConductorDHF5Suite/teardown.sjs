'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

xdmp.directoryDelete('/data/');
xdmp.directoryDelete('/stateConductorJob/');

xdmp.invokeFunction(
  () => {
    declareUpdate();
    xdmp.directoryDelete('/data/');
  },
  {
    database: xdmp.database('sce-dh5-FINAL'),
  }
);

test.log('StateConductorDHF5Suite Test Teardown ENDING....');
