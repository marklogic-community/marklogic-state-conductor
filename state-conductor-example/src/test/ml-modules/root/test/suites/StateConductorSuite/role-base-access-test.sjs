"use strict";

/*
Checks the permisisons  on 100 flow documents
*/
const test = require("/test/test-helper.xqy");
const sc = require("/state-conductor/state-conductor.sjs");
//queries the modules database
function modules() {
  return {
    //gets all the modules and their permissions
    checkPermissions: function checkPermissions() {
      return cts
        .uris(null, "limit=100")
        .toArray()
        .map(function(uri) {
          let obj = {
            uri,
            permissions: xdmp.documentGetPermissions(uri)
          };
          return obj;
        });
    }
  };
}

const modulesInvoked = modules();

const permissionArray = fn.head(
  xdmp.invokeFunction(modulesInvoked.checkPermissions, {
    database: xdmp.database(sc.STATE_CONDUCTOR_JOBS_DB)
  })
);

const asserts = [];

//goes through each modules to make sure it has the permissions
permissionArray.forEach(function(item) {
  var permissionObject = {};

  item.permissions.forEach(function(permissionItem) {
    if (!permissionObject.hasOwnProperty(permissionItem.roleId)) {
      permissionObject[xdmp.roleName(permissionItem.roleId)] = {};
    }
    permissionObject[xdmp.roleName(permissionItem.roleId)][
      permissionItem.capability
    ] = true;
  });

  const uriAsString = item.uri.toString();

  if (uriAsString.includes("/stateConductorJob")) {
    asserts.push(
      test.assertTrue(
        permissionObject.hasOwnProperty("state-conductor-job-writer-role"),
        item.uri
      )
    );
    asserts.push(
      test.assertTrue(
        permissionObject["state-conductor-job-writer-role"]["update"],
        item.uri
      )
    );
    asserts.push(
      test.assertTrue(
        permissionObject["state-conductor-job-writer-role"]["read"],
        item.uri
      )
    );
    asserts.push(
      test.assertTrue(
        permissionObject.hasOwnProperty("state-conductor-reader-role"),
        item.uri
      )
    );
    asserts.push(
      test.assertTrue(
        permissionObject["state-conductor-reader-role"]["read"],
        item.uri
      )
    );
    asserts.push(
      test.assertFalse(
        permissionObject["state-conductor-reader-role"]["update"],
        item.uri
      )
    );
  }
});
asserts;
