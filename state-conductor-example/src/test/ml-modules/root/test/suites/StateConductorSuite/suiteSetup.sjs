'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test flows
let uri = sc.FLOW_DIRECTORY + 'test-flow.asl.json';
test.loadTestFile('flows/test-flow.asl.json', xdmp.database(), uri);
xdmp.documentAddCollections(uri, sc.FLOW_COLLECTION);

uri = sc.FLOW_DIRECTORY + 'branching-flow.asl.json';
test.loadTestFile('flows/branching-flow.asl.json', xdmp.database(), uri);
xdmp.documentAddCollections(uri, sc.FLOW_COLLECTION);

uri = sc.FLOW_DIRECTORY + 'no-context-flow.asl.json';
test.loadTestFile('flows/no-context-flow.asl.json', xdmp.database(), uri);
xdmp.documentAddCollections(uri, sc.FLOW_COLLECTION);

uri = sc.FLOW_DIRECTORY + 'noStates-flow.asl.json';
test.loadTestFile('flows/noStates-flow.asl.json', xdmp.database(), uri);
xdmp.documentAddCollections(uri, sc.FLOW_COLLECTION);

uri = sc.FLOW_DIRECTORY + 'task-flow.asl.json';
test.loadTestFile('flows/task-flow.asl.json', xdmp.database(), uri);
xdmp.documentAddCollections(uri, sc.FLOW_COLLECTION);

test.log('StateConductorSuite Suite Setup COMPLETE....');