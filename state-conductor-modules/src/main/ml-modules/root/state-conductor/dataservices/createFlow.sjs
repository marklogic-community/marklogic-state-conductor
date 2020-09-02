/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');
const validator = require('/state-conductor/flow-file-validator.sjs');

// external variables
var flowName;
var input ;

if (flowName === '') {
  try { fn.error(
     null,
     'STATE-CONDUCTOR-ERROR',
     Sequence.from([400, 'Bad Request', `invalid StateMachine name.`])
   ); }
   catch(err){
     err.toString();
   }

} else if (!input ) {
  try {
    fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `input not found.`])
  ); } catch(err){
   err.toString();
  }
}
//the validated need to be fixed.

else if (!validator.validateFlowFile(input.toObject())) {
  try {
fn.error(
  null,
  'STATE-CONDUCTOR-ERROR',
  Sequence.from([400, 'Bad Request', `ERROR: input not a valid StateMachine.`])
);
  }catch (err){
    err.toString();
  }


} else {
  const uri = `${sc.FLOW_DIRECTORY}${flowName}.asl.json`;
  xdmp.documentInsert(uri, input, {
    permissions: xdmp.defaultPermissions(),
    collections: [sc.FLOW_COLLECTION],
  });

 uri + ' was created';
}

