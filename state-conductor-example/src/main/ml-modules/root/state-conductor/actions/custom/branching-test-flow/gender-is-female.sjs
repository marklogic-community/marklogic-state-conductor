'use strict';

function checkCondition(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  return !!obj.gender && obj.gender.toLowerCase() === 'female';
}

exports.checkCondition = checkCondition;
