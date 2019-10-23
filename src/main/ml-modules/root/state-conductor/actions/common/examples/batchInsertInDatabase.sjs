/**
 * inserts document(s) into the given database
 */

var uri;
var options;

function performAction(uri, options = {}) {
  const doc = cts.doc(uri);
  const batch = doc.toObject();

  const database = xdmp.database(options.database);
  const collections = options.collections || [];

  batch.uris.forEach(uri => {
    const data = cts.doc(uri);
    xdmp.invokeFunction(() => {
      declareUpdate();
      xdmp.documentInsert(uri, data, {
        collections: collections
      });
    }, {
      database: database
    });
  });  
}

performAction(uri, options);