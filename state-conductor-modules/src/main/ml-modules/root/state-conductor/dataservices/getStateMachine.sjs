'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

var name;

let result;
if (name) {
  result = getStateMachineDetail(name);
}
else {
  result = getAllStateMachines();
}
result

/**
 * Get a single state machine by name
 *
 * @param {string} name The name of the state machine to be returned
 */
function getStateMachineDetail(name) {
  const stateMachine = sc.getStateMachine(name);
  if (stateMachine) {
    return stateMachine;
  }
  else {
    fn.error(xs.QName("ERROR"), `State Machine "${name}" not found`);
  }
}

/**
 * Get all available state machines
 */
function getAllStateMachines() {
  const stateMachines = sc.getStateMachines();
  return stateMachines.toArray().reduce((acc, stateMachine) => {
      let name = sc.getStateMachineNameFromUri(fn.documentUri(stateMachine));
      acc[name] = stateMachine.toObject();
      return acc;
    }, {});
}
