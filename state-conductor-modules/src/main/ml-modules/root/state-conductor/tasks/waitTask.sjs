'use strict';
declareUpdate();
const sc = require('/state-conductor/state-conductor.sjs');

//const now = new DateTime();

// grab all state conductor flows with a 'scheduled' context

const uris = cts.uris(null, null,
  cts.andQuery([
    cts.collectionQuery("stateConductorJob"),
    cts.jsonPropertyRangeQuery("nextTaskTime", "<=", fn.currentDateTime()),
    cts.jsonPropertyRangeQuery("nextTaskTime", ">=", fn.currentDateTime().subtract(xs.dayTimeDuration("PT" + 1 + "M")))
  ])
).toArray()
xdmp.log("Reporting from waitTask. Docs to be process are:" + uris.length);
if (uris.length > 0) {

  uris.forEach(uri => {
    xdmp.log("Reporting from waitTask. processing uri :" + uri);
    sc.resumeWaitingJob(uri)
  });

}
