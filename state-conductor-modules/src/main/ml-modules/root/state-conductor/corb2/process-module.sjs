/**
 * CORB2 PROCESS MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var URI;

xdmp.invokeFunction(
  () => {
    declareUpdate();
    return sc.processExecution(URI);
  },
  {
    database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  }
);
