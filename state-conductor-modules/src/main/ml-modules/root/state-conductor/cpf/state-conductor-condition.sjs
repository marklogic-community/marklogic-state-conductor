'use strict';

const cpf = require('/MarkLogic/cpf/cpf.xqy');
const sc  = require('/state-conductor/state-conductor.sjs');

var uri;

xdmp.trace(sc.TRACE_EVENT, `state-conductor-condition check for "${uri}"`);

fn.true();