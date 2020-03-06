'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

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
const flows = sc.getFlowDocuments().toArray().filter(flow => {
  let context = flow.toObject().mlDomain.context;
  let hasScheduled = context.filter(c => c.scope === 'scheduled');
  return hasScheduled.length > 0;
});

xdmp.log(`found ${flows.length} scheduled flows`);

// determine which flows should run and create state conductor jobs
flows.filter(flow => {
  // find the flows with an elapsed time period
  let contexts = flow.toObject().mlDomain.context;
  let elapsed = false;
  contexts.forEach(ctx => {
    elapsed = elapsed || sc.hasScheduleElapsed(ctx, now);
  });
  return elapsed;
}).forEach(flow => {
  // create a state conductor job for the elapsed flows
  let flowName = sc.getFlowNameFromUri(fn.documentUri(flow));
  let resp = sc.createStateConductorJob(flowName, null);
  xdmp.log(`created state conductor job for scheduled flow: ${resp}`);
});


xdmp.trace(sc.TRACE_EVENT, `state-conductor-scheduler-task completed in "${xdmp.elapsedTime()}"`);
