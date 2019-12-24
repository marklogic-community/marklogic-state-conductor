'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

xdmp.directoryDelete('/data/');
xdmp.directoryDelete('/stateConductorJob/');

test.log('SampleTestSuite Test Teardown ENDING....');