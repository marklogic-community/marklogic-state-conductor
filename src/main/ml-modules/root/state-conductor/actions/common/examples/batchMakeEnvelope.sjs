'use strict';

declareUpdate();

var uri;
var options;

function performAction(uri, options = {}) {
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

performAction(uri, options);