'use strict';

function performAction(uri, options = {}, context = {}) {
  declareUpdate();
  xdmp.log('performing action "create-doc.sjs"');
  let {uriContextRoot, uriPrefix, collections} = options;

  let oldDocUri = uri;
  if (uriContextRoot) {
    if (context[uriContextRoot]) {
      oldDocUri = context[uriContextRoot].uri;
    } else {
      fn.error(null, 'DHF-FLOW-ERROR', Sequence.from(['"uriContextRoot" is defined, but not in context']));
    }
  }

  const doc = cts.doc(oldDocUri);
  const obj = doc.toObject();

  const envelope = {
    old: obj
  };

  let newDocUri = uriPrefix + sem.uuidString() + '.json';

  xdmp.documentInsert(newDocUri, envelope, {
    collections: collections
  });

  context.newDocUri = newDocUri;
  return context;
}

exports.performAction = performAction;
