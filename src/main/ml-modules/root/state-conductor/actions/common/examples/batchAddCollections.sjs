/**
 * adds one or more collections to the document
 */

function performAction(uri, options = {}) {
  const doc = cts.doc(uri);
  const batch = doc.toObject();

  batch.uris.forEach(uri => {
    if (options.collections) {
      xdmp.documentAddCollections(uri, options.collections);
    }
  });  
}

exports.performAction = performAction;