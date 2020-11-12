'use strict';
declareUpdate();
//this task runs every minutes and excutes docs that have elapsed scheduled wait time

const sc = require('/state-conductor/state-conductor.sjs');

sc.invokeOrApplyFunction(
  () => {
    declareUpdate();
    const uris = cts
      .uris(
        null,
        'limit=1000',

        cts.andQuery([
          cts.collectionQuery(sc.EXECUTION_COLLECTION),
          cts.jsonPropertyScopeQuery(
            'currentlyWaiting',
            cts.jsonPropertyRangeQuery('nextTaskTime', '<=', fn.currentDateTime())
          ),
        ])
      )
      .toArray();

    xdmp.trace(sc.TRACE_EVENT, `Reporting from waitTask. Docs to be process are: ${uris.length}`);

    if (uris.length > 0) {
      uris.forEach((uri) => {
        sc.resumeWaitingExecution(uri, 'waitTask');
      });
    }
  },
  {
    database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
  }
);

xdmp.trace(sc.TRACE_EVENT, `state-conductor-waitTask completed in "${xdmp.elapsedTime()}"`);
