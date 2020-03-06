'use strict';

declareUpdate();

var uriArray;
var resumeBy;

const sc  = require('/state-conductor/state-conductor.sjs');

uriArray.forEach(uri => sc.resumeWaitingJob(uri, resumeBy));