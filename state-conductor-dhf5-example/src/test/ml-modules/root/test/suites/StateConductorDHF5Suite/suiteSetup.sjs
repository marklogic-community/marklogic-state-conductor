'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test stateMachines
test.loadTestFile(
  'stateMachines/person-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'person-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);
test.loadTestFile(
  'stateMachines/person-steps-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'person-steps-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);
test.loadTestFile(
  'stateMachines/person-envelope-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'person-envelope-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);
test.loadTestFile(
  'stateMachines/custom-steps-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'custom-steps-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);
test.loadTestFile(
  'stateMachines/missing-dhf-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'missing-dhf-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.log('StateConductorDHF5Suite Suite Setup COMPLETE....');
