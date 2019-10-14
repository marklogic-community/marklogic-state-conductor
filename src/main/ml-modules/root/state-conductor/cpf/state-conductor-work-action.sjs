'use strict';
declareUpdate();

const cpf = require('/MarkLogic/cpf/cpf.xqy');
const json = require('/MarkLogic/json/json.xqy');
const sc  = require('/state-conductor/state-conductor.sjs');

var uri;
var transition;

if (cpf.checkTransition(uri, transition)) {
  try {
    xdmp.log(`state-conductor-work-action for "${uri}"`);

    if (sc.isDocumentInProcess(uri)) {
      // document is being processed by a flow, continue that flow
      const currFlowName = sc.getInProcessFlows(uri)[0];
      xdmp.log(`executing flow "${currFlowName}"`);
      const currFlowState = sc.getFlowState(uri, currFlowName);
      xdmp.log(`flow state "${currFlowState}"`);
      const currFlow = sc.getFlowDocument(currFlowName).toObject();
      // execute state actions
      sc.performStateActions(uri, currFlow, currFlowState);
      // execute state transition
      sc.executeStateTransition(uri, currFlow);
      // continue cpf processing - continuing the current flow or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else {
      // document is not being processed, see if any flows apply
      const flows = sc.getApplicableFlows(uri);
      xdmp.log(`found ${flows.length} matching state-conductor flows`);
      if (flows.length > 0) {
        // put the document into the flows intial state
        const currFlow = flows[0].toObject();
        const currFlowName = currFlow.flowName;
        const currFlowState = currFlow.StartAt;
        xdmp.log(`adding document to flow: "${currFlowName}" in state: "${currFlowState}"`);
        sc.setFlowStatus(uri, currFlowName, currFlowState);
        sc.addProvenanceEvent(uri, currFlowName, 'NEW', currFlowState);
        // continue cpf processing - continuing the current flow or any others that apply
        cpf.success(uri, transition, 'http://marklogic.com/states/working');
      } else {
        // no flows apply, so remove from cpf processing
        // the default success action should transition us to the "done" cpf state and end processing
        cpf.success(uri, transition, null);
      }
    }

  } catch (e) {
    xdmp.log(e, 'error');
    cpf.failure(uri, transition, json.transformFromJson(e), null);
  }
}