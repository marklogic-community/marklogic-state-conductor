'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, erorr, assertion;

//checks a waiting state working
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "wait-flow", 
"flowStatus": "working", 
"flowState": "dialUp", 
"uri": "/data/test-doc1.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(),
"provenance": []
})

erorr = null;

try {  
  erorr = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check working"))

//checks a waiting state working
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "wait-flow", 
"flowStatus": "new", 
"flowState": "dialUp", 
"uri": "/data/test-doc1.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(),
"provenance": []
})

erorr = null;

try {  
  erorr = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check new"))

//resume waiting 
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "wait-flow", 
"flowStatus": "waiting", 
"flowState": "dialUp", 
"uri": "/data/test-doc1.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(),
"provenance": []
})

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);

assertions.push(test.assertEqual("working", assertion.flowStatus, "working flowStatus"))
assertions.push(test.assertFalse(assertion.hasOwnProperty("currentlyWaiting"), "waiting currentlyWaiting"))

//unKnown database (content)
jobDoc = xdmp.toJSON(
  {
    "id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
    "flowName": "wait-flow", 
    "flowStatus": "waiting", 
    "flowState": "dialUp", 
    "uri": "/data/test-doc1.json", 
    "database": 1233456, 
    "modules": xdmp.modulesDatabase(), 
     "provenance": []
  })

erorr = null;
try {  
  erorr = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("XDMP-NODB", erorr.name, "unKnown database content"))

//unKnown module database
jobDoc = xdmp.toJSON(
  {
    "id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
    "flowName": "wait-flow", 
    "flowStatus": "waiting", 
    "flowState": "dialUp", 
    "uri": "/data/test-doc1.json",   
    "database":  xdmp.database(),
    "modules": 12345, 
    "provenance": []
  })

assertion = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);

assertions.push(test.assertEqual("working", assertion.flowStatus, "working flowStatus"))
assertions.push(test.assertFalse(assertion.hasOwnProperty("currentlyWaiting"), "waiting currentlyWaiting"))

//unKnown database both
jobDoc = xdmp.toJSON(
  {
    "id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
    "flowName": "wait-flow", 
    "flowStatus": "waiting", 
    "flowState": "dialUp", 
    "uri": "/data/test-doc1.json", 
    "database":  12345,
    "modules": 12345, 
     "provenance": []
  })

erorr = null;
try {  
  erorr = sc.resumeWaitingJobByJobDoc(jobDoc, "testing", false);
} catch (e) {
  erorr = e;
}

assertions