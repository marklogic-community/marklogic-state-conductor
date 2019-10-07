'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.propertyA = Math.random().toString();

  xdmp.nodeReplace(doc.root, obj);
}

xdmp.log('performing action "set-prop1.sjs"');
doAction(uri, flow);