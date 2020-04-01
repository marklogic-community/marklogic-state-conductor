'use strict';

const scLib = require('/state-conductor/state-conductor-lib.sjs');
const test  = require('/test/test-helper.xqy');

const assertions = [];

// referencePathToXpath tests
assertions.push(
  test.assertEqual('/', scLib.referencePathToXpath()),
  test.assertEqual('/', scLib.referencePathToXpath('$')),
  test.assertEqual('/name', scLib.referencePathToXpath('$.name')),
  test.assertEqual('/name/first', scLib.referencePathToXpath('$.name.first')),
  test.assertEqual('/address/street/zip', scLib.referencePathToXpath('$.address.street.zip')),
  test.assertEqual('/context[1]', scLib.referencePathToXpath('$.context[1]')),
  test.assertEqual('/context[1]/name', scLib.referencePathToXpath('$.context[1]/name'))
);

let context = {
  one: 1,
  two: 'two',
  bool: true,
  name: {
    first: 'john',
    last: 'doe'
  },
  address: {
    street: {
      line1: '555 fake street',
      line2: 'apartment 555'
    },
    zip: '55555',
    nested: {
      nested: {
        nested: {
          foo: 'bar'
        }
      }
    }
  },
  arr: [
    {
      name: 'first'
    },
    {
      name: 'second'
    }
  ]
};

// materializeReferencePath tests
assertions.push(
  test.assertEqual(JSON.stringify(context), JSON.stringify(scLib.materializeReferencePath('$', context))),
  test.assertEqual(1, scLib.materializeReferencePath('$.one', context)),
  test.assertEqual('two', scLib.materializeReferencePath('$.two', context)),
  test.assertEqual(true, scLib.materializeReferencePath('$.bool', context)),
  test.assertEqual(JSON.stringify(context.name), JSON.stringify(scLib.materializeReferencePath('$.name', context))),
  test.assertEqual('bar', scLib.materializeReferencePath('$.address.nested.nested.nested.foo', context))
);

// materializeParameters tests
let params = {
  static1: 'one',
  static2: 2,
  static3: false,
  static4: {
    name: 'asdf'
  },
  'rp1.$': '$.one',
  'rp2.$': '$.two',
  'rp3.$': '$.bool',
  'missing.$': '$.some.missing.property',
  'first.$': '$.name.first',
  'last.$': '$.name.last',
  'deep.$': '$.address.nested.nested.nested.foo',
  'street.$': '$.address.street.line1',
  'arr.$': '$.arr',
  'arr1.$': '$.arr[1]',
  'arr2.$': '$.arr[2]',
  'arr1name.$': '$.arr[1].name',
  'arr2name.$': '$.arr[2].name',
};
assertions.push(
  test.assertEqual('{}', JSON.stringify(scLib.materializeParameters())),
  test.assertEqual('{}', JSON.stringify(scLib.materializeParameters({}))),
  test.assertEqual('{}', JSON.stringify(scLib.materializeParameters({}, {}))),
  test.assertEqual('{}', JSON.stringify(scLib.materializeParameters({}, context)))
);

let resp = scLib.materializeParameters(params, context);
xdmp.log(resp);

assertions.push(
  test.assertEqual(null, resp.missing),
  test.assertEqual('one', resp.static1),
  test.assertEqual(2, resp.static2),
  test.assertEqual(false, resp.static3),
  test.assertEqual(JSON.stringify(params.static4), JSON.stringify(resp.static4)),
  test.assertEqual(1, resp.rp1),
  test.assertEqual('two', resp.rp2),
  test.assertEqual(true, resp.rp3),
  test.assertEqual('bar', resp.deep),
  test.assertEqual('555 fake street', resp.street)
);

assertions.push(
  test.assertEqual(JSON.stringify(context.arr[0]), JSON.stringify(resp.arr), 'xpath returns the first node of the array'),
  test.assertEqual(JSON.stringify(context.arr[0]), JSON.stringify(resp.arr1), 'xpath uses 1 based array origin'),
  test.assertEqual(JSON.stringify(context.arr[1]), JSON.stringify(resp.arr2), 'xpath uses 1 based array origin'),
  test.assertEqual('first', resp.arr1name, 'xpath uses 1 based array origin - sub selection'),
  test.assertEqual('second', resp.arr2name, 'xpath uses 1 based array origin - sub selection')
);

// return
assertions;
