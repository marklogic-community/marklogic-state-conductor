'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test flows
test.loadTestFile('flows/test-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'test-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/branching-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'branching-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/no-context-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'no-context-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/noStates-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'noStates-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/task-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'task-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/wait-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'wait-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/bad-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'bad-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/contextual-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'contextual-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

test.loadTestFile('flows/test-time-wait.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'test-time-wait.asl.json', xdmp.defaultPermissions(), [sc.FLOW_COLLECTION, 'waitStateTest']);

test.loadTestFile('flows/ref-path-flow.asl.json', xdmp.database(), sc.FLOW_DIRECTORY + 'ref-path-flow.asl.json', xdmp.defaultPermissions(),  sc.FLOW_COLLECTION);

// insert the test jobs
test.loadTestFile('test-wait-job.json', xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB), '/stateConductorJob/test-wait-job.json', xdmp.defaultPermissions(), [sc.JOB_COLLECTION, 'unitTest']);


test.log('StateConductorSuite Suite Setup COMPLETE....');
