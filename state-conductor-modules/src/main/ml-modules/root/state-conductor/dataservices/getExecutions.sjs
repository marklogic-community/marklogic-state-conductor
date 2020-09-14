/**
 * DATA SERVICES MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var start;
var count;
var names;
var status;
var forestIds;
var startDate;
var endDate;

xdmp.trace(
  sc.TRACE_EVENT,
  `Start: ${start}, Count: ${count}, names: ${xdmp.describe(
    names
  )}, status: ${xdmp.describe(status)}, startDate: ${startDate}, endDate: ${endDate}`
);

start = start || 1;
count = count || 1000;

if (names) {
  names = names.split(',');
}

if (Array.isArray(status)) {
  // continue
} else if (status instanceof Sequence) {
  status = status.toArray();
} else if (typeof status === 'string') {
  status = [status];
} else {
  status = [sc.STATE_MACHINE_STATUS_NEW, sc.STATE_MACHINE_STATUS_WORKING];
}

if (Array.isArray(forestIds)) {
  // continue
} else if (forestIds instanceof Sequence) {
  forestIds = forestIds.toArray();
} else if (typeof forestIds === 'string') {
  forestIds = forestIds.split(',');
}

let options = {
  start,
  count,
  status,
  names,
  forestIds,
  startDate,
  endDate,
};

const uris = sc.getExecutionDocuments(options);

xdmp.trace(sc.TRACE_EVENT, `getExecutionDocuments found ${uris.length} execution documents`);

// return
Sequence.from(uris);
