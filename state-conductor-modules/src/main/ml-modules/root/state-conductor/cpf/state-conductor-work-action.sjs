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
    xdmp.log('checking if job is in progress...');
    if (sc.isJobInProcess(uri)) {
      xdmp.log('job is in progress, continuing...');
      // job document is being processed by a flow, continue that flow
      const currFlowName = sc.getInProcessFlows(uri)[0];
      xdmp.trace(sc.TRACE_EVENT, `executing flow "${currFlowName}"`);
      const currFlowState = sc.getFlowState(uri, currFlowName);
      xdmp.trace(sc.TRACE_EVENT, `flow state "${currFlowState}"`);
      // execute state actions and transition to next state
      sc.executeState(uri, currFlowName, currFlowState);     
      // continue cpf processing - continuing the current flow or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else {
      // job document is not being processed, grab the embedded flow, and start the initial state
      xdmp.log('job is not processing, grabbing flow...');
      const job = cts.doc(uri).toObject();
      const currFlowName = job.flowName;
      xdmp.log(`checking flow "${currFlowName}" status...`);
      const status = sc.getFlowStatus(uri, currFlowName);
      xdmp.log(`status=${status}`);
      if (status === null) {
        xdmp.log(`fetching flow document: ${currFlowName}`);
        const currFlow = sc.getFlowDocumentFromDatabase(currFlowName, job.database).toObject();
        xdmp.log(`got flow document: ${currFlowName}!`);
        const currFlowState = sc.getInitialState(currFlow);
        xdmp.trace(sc.TRACE_EVENT, `adding document to flow: "${currFlowName}" in state: "${currFlowState}"`);
        sc.setFlowStatus(uri, currFlowName, currFlowState);
        sc.addProvenanceEvent(uri, currFlowName, 'NEW', currFlowState);
        // continue cpf processing - continuing the current flow or any others that apply
        cpf.success(uri, transition, 'http://marklogic.com/states/working');
      } else {
        // we're done processing the flow
        // the default success action should transition us to the "done" cpf state and end processing
        xdmp.trace(sc.TRACE_EVENT, `state-conductor flow completed for job document "${uri}"`);
        cpf.success(uri, transition, null);
      }
    }

  } catch (e) {
    xdmp.log('error executing flow:' + xdmp.describe(e), 'error');
    xdmp.log(e, 'error');
    cpf.failure(uri, transition, json.transformFromJson(e), null);
  }
}