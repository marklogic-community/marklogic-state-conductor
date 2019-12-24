'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test documents
test.loadTestFile('test-doc1.json', xdmp.database(), '/data/test-doc1.json');
test.loadTestFile('test-doc2.json', xdmp.database(), '/data/test-doc2.json');
test.loadTestFile('test-doc3.json', xdmp.database(), '/data/test-doc3.json');

xdmp.documentAddCollections('/data/test-doc2.json', [sc.FLOW_ITEM_COLLECTION, 'test']);
xdmp.documentAddCollections('/data/test-doc3.json', [sc.FLOW_ITEM_COLLECTION, 'enrollee']);

test.log('StateConductorSuite Test Setup COMPLETE....');