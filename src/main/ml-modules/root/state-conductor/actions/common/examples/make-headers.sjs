'use strict';

declareUpdate();

var uri;
var flow;

function doAction(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.headers.name = obj.instance.name || 'anonymous';

  xdmp.nodeReplace(doc.root, obj);
}

xdmp.log('performing action "make-headers.sjs"');
doAction(uri, flow);