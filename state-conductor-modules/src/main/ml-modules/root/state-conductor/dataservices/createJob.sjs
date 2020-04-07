/**
 * DATA SERVICES MODULE
 */
'use strict';
declareUpdate();

const sc = require('/state-conductor/state-conductor.sjs');

// external variables
var uri;
var flowName;

if (!fn.docAvailable(uri)) {
  fn.error(null, 'STATE-CONDUCTOR-ERROR', Sequence.from([400, 'Bad Request', `Document "${uri}" not found.`]));
}

if (!sc.getFlowDocument(flowName)) {
  fn.error(null, 'STATE-CONDUCTOR-ERROR', Sequence.from([400, 'Bad Request', `Flow File "${flowName}" not found.`]));
}

const jobId = sc.createStateConductorJob(flowName, uri);

// return
jobId;
