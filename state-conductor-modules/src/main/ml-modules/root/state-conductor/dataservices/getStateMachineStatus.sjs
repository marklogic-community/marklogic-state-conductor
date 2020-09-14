/**
 * DATA SERVICES MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var names;
var startDate;
var endDate;
var detailed;

if (Array.isArray(names)) {
  // continue
} else if (names instanceof Sequence) {
  names = names.toArray();
} else if (typeof names === 'string') {
  names = [names];
} else {
  names = sc.getStateMachineNames();
}

if (typeof detailed === 'string') {
  detailed = detailed === 'true';
} else {
  detailed = !!detailed;
}

const resp = names.reduce((acc, name) => {
  acc[name] = sc.getStateMachineCounts(name, {
    startDate,
    endDate,
    detailed,
  });
  return acc;
}, {});

// return
resp;
