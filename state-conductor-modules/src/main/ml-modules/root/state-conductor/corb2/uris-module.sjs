/**
 * CORB2 URIS MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var executionCount;
var names;
var resumeWait;

if (!executionCount) {
  executionCount = 1000;
}

if (names) {
  names = names.split(',');
}

let options = {
  count: executionCount,
  status: [sc.STATE_MACHINE_STATUS_NEW, sc.STATE_MACHINE_STATUS_WORKING],
  names: names,
  startDate: null,
  endDate: null,
  resumeWait: resumeWait,
};

const uris = sc.getExecutionDocuments(options);

Sequence.from([uris.length, ...uris]);
