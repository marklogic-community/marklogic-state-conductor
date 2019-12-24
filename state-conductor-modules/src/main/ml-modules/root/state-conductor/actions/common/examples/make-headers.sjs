'use strict';

function performAction(uri) {
  declareUpdate();
  xdmp.log('performing action "make-headers.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.headers.name = obj.instance.name || 'anonymous';

  xdmp.nodeReplace(doc.root, obj);
}

exports.performAction = performAction;