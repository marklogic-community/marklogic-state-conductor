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

    if (sc.isDocumentInProcess(uri)) {
      // batch document is being processed by a flow, continue that flow
      const currFlowName = sc.getInProcessFlows(uri)[0];
      xdmp.trace(sc.TRACE_EVENT, `executing flow "${currFlowName}"`);
      const currFlowState = sc.getFlowState(uri, currFlowName);
      xdmp.trace(sc.TRACE_EVENT, `flow state "${currFlowState}"`);
      const currFlow = sc.getFlowDocument(currFlowName).toObject();
      try {
        // execute state actions
        sc.performStateActions(uri, currFlow, currFlowState);
        // execute state transition
        sc.executeStateTransition(uri, currFlowName, currFlow);
      } catch (err) {
        sc.handleStateFailure(uri, currFlowName, currFlow, currFlowState, err);
      }      
      // continue cpf processing - continuing the current flow or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else {
      // batch document is not being processed, grab the embedded flow, and start the initial state
      const job = cts.doc(uri).toObject();
      const currFlowName = job.flowName;
      if (!sc.getFlowStatus(uri, currFlowName)) {
        const currFlow = sc.getFlowDocument(currFlowName).toObject();
        const currFlowState = sc.getInitialState(currFlow);
        xdmp.trace(sc.TRACE_EVENT, `adding document to flow: "${currFlowName}" in state: "${currFlowState}"`);
        sc.setFlowStatus(uri, currFlowName, currFlowState);
        sc.addProvenanceEvent(uri, currFlowName, 'NEW', currFlowState);
        // continue cpf processing - continuing the current flow or any others that apply
        cpf.success(uri, transition, 'http://marklogic.com/states/working');
      } else {
        // we're done processing the flow
        // the default success action should transition us to the "done" cpf state and end processing
        cpf.success(uri, transition, null);
      }
    }

  } catch (e) {
    xdmp.log(e, 'error');
    cpf.failure(uri, transition, json.transformFromJson(e), null);
  }
}