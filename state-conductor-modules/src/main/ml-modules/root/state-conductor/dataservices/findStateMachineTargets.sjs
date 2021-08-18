/**
 * DATA SERVICES MODULE
 */
'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var name;
var count;
var databaseName;

// initialize variables
count = count || 1000;
const databaseId = databaseName ? xdmp.database(databaseName) : xdmp.database();

xdmp.trace(
  sc.TRACE_EVENT,
  `findStateMachineTargets - name: "${name}", count: ${count}, db: ${databaseId}`
);

let uris = [];

sc.invokeOrApplyFunction(
  () => {
    if (!sc.getStateMachine(name)) {
      fn.error(
        null,
        'STATE-CONDUCTOR-ERROR',
        Sequence.from([400, 'Bad Request', `State Machine "${name}" not found.`])
      );
    }

    uris = sc.findStateMachineTargets(name, false, count);
  },
  {
    database: databaseId,
  }
);

xdmp.trace(sc.TRACE_EVENT, `findStateMachineTargets found ${fn.count(uris)} execution documents`);

// return
uris;
