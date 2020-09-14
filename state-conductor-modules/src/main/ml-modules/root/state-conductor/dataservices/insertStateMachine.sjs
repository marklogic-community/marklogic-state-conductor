'use strict';

declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/state-machine-validator.sjs');

var name;
var stateMachine;

insertStateMachine(name, stateMachine);

/**
 * Create or update a state machine
 *
 * @param {string} name Name of the state machine to be created or updated
 * @param {object} stateMachine State Machine to be created or updated
 */
function insertStateMachine(name, stateMachine) {
  const cleanName = name ? name.trim() : '';
  if (cleanName === '') {
    fn.error(xs.QName("ERROR"), `Missing parameter "stateMachine"`);
  }
  if(!stateMachine || typeof stateMachine != 'object') {
    fn.error(xs.QName("ERROR"), `Invalid parameter "stateMachine"`);
  }
  if(!validator.validateStateMachineFile(stateMachine)) {
    fn.error(xs.QName("ERROR"), `Invalid state-conductor stateMachine`);
  }
  const uri = `${sc.STATE_MACHINE_DIRECTORY}${cleanName}.asl.json`;
  xdmp.documentInsert(uri, stateMachine, {
    permissions: xdmp.defaultPermissions(),
    collections: [sc.STATE_MACHINE_COLLECTION],
  });
}
