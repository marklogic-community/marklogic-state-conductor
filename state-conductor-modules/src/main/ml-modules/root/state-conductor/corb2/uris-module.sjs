/**
 * CORB2 URIS MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var jobCount;
var flowNames;
var resumeWait;

if (!jobCount) {
  jobCount = 1000;
}

if (flowNames) {
  flowNames = flowNames.split(',');
}

let options = {
  count: jobCount,
  flowStatus: [sc.FLOW_STATUS_NEW, sc.FLOW_STATUS_WORKING],
  flowNames: flowNames,
  startDate: null,
  endDate: null,
  resumeWait: resumeWait,
};

const uris = sc.getJobDocuments(options);

Sequence.from([uris.length, ...uris]);
