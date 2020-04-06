'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test flows
test.loadTestFile(
  'flows/person-flow.asl.json',
  xdmp.database(),
  sc.FLOW_DIRECTORY + 'person-flow.asl.json',
  xdmp.defaultPermissions(),
  sc.FLOW_COLLECTION
);
test.loadTestFile(
  'flows/person-steps-flow.asl.json',
  xdmp.database(),
  sc.FLOW_DIRECTORY + 'person-steps-flow.asl.json',
  xdmp.defaultPermissions(),
  sc.FLOW_COLLECTION
);
test.loadTestFile(
  'flows/person-envelope-flow.asl.json',
  xdmp.database(),
  sc.FLOW_DIRECTORY + 'person-envelope-flow.asl.json',
  xdmp.defaultPermissions(),
  sc.FLOW_COLLECTION
);
test.loadTestFile(
  'flows/custom-steps-flow.asl.json',
  xdmp.database(),
  sc.FLOW_DIRECTORY + 'custom-steps-flow.asl.json',
  xdmp.defaultPermissions(),
  sc.FLOW_COLLECTION
);
test.loadTestFile(
  'flows/missing-dhf-flow.asl.json',
  xdmp.database(),
  sc.FLOW_DIRECTORY + 'missing-dhf-flow.asl.json',
  xdmp.defaultPermissions(),
  sc.FLOW_COLLECTION
);

test.log('StateConductorDHF5Suite Suite Setup COMPLETE....');
