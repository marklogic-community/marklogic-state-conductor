/**
 * creates a batch processing file for a single record
 */

const sc = require('/state-conductor/state-conductor.sjs');

function performAction(uri, options = {}) {

  sc.createBatchRecord([uri], {}, options);

}

exports.performAction = performAction;