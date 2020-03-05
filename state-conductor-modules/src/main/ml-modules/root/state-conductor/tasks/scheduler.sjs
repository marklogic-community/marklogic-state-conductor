'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

const now = new Date();
const millis = now.getTime();
const minutes = Math.floor(millis / 1000 / 60);
const hours = Math.floor(minutes / 60);

function hasScheduleElapsed(context) {
  if (context.scope !== 'scheduled') {
    return false;
  }

  try {
    if ('minutely' === context.value) {
      return (minutes % context.period) === 0;
    } else if ('hourly' === context.value) {
      return (hours % context.period) === 0;
    } else if ('daily' === context.value) {
      const [h, m] = context.startTime.split(':');
      return (fn.hoursFromDateTime(now) === h) && (fn.minutesFromDateTime(now) === m);
    } else if ('weekly' === context.value) {
      // TODO
    } else if ('monthly' === context.value) {
      // TODO
    } else if ('once' === context.value) {
      const start = xdmp.parseDateTime('[M01]/[D01]/[Y0001]-[H01]:[m01]', `${context.startDate}-${context.startTime}`);
      const upper = start.add("PT1M");
      return start.le(now) && upper.gt(now);
    }
  } catch (ex) {
    xdmp.log(`error parsing schedule values: ${JSON.stringify(context)}`);
  }

  return false;
}

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
    elapsed = elapsed || hasScheduleElapsed(ctx);
  });
  return elapsed;
}).forEach(flow => {
  // create a state conductor job for the elapsed flows
  let flowName = sc.getFlowNameFromUri(fn.documentUri(flow));
  let resp = sc.createStateConductorJob(flowName, null);
  xdmp.log(`created state conductor job for scheduled flow: ${resp}`);
});


xdmp.trace(sc.TRACE_EVENT, `state-conductor-scheduler-task completed in "${xdmp.elapsedTime()}"`);
