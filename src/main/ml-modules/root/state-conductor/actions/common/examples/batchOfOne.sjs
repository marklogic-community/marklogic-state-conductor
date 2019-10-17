/**
 * creates a batch processing file for a single record
 */

const sc = require('/state-conductor/state-conductor.sjs');

var uri;
var options;

function performAction(uri, options = {}) {

  sc.createBatchRecord([uri], {}, options);

}

performAction(uri, options);