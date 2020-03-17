'use strict';
declareUpdate();
//this take runs every minutes and excutes docs that have elapsed scheduled wait time

const sc = require('/state-conductor/state-conductor.sjs');

const uris = cts.uris(null, 'limit=1000',
  cts.andQuery([
    cts.collectionQuery("stateConductorJob"),
    cts.jsonPropertyScopeQuery("currentlyWaiting",
      cts.jsonPropertyRangeQuery("nextTaskTime", "<=", fn.currentDateTime()))
  ])).toArray()

xdmp.trace(sc.TRACE_EVENT, `Reporting from waitTask. Docs to be process are: ${uris.length}`);
if (uris.length > 0) {
  uris.forEach(uri => {
    sc.resumeWaitingJob(uri,"waitTask")
  });
}
xdmp.trace(sc.TRACE_EVENT, `state-conductor-waitTask completed in "${xdmp.elapsedTime()}"`);


