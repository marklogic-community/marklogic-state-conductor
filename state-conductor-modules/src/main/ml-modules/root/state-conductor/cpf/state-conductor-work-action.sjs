'use strict';
declareUpdate();

const cpf = require('/MarkLogic/cpf/cpf.xqy');
const json = require('/MarkLogic/json/json.xqy');
const sc  = require('/state-conductor/state-conductor.sjs');

var uri;
var transition;

if (cpf.checkTransition(uri, transition)) {
  try {
    xdmp.trace(sc.TRACE_EVENT, `state-conductor-work-action for "${uri}"`);
    const jobDoc = cts.doc(uri);
    const job = jobDoc.toObject();
    const status = job.flowStatus;
    if (sc.FLOW_STATUS_WORKING === status) {
      // execute state actions and transition to next state
      sc.executeState(uri);     
      // continue cpf processing - continuing the current flow or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else if (sc.FLOW_STATUS_NEW === status) {
      // job document is not being processed, grab the embedded flow, and start the initial state
      // begin the flow processing
      sc.startProcessingFlow(uri);
      // continue cpf processing - continuing the current flow or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else {
      // we're done processing the flow
      // the default success action should transition us to the "done" cpf state and end processing
      xdmp.trace(sc.TRACE_EVENT, `state-conductor flow completed for job document "${uri}"`);
      cpf.success(uri, transition, null);
    }
  } catch (e) {
    xdmp.log('error executing flow:' + xdmp.describe(e), 'error');
    xdmp.log(e, 'error');
    cpf.failure(uri, transition, json.transformFromJson(e), null);
  }
}