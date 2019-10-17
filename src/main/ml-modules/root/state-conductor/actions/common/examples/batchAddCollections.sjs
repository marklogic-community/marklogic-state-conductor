/**
 * adds one or more collections to the document
 */

var uri;
var options;

function performAction(uri, options = {}) {
  const doc = cts.doc(uri);
  const batch = doc.toObject();

  batch.uris.forEach(uri => {
    if (options.collections) {
      xdmp.documentAddCollections(uri, options.collections);
    }
  });  
}

performAction(uri, options);