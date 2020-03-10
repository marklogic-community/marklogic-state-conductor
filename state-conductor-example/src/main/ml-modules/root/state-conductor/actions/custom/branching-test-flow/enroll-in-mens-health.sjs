'use strict';

function performAction(uri) {
  declareUpdate();
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['mens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'mens-health');
}

exports.performAction = performAction;