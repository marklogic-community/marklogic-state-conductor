'use strict';

declareUpdate();

var uriArray;
var resumeBy;
var save;

const sc = require('/state-conductor/state-conductor.sjs');

uriArray.forEach((uri) => sc.resumeWaitingExecution(uri, resumeBy, save));
