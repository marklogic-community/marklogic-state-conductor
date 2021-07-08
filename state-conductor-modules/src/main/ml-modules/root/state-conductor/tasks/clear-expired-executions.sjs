'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const scLib = require('/state-conductor/state-conductor-lib.sjs');

const now = fn.currentDateTime();
const db = xdmp.database();
const host = xdmp.host();
const scConfig = scLib.getConfiguration();
const excsForestsOnHost = xdmp
  .databaseForests(xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB), false)
  .toArray()
  .filter((forestId) => fn.string(xdmp.forestHost(forestId)) === fn.string(host));

const endDate = now.subtract(xs.dayTimeDuration(scConfig.executionExpiration.duration));

if (scConfig.executionExpiration.enabled) {
  const query = cts.andQuery([
    cts.collectionQuery(sc.EXECUTION_COLLECTION),
    cts.jsonPropertyValueQuery('status', scConfig.executionExpiration.status),
    cts.jsonPropertyValueQuery('database', fn.string(db)),
    cts.jsonPropertyRangeQuery('createdDate', '<=', endDate),
  ]);

  sc.invokeOrApplyFunction(
    () => {
      declareUpdate();
      const executions = fn.subsequence(
        cts.uris(null, 'document', query, 1, excsForestsOnHost),
        1,
        scConfig.executionExpiration.batchSize
      );
      xdmp.trace(
        sc.TRACE_EVENT,
        `state-conductor clear-expired-executions purging ${fn.count(
          executions
        )} executions older than ${endDate}`
      );
      for (const uri of executions) {
        xdmp.documentDelete(uri);
      }
    },
    {
      database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );
} else {
  xdmp.trace(
    sc.TRACE_EVENT,
    `state-conductor clear-expired-executions task completed is disabled"`
  );
}

xdmp.trace(
  sc.TRACE_EVENT,
  `state-conductor clear-expired-executions task completed in "${xdmp.elapsedTime()}"`
);
