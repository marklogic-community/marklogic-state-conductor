/**
 * DATA SERVICES MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var count;
var flowNames;
var flowStatus;

xdmp.log('Count: ' + count);
xdmp.log('flowNames: ' + xdmp.describe(flowNames));
xdmp.log('flowStatus: ' + xdmp.describe(flowStatus));

console.log('got here!');

if (!count) {
  count = 1000;
}

if (flowNames) {
  flowNames = flowNames.split(',');
}

if (Array.isArray(flowStatus)) {
  // continue
} else if (flowStatus instanceof Sequence) {
  flowStatus = flowStatus.toArray();
} else {
  flowStatus = [sc.FLOW_STATUS_NEW, sc.FLOW_STATUS_WORKING];
}

let options = {
  count: count,
  flowStatus: flowStatus,
  flowNames: flowNames,
  startDate: null,
  endDate: null
};

const uris = sc.getJobDocuments(options);

console.log('return=', uris);

// return
Sequence.from(uris);
