'use strict';

function checkCondition(uri) {
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  return !!obj.gender && obj.gender.toLowerCase() === 'male';
}

exports.checkCondition = checkCondition;
