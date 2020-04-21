/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var uri;

sc.invokeOrApplyFunction(
  () => {
    declareUpdate();
    return sc.processJob(uri);
  },
  {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB),
  }
);
