'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, erorr, assertion;

//checks see if the new status check is working
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "branching-flow", 
"flowStatus": "working", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": "12694575974081586379", 
"modules": "54288663922478591",
"provenance": []
})

erorr = null;

try {  
  erorr = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check working"))

//check waiting status
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "branching-flow", 
"flowStatus": "waiting", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": "12694575974081586379", 
"modules": "54288663922478591",
"provenance": []
})

erorr = null;
try {  
  erorr = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check waiting"))

//check for missing flow file
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "random-flow", 
"flowStatus": "new", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(), 
 "provenance": []
})

erorr = null;
try {  
  erorr = sc.startProcessingFlowByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("MISSING-FLOW-FILE", erorr.name, "missing flow file"))

//check for missing flow file
jobDoc = xdmp.toJSON(
    {
    "id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
    "flowName": "noStates-flow", 
    "flowStatus": "new", 
    "flowState": "find-gender", 
    "uri": "/data/test-doc3.json", 
    "database": xdmp.database(), 
    "modules": xdmp.modulesDatabase(), 
     "provenance": []
    })
    
    erorr = null;
    try {  
      erorr = sc.startProcessingFlowByJobDoc(jobDoc, false);
    } catch (e) {
      erorr = e;
    }
    
    assertions.push(test.assertEqual("INVALID-STATE-DEFINITION", erorr.name, "no StartAt step"))
    

//

//check for missing flow file
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "branching-flow", 
"flowStatus": "new", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(), 
"provenance": []
})

assertion = sc.startProcessingFlowByJobDoc(jobDoc, false);

assertions.push(test.assertEqual("working", assertion.flowStatus, "new flow"))

assertions