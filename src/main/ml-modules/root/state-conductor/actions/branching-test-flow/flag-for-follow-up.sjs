'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.followUp = true;

  xdmp.nodeReplace(doc.root, obj);
  xdmp.documentAddCollections(uri, 'follow-up');
}

doAction(uri, flow);