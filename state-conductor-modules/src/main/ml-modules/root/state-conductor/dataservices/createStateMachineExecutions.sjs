/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var name;
var count;
var databaseName;
var modulesDatabase;

// initialize variables
count = count || 1000;
const databaseId = databaseName ? xdmp.database(databaseName) : xdmp.database();
const modulesDbId = modulesDatabase ? xdmp.database(modulesDatabase) : xdmp.modulesDatabase();

xdmp.trace(
  sc.TRACE_EVENT,
  `createStateMachineExecutions - name: "${name}", count: ${count}, db: ${databaseId}`
);

let resp = null;

sc.invokeOrApplyFunction(
  () => {
    declareUpdate();

    if (!sc.getStateMachine(name)) {
      fn.error(
        null,
        'STATE-CONDUCTOR-ERROR',
        Sequence.from([400, 'Bad Request', `State Machine "${name}" not found.`])
      );
    }

    resp = sc.gatherAndCreateExecutionsForStateMachine(name, false, count);

    xdmp.trace(
      sc.TRACE_EVENT,
      `createStateMachineExecutions created ${resp.total} execution documents`
    );
  },
  {
    database: databaseId,
    modules: modulesDbId,
  }
);

// return
resp;
