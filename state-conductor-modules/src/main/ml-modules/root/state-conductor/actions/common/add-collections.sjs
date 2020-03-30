'use strict';
/**
 * adds one or more collections to the document
 */

function performAction(uri, options = {}, context = {}) {
  declareUpdate();

  // add optional collections
  if (options.collections) {
    xdmp.documentAddCollections(uri, options.collections);
  }

  return context;
}

exports.performAction = performAction;
