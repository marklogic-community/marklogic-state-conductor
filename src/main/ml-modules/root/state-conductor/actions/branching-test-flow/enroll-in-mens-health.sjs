'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.programs = ['mens-health'];

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'mens-health');
}

doAction(uri, flow);