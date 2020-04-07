'use strict';

const sclib = require('/state-conductor/state-conductor-lib.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let assertion;

//"found waiting job")
assertion = sclib.getConfiguration();

assertions.push(test.assertTrue(assertion.foundCustomConfiguration, 'found Custom Configuration'));

try {
  assertion = fn.head(
    xdmp.invokeFunction(
      () => {
        return sclib.getConfiguration().foundCustomConfiguration;
      },
      {
        database: xdmp.database(),
        modules: xdmp.database('state-conductor-dataservices-modules'),
      }
    )
  );
} catch (e) {
  assertion = 'error: ' + JSON.stringify(e.stack);
}

assertions.push(test.assertEqual(assertion, false, 'did not find Custom Configuration'));

assertions;
