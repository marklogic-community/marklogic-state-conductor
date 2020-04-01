"use strict";
const test = require("/test/test-helper.xqy");
const assertions = [];
let assertion;

let invokeDeveloperResult = xdmp
  .httpGet(
    "http://localhost:8010/v1/resources/state-conductor-flows?rs:flowName=waitState-time-flow",
    {
      authentication: {
        username: "state-conductor-test-developer",
        password: "admin"
      }
    }
  )
  .toArray();

let invokeNonDeveloperResult = xdmp
  .httpGet(
    "http://localhost:8010/v1/resources/state-conductor-flows?rs:flowName=waitState-time-flow",
    {
      authentication: {
        username: "state-conductor-test-non-developer",
        password: "admin"
      }
    }
  )
  .toArray();

assertion = invokeDeveloperResult[0];
assertions.push(
  test.assertEqual(200, assertion.code, "developer operation successful")
);
assertion = invokeNonDeveloperResult[0];
assertions.push(
  test.assertEqual(
    403,
    assertion.code,
    "non developer have no access to run state conductor code"
  )
);

const sc = require("/state-conductor/state-conductor.sjs");

let evalDeveloperResult = xdmp.eval("cts.uris().toArray().length", null, {
  database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB),
  userId: xdmp.user("state-conductor-test-developer")
});
let evalNonDeveloperResult = xdmp.eval("cts.uris().toArray().length", null, {
  database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB),
  userId: xdmp.user("state-conductor-test-non-developer")
});
assertion = evalDeveloperResult <= evalNonDeveloperResult ? true : false;
assertions.push(
  test.assertEqual(
    true,
    assertion,
    "non developer have no access to run state conductor code"
  )
);


assertions;
