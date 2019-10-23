'use strict';

function performAction(uri) {
  declareUpdate();
  xdmp.log('performing action "make-envelope.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  const envelope = {
    headers: {},
    triples: [],
    instance: obj
  };

  xdmp.nodeReplace(doc.root, envelope);
}

exports.performAction = performAction;