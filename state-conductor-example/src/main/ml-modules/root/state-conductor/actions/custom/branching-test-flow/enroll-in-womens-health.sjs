'use strict';

function performAction(uri) {
  declareUpdate();
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['womens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'womens-health');
}

exports.performAction = performAction;