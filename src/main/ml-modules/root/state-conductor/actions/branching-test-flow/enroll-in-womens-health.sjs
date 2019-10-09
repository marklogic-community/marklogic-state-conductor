'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['womens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'womens-health');
}

doAction(uri, flow);