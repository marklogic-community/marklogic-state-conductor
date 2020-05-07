/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var uri;

if (Array.isArray(uri)) {
  // continue
} else if (uri instanceof Sequence) {
  uri = uri.toArray();
} else if (typeof uri === 'string') {
  uri = uri.split(',');
}

let resp = uri.map((value) => {
  let result = false;
  let error;
  // handle errors individually so the batch can continue
  try {
    result = sc.invokeOrApplyFunction(
      () => {
        declareUpdate();
        return sc.processJob(value);
      },
      {
        database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB),
      }
    );
  } catch (err) {
    error = err;
  }

  return {
    job: value,
    result: result,
    error: error,
  };
});

// return
resp;
