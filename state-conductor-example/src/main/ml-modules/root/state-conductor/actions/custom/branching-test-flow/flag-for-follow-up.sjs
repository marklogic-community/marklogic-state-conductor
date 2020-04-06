'use strict';

function performAction(uri) {
  declareUpdate();
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.followUp = true;

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'follow-up');
}

exports.performAction = performAction;
