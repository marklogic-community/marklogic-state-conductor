'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

var name;

deleteStateMachine(name);

/**
 * Delete a state machine
 *
 * @param {string} name Name of the state machine to be deleted
 */
function deleteStateMachine(name) {
  const cleanName = name ? name.trim() : '';
  if (cleanName === '') {
    fn.error(xs.QName("ERROR"), `Missing parameter "name"`);
  }
  const stateMachine = sc.getStateMachine(cleanName);
  if(!stateMachine) {
    fn.error(xs.QName("ERROR"), `State Machine "${cleanName}" not found`);
  }
  const uri = fn.documentUri(stateMachine);
  xdmp.documentDelete(uri);
}
