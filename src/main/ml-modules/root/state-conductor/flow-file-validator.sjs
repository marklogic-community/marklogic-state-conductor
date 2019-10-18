'use strict';

// TODO utilize existing json schemas https://github.com/airware/asl-validator/

const schema = {
  properties: {
    Comment: { type: 'string' },
    StartAt: { type: 'string' },
    States: { 
      type: 'object',
    },
    Version: { type: 'string' },
    mlDomain: {
      type: 'object',
      properties: {
        contentDatabase: { type: 'string' },
        modulesDatabase: { type: 'string' },
        context: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              scope: { type: 'string' },
              value: { type: 'string' }
            },
            additionalProperties: false,
            required: ['scope', 'value']          
          }
        }
      },
      additionalProperties: false,
      required: ['contentDatabase', 'modulesDatabase', 'context']
    }
  },
  additionalProperties: false,
  required: ['StartAt', 'States', 'mlDomain']
};


/**
 * Given a state conductor flow, validate against the
 * MarkLogic implementation of Amazon State Language
 *
 * @param {*} flow
 * @returns
 */
function validateFlowFile(flow) {
  try {
    xdmp.jsonValidateNode(flow, schema);
    return true;
  } catch(err) {
    return false;
  }
}

module.exports = {
  validateFlowFile
};