'use strict';
declareUpdate();
//this task runs every minutes and excutes docs that have elapsed scheduled wait time

const sc = require('/state-conductor/state-conductor.sjs');

sc.invokeOrApplyFunction(
  () => {
    const docs = fn.subsequence(
      cts.search(
        cts.andQuery([
          cts.collectionQuery('stateConductorJob'),
          cts.jsonPropertyScopeQuery('currentlyWaiting',
            cts.jsonPropertyRangeQuery('nextTaskTime', '<=', fn.currentDateTime())
          ),
        ])
      ), 1,1000
    );

    xdmp.trace(
      sc.TRACE_EVENT,
      `Reporting from waitTask. Docs to be process are: ${fn.count(docs)}`
    );

    if (fn.count(docs) > 0) {

      for (const jobDoc of docs) {
        sc.resumeWaitingJobByJobDoc(jobDoc, 'waitTask');
      }

    }
  },
  {
    database: sc.STATE_CONDUCTOR_JOBS_DB,
  }
);

xdmp.trace(sc.TRACE_EVENT, `state-conductor-waitTask completed in "${xdmp.elapsedTime()}"`);
