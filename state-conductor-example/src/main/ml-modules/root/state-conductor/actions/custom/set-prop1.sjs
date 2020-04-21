'use strict';

function performAction(uri) {
  declareUpdate();
  xdmp.log('performing action "set-prop1.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.propertyA = Math.random().toString();

  xdmp.nodeReplace(doc.root, obj);
}

exports.performAction = performAction;
