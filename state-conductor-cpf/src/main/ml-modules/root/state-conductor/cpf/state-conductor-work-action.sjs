'use strict';
declareUpdate();

const cpf = require('/MarkLogic/cpf/cpf.xqy');
const json = require('/MarkLogic/json/json.xqy');
const sc = require('/state-conductor/state-conductor.sjs');

var uri;
var transition;

if (cpf.checkTransition(uri, transition)) {
  try {
    xdmp.trace(sc.TRACE_EVENT, `state-conductor-work-action for "${uri}"`);
    const continueExecution = sc.processExecution(uri);
    if (continueExecution) {
      // continue cpf processing - continuing the current state machine or any others that apply
      cpf.success(uri, transition, 'http://marklogic.com/states/working');
    } else {
      // the default success action should transition us to the "done" cpf state and end processing
      cpf.success(uri, transition, null);
    }
  } catch (e) {
    xdmp.log('error executing state machine:' + xdmp.describe(e), 'error');
    xdmp.log(e, 'error');
    cpf.failure(uri, transition, json.transformFromJson(e), null);
  }
}
