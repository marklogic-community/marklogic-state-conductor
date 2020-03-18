'use strict';

declareUpdate();

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test documents
test.loadTestFile('test-doc1.json', xdmp.database(), '/data/test-doc1.json');
test.loadTestFile('test-doc2.json', xdmp.database(), '/data/test-doc2.json');
test.loadTestFile('test-doc3.json', xdmp.database(), '/data/test-doc3.json');
test.loadTestFile('test-doc4.json', xdmp.database(), '/data/test-doc4.json');
test.loadTestFile('lorem.txt', xdmp.database(), '/data/lorem.txt');

xdmp.documentAddCollections('/data/test-doc2.json', [sc.FLOW_ITEM_COLLECTION, 'test']);
xdmp.documentAddCollections('/data/test-doc3.json', [sc.FLOW_ITEM_COLLECTION, 'enrollee']);
xdmp.documentAddCollections("/data/test-doc4.json", [sc.FLOW_ITEM_COLLECTION,"waitStateTest"]);
test.log('StateConductorSuite Test Setup COMPLETE....');
