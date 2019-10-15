'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  const envelope = {
    headers: {},
    triples: [],
    instance: obj
  };

  xdmp.nodeReplace(doc.root, envelope);
}

xdmp.log('performing action "make-envelope.sjs"');
doAction(uri, flow);