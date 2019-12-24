'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

xdmp.directoryDelete(sc.FLOW_DIRECTORY);
xdmp.directoryDelete('/data/');
xdmp.directoryDelete('/stateConductorJob/');

test.log('SampleTestSuite Suite Teardown ENDING....');