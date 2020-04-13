'use strict';

const scLib = require('/state-conductor/state-conductor-lib.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
const context = {
  booleanTest: {
    truthy: true,
    falsy: false,
  },
  numericTest: {
    int1: 100,
    float1: 555.55,
  },
  stringTest: {
    fooLower: 'foo',
    fooUpper: 'FOO',
  },
  timestampTest: {
    now: fn.currentDateTime().toString(),
  },
};

// helper functions
function assertRuleIsTrue(rule) {
  return test.assertTrue(scLib.evaluateChoiceRule(rule, context));
}

function assertRuleIsFalse(rule) {
  return test.assertFalse(scLib.evaluateChoiceRule(rule, context));
}

// boolean tests
assertions.push(
  assertRuleIsTrue({
    BooleanEquals: true,
    Variable: '$.booleanTest.truthy',
  }),
  assertRuleIsTrue({
    BooleanEquals: false,
    Variable: '$.booleanTest.falsy',
  }),
  assertRuleIsFalse({
    BooleanEquals: true,
    Variable: '$.booleanTest.falsy',
  }),
  assertRuleIsFalse({
    BooleanEquals: false,
    Variable: '$.booleanTest.truthy',
  })
);

// numeric tests
assertions.push(
  assertRuleIsTrue({
    NumericEquals: 100,
    Variable: '$.numericTest.int1',
  }),
  assertRuleIsTrue({
    NumericEquals: 555.55,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsTrue({
    NumericGreaterThan: 555.54,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsFalse({
    NumericGreaterThan: 555.56,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsTrue({
    NumericGreaterThanEquals: 100,
    Variable: '$.numericTest.int1',
  }),
  assertRuleIsTrue({
    NumericGreaterThanEquals: 99,
    Variable: '$.numericTest.int1',
  }),
  assertRuleIsFalse({
    NumericLessThan: 555,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsTrue({
    NumericLessThan: 700,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsTrue({
    NumericLessThanEquals: 700,
    Variable: '$.numericTest.float1',
  }),
  assertRuleIsTrue({
    NumericLessThanEquals: 100,
    Variable: '$.numericTest.int1',
  })
);

// string tests
assertions.push(
  assertRuleIsTrue({
    StringEquals: 'foo',
    Variable: '$.stringTest.fooLower',
  }),
  assertRuleIsTrue({
    StringEquals: 'FOO',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsFalse({
    StringEquals: 'FOo',
    Variable: '$.stringTest.fooLower',
  }),
  assertRuleIsTrue({
    StringGreaterThan: 'FAA',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsTrue({
    StringGreaterThanEquals: 'FOO',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsFalse({
    StringGreaterThanEquals: 'FXX',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsTrue({
    StringLessThan: 'FXX',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsFalse({
    StringLessThan: 'fbb',
    Variable: '$.stringTest.fooLower',
  }),
  assertRuleIsTrue({
    StringLessThanEquals: 'FOO',
    Variable: '$.stringTest.fooUpper',
  }),
  assertRuleIsTrue({
    StringLessThanEquals: 'FZZ',
    Variable: '$.stringTest.fooUpper',
  })
);

// timestamp tests
assertions.push(
  assertRuleIsTrue({
    TimestampEquals: fn.currentDateTime().toString(),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsFalse({
    TimestampEquals: '2020-01-01T00:00:00Z',
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampGreaterThan: '2020-01-01T00:00:00Z',
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsFalse({
    TimestampGreaterThan: fn.currentDateTime().add(xs.dayTimeDuration('PT1M')),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampGreaterThanEquals: fn.currentDateTime().toString(),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampGreaterThanEquals: fn.currentDateTime().subtract(xs.dayTimeDuration('PT1M')),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampLessThan: fn.currentDateTime().add(xs.dayTimeDuration('PT1M')),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsFalse({
    TimestampLessThan: '2020-01-01T00:00:00Z',
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampLessThanEquals: fn.currentDateTime().toString(),
    Variable: '$.timestampTest.now',
  }),
  assertRuleIsTrue({
    TimestampLessThanEquals: fn.currentDateTime().add(xs.dayTimeDuration('PT1M')),
    Variable: '$.timestampTest.now',
  })
);

// "and" tests
assertions.push(
  assertRuleIsTrue({
    And: [
      {
        StringEquals: 'FOO',
        Variable: '$.stringTest.fooUpper',
      },
      {
        TimestampEquals: fn.currentDateTime().toString(),
        Variable: '$.timestampTest.now',
      },
      {
        NumericGreaterThanEquals: 100,
        Variable: '$.numericTest.int1',
      },
    ],
  }),
  assertRuleIsFalse({
    And: [
      {
        StringEquals: 'FOO',
        Variable: '$.stringTest.fooUpper',
      },
      {
        TimestampLessThan: '2020-01-01T00:00:00Z',
        Variable: '$.timestampTest.now',
      },
    ],
  }),
  assertRuleIsTrue({
    And: [
      {
        StringEquals: 'FOO',
        Variable: '$.stringTest.fooUpper',
      },
      {
        And: [
          {
            StringEquals: 'foo',
            Variable: '$.stringTest.fooLower',
          },
          {
            NumericGreaterThanEquals: 99,
            Variable: '$.numericTest.int1',
          },
        ],
      },
    ],
  }),
  assertRuleIsTrue({
    And: [
      {
        Or: [
          {
            StringEquals: 'FOO',
            Variable: '$.stringTest.fooUpper',
          },
          {
            StringEquals: 'FOO',
            Variable: '$.stringTest.fooLower',
          },
        ],
      },
      {
        Or: [
          {
            NumericLessThanEquals: 99,
            Variable: '$.numericTest.int1',
          },
          {
            NumericGreaterThanEquals: 99,
            Variable: '$.numericTest.int1',
          },
        ],
      },
    ],
  })
);

// "or" tests
assertions.push(
  assertRuleIsTrue({
    Or: [
      {
        NumericGreaterThanEquals: 200,
        Variable: '$.numericTest.int1',
      },
      {
        StringEquals: 'FOO',
        Variable: '$.stringTest.fooUpper',
      },
      {
        TimestampLessThan: '2020-01-01T00:00:00Z',
        Variable: '$.timestampTest.now',
      },
    ],
  }),
  assertRuleIsFalse({
    Or: [
      {
        NumericGreaterThanEquals: 200,
        Variable: '$.numericTest.int1',
      },
      {
        TimestampLessThan: '2020-01-01T00:00:00Z',
        Variable: '$.timestampTest.now',
      },
    ],
  }),
  assertRuleIsTrue({
    Or: [
      {
        And: [
          {
            StringEquals: 'foo',
            Variable: '$.stringTest.fooLower',
          },
          {
            NumericGreaterThanEquals: 99,
            Variable: '$.numericTest.int1',
          },
        ],
      },
      {
        Or: [
          {
            TimestampEquals: fn.currentDateTime().toString(),
            Variable: '$.timestampTest.now',
          },
          {
            BooleanEquals: true,
            Variable: '$.booleanTest.falsy',
          },
        ],
      },
    ],
  })
);

// "not" tests
assertions.push(
  assertRuleIsTrue({
    Not: {
      BooleanEquals: true,
      Variable: '$.booleanTest.falsy',
    },
  }),
  assertRuleIsFalse({
    Not: {
      BooleanEquals: true,
      Variable: '$.booleanTest.truthy',
    },
  })
);

// return
assertions;
