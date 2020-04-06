'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const scLib = require('/state-conductor/state-conductor-lib.sjs');

const now = new Date();

/*
{
  "scope": "scheduled",
  "value": "minutely",
  "period": 1
}
{
  "scope": "scheduled",
  "value": "hourly",
  "period": 1,
  "minute": 59
}
{
  "scope": "scheduled",
  "value": "daily",
  "period": 1,
  "startTime": "24:00"
}
{
  "scope": "scheduled",
  "value": "weekly",
  "period": 1,
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "startTime": "24:00"
}
{
  "scope": "scheduled",
  "value": "monthly",
  "period": 1,
  "monthDay": 31,
  "startTime": "24:00"
}
{
  "scope": "scheduled",
  "value": "once",
  "startDate": "MM/DD/YYYY",
  "startTime": "24:00"
}
*/

// grab all state conductor flows with a 'scheduled' context
const flows = cts
  .search(
    cts.andQuery([
      cts.collectionQuery(sc.FLOW_COLLECTION),
      cts.jsonPropertyScopeQuery(
        'mlDomain',
        cts.jsonPropertyValueQuery('scope', 'scheduled')
      ),
    ])
  )
  .toArray();

xdmp.trace(sc.TRACE_EVENT, `found ${flows.length} scheduled flows`);

// determine which flows should run and create state conductor jobs
flows
  .filter((flow) => {
    // find the flows with an elapsed time period
    let contexts = flow.toObject().mlDomain.context;
    let elapsed = false;
    contexts.forEach((ctx) => {
      elapsed = elapsed || scLib.hasScheduleElapsed(ctx, now);
    });
    return elapsed;
  })
  .forEach((flow) => {
    // create a state conductor job for the elapsed flows
    let flowName = sc.getFlowNameFromUri(fn.documentUri(flow));
    let resp = sc.createStateConductorJob(flowName, null);
    xdmp.trace(
      sc.TRACE_EVENT,
      `created state conductor job for scheduled flow: ${resp}`
    );
  });

xdmp.trace(
  sc.TRACE_EVENT,
  `state-conductor-scheduler-task completed in "${xdmp.elapsedTime()}"`
);
