/**
 * adds one or more collections to the document
 */

function performAction(uri, options = {}) {

  // add optional collections
  if (options.collections) {
    xdmp.documentAddCollections(uri, options.collections);
  }
  
}

exports.performAction = performAction;