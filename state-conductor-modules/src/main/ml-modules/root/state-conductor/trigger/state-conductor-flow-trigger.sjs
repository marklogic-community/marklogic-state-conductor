'use strict';

const sc = require("/state-conductor/state-conductor.sjs");
const validator = require("/state-conductor/flow-file-validator.sjs");

var uri;
var trigger;



let flowfile = fn.doc(uri);
 if (!validator.validateFlowFile(flowfile.toObject())) {
   fn.error(xs.QName("ERROR"), `Invalid state-conductor flow file "${uri}"`);
 }

xdmp.trace( sc.TRACE_EVENT, `state-conductor-flow-trigger completed for "${uri}"`);
