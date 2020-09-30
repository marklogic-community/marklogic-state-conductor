'use strict';

function performAction(uri, options, context) {
  declareUpdate();
  xdmp.log('performing action "make-envelope.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  const envelope = {
    headers: {},
    triples: [],
    instance: obj,
  };

  xdmp.nodeReplace(doc.root, envelope);
  return context;
}

exports.performAction = performAction;
