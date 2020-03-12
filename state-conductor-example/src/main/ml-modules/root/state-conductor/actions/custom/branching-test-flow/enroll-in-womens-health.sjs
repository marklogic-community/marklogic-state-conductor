'use strict';

function performAction(uri, options, context) {
  declareUpdate();
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['womens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'womens-health');

  return context;
}

exports.performAction = performAction;
