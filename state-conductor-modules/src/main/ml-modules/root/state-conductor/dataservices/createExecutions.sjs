/**
 * DATA SERVICES MODULE
 */
'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var uris;
var name;
var databaseName;
var modulesDatabase;

// initialize variables
const databaseId = databaseName ? xdmp.database(databaseName) : xdmp.database();
const modulesDbId = modulesDatabase ? xdmp.database(modulesDatabase) : xdmp.modulesDatabase();

if (Array.isArray(uris)) {
  // continue
} else if (uris instanceof Sequence) {
  uris = uris.toArray();
} else if (typeof uris === 'string') {
  uris = uris.split(',');
}

let id = [];

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

    id = sc.batchCreateStateConductorExecution(
      name,
      uris,
      {},
      {
        database: databaseId,
        modules: modulesDbId,
      }
    );
  },
  {
    database: databaseId,
    modules: modulesDbId,
  }
);

// return
id;
