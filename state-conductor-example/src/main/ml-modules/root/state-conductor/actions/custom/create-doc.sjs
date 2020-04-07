'use strict';

function performAction(uri, options = {}, context = {}) {
  declareUpdate();
  xdmp.log('performing action "create-doc.sjs"');
  let { uriPrefix, collections } = options;
  let { newDocUri } = context;

  // use uri, or the value from context
  let oldDocUri = newDocUri ? newDocUri : uri;

  const doc = cts.doc(oldDocUri);
  const obj = doc.toObject();

  const envelope = {
    old: obj,
  };

  newDocUri = uriPrefix + sem.uuidString() + '.json';

  xdmp.documentInsert(newDocUri, envelope, {
    collections: collections,
  });

  context.newDocUri = newDocUri;
  return context;
}

exports.performAction = performAction;
