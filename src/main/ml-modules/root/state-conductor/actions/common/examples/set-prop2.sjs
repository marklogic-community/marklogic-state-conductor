'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.propertyB = 'The quick brown fox jumped over the lazy dog.';

  xdmp.nodeReplace(doc.root, obj);
}

xdmp.log('performing action "set-prop2.sjs"');
doAction(uri, flow);