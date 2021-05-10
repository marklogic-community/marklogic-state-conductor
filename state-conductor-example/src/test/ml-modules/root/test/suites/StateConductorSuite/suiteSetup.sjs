'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test stateMachines
test.loadTestFile(
  'stateMachines/test-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'test-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/branching-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'branching-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/no-context-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'no-context-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/noStates-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'noStates-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/task-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'task-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/wait-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'wait-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/bad-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'bad-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/contextual-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'contextual-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/test-time-wait.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'test-time-wait.asl.json',
  xdmp.defaultPermissions(),
  [sc.STATE_MACHINE_COLLECTION, 'waitStateTest']
);

test.loadTestFile(
  'stateMachines/ref-path-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'ref-path-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/choice-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'choice-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

test.loadTestFile(
  'stateMachines/retry-state-machine.asl.json',
  xdmp.database(),
  sc.STATE_MACHINE_DIRECTORY + 'retry-state-machine.asl.json',
  xdmp.defaultPermissions(),
  sc.STATE_MACHINE_COLLECTION
);

// insert the test executions
test.loadTestFile(
  'executions/test-wait-execution.json',
  xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  '/stateConductorExecution/test-wait-execution.json',
  xdmp.defaultPermissions(),
  [sc.EXECUTION_COLLECTION, 'unitTest']
);

test.loadTestFile(
  'executions/test-execution1.json',
  xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  '/stateConductorExecution/test-execution1.json',
  xdmp.defaultPermissions(),
  [sc.EXECUTION_COLLECTION, 'unitTest']
);

test.loadTestFile(
  'executions/test-execution2.json',
  xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  '/stateConductorExecution/test-execution2.json',
  xdmp.defaultPermissions(),
  [sc.EXECUTION_COLLECTION, 'unitTest']
);

test.log('StateConductorSuite Suite Setup COMPLETE....');
