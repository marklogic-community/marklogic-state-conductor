/**
 * DATA SERVICES MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var count;
var flowNames;
var flowStatus;
var forestIds;

xdmp.trace(
  sc.TRACE_EVENT,
  Sequence.from([
    `Count: ${count}`,
    `flowNames: ${xdmp.describe(flowNames)}`,
    `flowStatus: ${xdmp.describe(flowStatus)}`,
  ])
);

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
} else if (typeof flowStatus === 'string') {
  flowStatus = [flowStatus];
} else {
  flowStatus = [sc.FLOW_STATUS_NEW, sc.FLOW_STATUS_WORKING];
}

if (Array.isArray(forestIds)) {
  // continue
} else if (forestIds instanceof Sequence) {
  forestIds = forestIds.toArray();
} else if (typeof forestIds === 'string') {
  forestIds = forestIds.split(',');
}

let options = {
  count: count,
  flowStatus: flowStatus,
  flowNames: flowNames,
  forestIds: forestIds,
  startDate: null,
  endDate: null,
};

const uris = sc.getJobDocuments(options);

xdmp.trace(sc.TRACE_EVENT, `getJobs found ${uris.length} job documents`);

// return
Sequence.from(uris);
