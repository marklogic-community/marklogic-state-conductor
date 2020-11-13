/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/state-machine-validator.sjs');

// external variables
var name;
var stateMachine;

name = name ? name.trim() : '';

if (name === '') {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', 'invalid or missing State Machine name.'])
  );
}

if (!stateMachine) {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', 'invalid or missing State Machine definition.'])
  );
}

//the validator need to be fixed.
if (!validator.validateStateMachineFile(stateMachine.toObject())) {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `ERROR: not a valid State Machine definition.`])
  );
}

const uri = sc.createStateMachine(name, stateMachine);

// return
uri;
