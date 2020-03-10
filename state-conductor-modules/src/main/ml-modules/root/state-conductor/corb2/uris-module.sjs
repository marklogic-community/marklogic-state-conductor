/**
 * CORB2 URIS MODULE
 */
'use strict';
const sc = require('/state-conductor/state-conductor.sjs');



let options = {
  count: 100,
  flowStatus: [sc.FLOW_STATUS_NEW, sc.FLOW_STATUS_WORKING],
  flowNames: null,
  startDate: null,
  endDate: null
}


const uris = sc.getJobDocuments(options);

Sequence.from([uris.length, ...uris]);
