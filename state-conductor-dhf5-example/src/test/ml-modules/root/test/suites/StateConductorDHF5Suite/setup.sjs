'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

// insert the test documents
test.loadTestFile(
  'johndoe.json',
  xdmp.database(),
  '/data/johndoe.json',
  xdmp.defaultPermissions(),
  [sc.STATE_MACHINE_ITEM_COLLECTION, 'test']
);
test.loadTestFile(
  'janedoe.json',
  xdmp.database(),
  '/data/janedoe.json',
  xdmp.defaultPermissions(),
  [sc.STATE_MACHINE_ITEM_COLLECTION, 'test']
);

test.log('StateConductorDHF5Suite Test Setup COMPLETE....');
