'use strict';


function performAction(uri, options = {}) {
  declareUpdate();
  const batchDoc = cts.doc(uri);
  const batch = batchDoc.toObject();

  batch.uris.forEach(uri => {
    const doc = cts.doc(uri);
    const obj = doc.toObject();

    const envelope = {
      headers: {},
      triples: [],
      instance: obj
    };
  
    xdmp.log(`wrapping "${uri}" in envelope`);
    xdmp.nodeReplace(doc.root, envelope);
  });  
}

exports.performAction = performAction;