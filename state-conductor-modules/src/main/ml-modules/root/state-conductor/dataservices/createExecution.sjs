/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var uri;
var name;

if (!fn.docAvailable(uri)) {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `Document "${uri}" not found.`])
  );
}

if (!sc.getStateMachine(name)) {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `State Machine "${name}" not found.`])
  );
}

const id = sc.createStateConductorExecution(name, uri);

// return
id;
