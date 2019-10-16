/**
 * adds one or more collections to the document
 */

var uri;
var options;

function performAction(uri, options = {}) {

  // add optional collections
  if (options.collections) {
    xdmp.documentAddCollections(uri, options.collections);
  }
  
}

performAction(uri, options);