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
   fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `flowName not found.`])
  );

} else if (!input ) {
  fn.error(
    null,
    'STATE-CONDUCTOR-ERROR',
    Sequence.from([400, 'Bad Request', `input not found.`])
  );
}
//the validated need to be fixed.

else if (!validator.validateFlowFile(input.toObject())) {
 'input not valid flow';

} else {
  const uri = `${sc.FLOW_DIRECTORY}${flowName}.asl.json`;
  xdmp.documentInsert(uri, input, {
    permissions: xdmp.defaultPermissions(),
    collections: [sc.FLOW_COLLECTION],
  });

 flowName+ ' was created';
}

