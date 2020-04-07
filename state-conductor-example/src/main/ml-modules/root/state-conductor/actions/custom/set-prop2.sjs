'use strict';

function performAction(uri) {
  declareUpdate();
  xdmp.log('performing action "set-prop2.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  obj.propertyB = 'The quick brown fox jumped over the lazy dog.';

  xdmp.nodeReplace(doc.root, obj);
}

exports.performAction = performAction;
