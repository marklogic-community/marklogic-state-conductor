'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const scLib = require('/state-conductor/state-conductor-lib.sjs');

const now = fn.currentDateTime();

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

// grab all state conductor stateMachines with a 'scheduled' context
const stateMachines = cts
  .search(
    cts.andQuery([
      cts.collectionQuery(sc.STATE_MACHINE_COLLECTION),
      cts.jsonPropertyScopeQuery('mlDomain', cts.jsonPropertyValueQuery('scope', 'scheduled')),
    ])
  )
  .toArray();

xdmp.trace(sc.TRACE_EVENT, `found ${stateMachines.length} scheduled stateMachines`);

// determine which stateMachines should run and create state conductor executions
stateMachines
  .filter((stateMachine) => {
    // find the stateMachines with an elapsed time period
    let contexts = stateMachine.toObject().mlDomain.context;
    let elapsed = false;
    contexts.forEach((ctx) => {
      elapsed = elapsed || scLib.hasScheduleElapsed(ctx, now);
    });
    return elapsed;
  })
  .forEach((stateMachine) => {
    // create a state conductor execution for the elapsed stateMachines
    let stateMachineName = sc.getStateMachineNameFromUri(fn.documentUri(stateMachine));
    let resp = sc.createStateConductorExecution(stateMachineName, null);
    xdmp.trace(sc.TRACE_EVENT, `created state conductor execution for scheduled stateMachine: ${resp}`);
  });

xdmp.trace(sc.TRACE_EVENT, `state-conductor-scheduler-task completed in "${xdmp.elapsedTime()}"`);
