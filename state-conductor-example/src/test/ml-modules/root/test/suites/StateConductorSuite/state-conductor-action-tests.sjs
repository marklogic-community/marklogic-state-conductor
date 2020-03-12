'use strict';

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];

const textFileSplitter = require('/state-conductor/actions/common/text-file-splitter.sjs');

const doc1 = '/data/lorem.txt';

function isolate(func) {
  return fn.head(xdmp.invokeFunction(() => {
    declareUpdate();
    return func();
  }, {
    isolation: 'different-transaction',
    commit: 'auto'
  }));
}

// text file splitter tests

// split using defaults defaults
let result = isolate(() => textFileSplitter.performAction(doc1));
assertions.push(
  test.assertEqual(10, result.splits.total),
  test.assertEqual(true, Array.isArray(result.splits.uris)),
  test.assertEqual(10, result.splits.uris.length)
);
isolate(() => {
  result.splits.uris.forEach(uri => {
    assertions.push(
      test.assertEqual(true, fn.docAvailable(uri))
    );
  });
});
isolate(() => {
  let split1 = cts.doc('/data/lorem.txt/0.txt').root;
  let split9 = cts.doc('/data/lorem.txt/9.txt').root;
  assertions.push(
    test.assertNotEqual('Sample Multiline Text Document', split1.toString().trim()),
    test.assertEqual(null, split9)
  );
});

// split retaining header
result = isolate(() => textFileSplitter.performAction(doc1, {
  skipHeader: false
}));
assertions.push(
  test.assertEqual(11, result.splits.total),
  test.assertEqual(true, Array.isArray(result.splits.uris)),
  test.assertEqual(11, result.splits.uris.length)
);
isolate(() => {
  let split1 = cts.doc('/data/lorem.txt/0.txt').root;
  let split9 = cts.doc('/data/lorem.txt/10.txt').root;
  assertions.push(
    test.assertEqual('Sample Multiline Text Document', split1.toString().trim()),
    test.assertEqual(null, split9)
  );
});

// split skipping trailing EOF
result = isolate(() => textFileSplitter.performAction(doc1, {
  skipTrailingEOF: true
}));
assertions.push(
  test.assertEqual(9, result.splits.total),
  test.assertEqual(true, Array.isArray(result.splits.uris)),
  test.assertEqual(9, result.splits.uris.length)
);
isolate(() => {
  let split1 = cts.doc('/data/lorem.txt/0.txt').root;
  let split8 = cts.doc('/data/lorem.txt/8.txt').root;
  assertions.push(
    test.assertNotEqual('Sample Multiline Text Document', split1.toString().trim()),
    test.assertEqual(true, split8.toString().startsWith('Nam quis interdum leo'))
  );
});

// split on periods
result = isolate(() => textFileSplitter.performAction(doc1, {
  delimiterPattern: '\\.',
  skipHeader: false,
  skipTrailingEOF: true
}));
assertions.push(
  test.assertEqual(66, result.splits.total),
  test.assertEqual(true, Array.isArray(result.splits.uris)),
  test.assertEqual(66, result.splits.uris.length)
);
isolate(() => {
  let split1 = cts.doc('/data/lorem.txt/0.txt').root;
  let split64 = cts.doc('/data/lorem.txt/64.txt').root;
  let split65 = cts.doc('/data/lorem.txt/65.txt').root;
  xdmp.log(split65);
  assertions.push(
    test.assertEqual(true, split1.toString().startsWith('Sample Multiline Text Document')),
    test.assertEqual(true, split64.toString().startsWith(' Nam eu nunc non nibh sodales eleifend')),
    test.assertEqual(null, split65)
  );
});

// return
assertions;
