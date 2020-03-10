'use strict';

const sc = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let jobDoc, erorr, assertion;

//checks see the working statuts 
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "branching-flow", 
"flowStatus": "new", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": "12694575974081586379", 
"modules": "54288663922478591",
"provenance": []
})

erorr = null;

try {  
  erorr = sc.executeStateByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check working || new"))

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
  erorr = sc.executeStateByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("INVALID-FLOW-STATUS", erorr.name, "status check working || waiting"))

//checks see the working statuts 
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

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual(1, assertion.provenance.length, "provenance check"))

//checks see if there are states
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "noStates-flow", 
"flowStatus": "working", 
"flowState": "find-gender", 
"uri": "/data/test-doc3.json", 
"database": "12694575974081586379", 
"modules": "54288663922478591",
"provenance": []
})

erorr = null;

try {  
  erorr = sc.executeStateByJobDoc(jobDoc, false);
} catch (e) {
  erorr = e;
}

assertions.push(test.assertEqual("CANT-FIND-STATE", erorr.name, "status check working"))

//checks see if the context was updated with a task
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "task-flow", 
"flowStatus": "working", 
"flowState": "update-context", 
"uri": "/data/test-doc1.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(),
"provenance": []
})

assertion = sc.executeStateByJobDoc(jobDoc, false);


assertions.push(test.assertEqual("Hello Word", assertion.context["update-context"], "context check"))

//checks see if the the parameters is used
jobDoc = xdmp.toJSON(
{
"id": "0405536f-dd84-4ca6-8de8-c57062b2252d", 
"flowName": "task-flow", 
"flowStatus": "working", 
"flowState": "parameters-check", 
"uri": "/data/test-doc1.json", 
"database": xdmp.database(), 
"modules": xdmp.modulesDatabase(),
"provenance": []
})

assertion = sc.executeStateByJobDoc(jobDoc, false);


assertions.push(test.assertEqual("Hello David. Shall we play a game?", assertion.context["parameters-check"], "parameters check"))

//checks a waiting state
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

assertion = sc.executeStateByJobDoc(jobDoc, false);

assertions.push(test.assertEqual("waiting", assertion.flowStatus, "waiting flowStatus"))
assertions.push(test.assertEqual("series-of-clicks-and-beeps-connected", assertion.currentlyWaiting.event, "waiting currentlyWaiting"))

assertions