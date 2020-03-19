'use strict';

function performAction(uri, options, context) {
  declareUpdate();
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['mens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'mens-health');

  return context;
}

exports.performAction = performAction;
