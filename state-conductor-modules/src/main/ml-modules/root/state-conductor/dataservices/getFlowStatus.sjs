/**
 * DATA SERVICES MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var flowNames;
var startDate;
var endDate;
var detailed;

if (Array.isArray(flowNames)) {
  // continue
} else if (flowNames instanceof Sequence) {
  flowNames = flowNames.toArray();
} else if (typeof flowNames === 'string') {
  flowNames = [flowNames];
} else {
  flowNames = sc.getFlowNames();
}

if (typeof detailed === 'string') {
  detailed = detailed === 'true';
} else {
  detailed = !!detailed;
}

const resp = flowNames.reduce((acc, name) => {
  acc[name] = sc.getFlowCounts(name, {
    startDate,
    endDate,
    detailed,
  });
  return acc;
}, {});

// return
resp;
