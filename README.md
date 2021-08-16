# MarkLogic State Conductor

The _MarkLogic State Conductor (MLSC)_ allows a developer or architect to define state machines which govern how data moves through a set of [MarkLogic Data Hub](https://docs.marklogic.com/datahub/) Steps, and optionally through other custom processing actions. MLSC state machines are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html). Actions to run a DHF Step or Flow are included, and any other state actions can be defined using server-side modules.

The _State Conductor_ can be used to perform an arbitrary number of actions, in any order, and with branching or other logic based on document content, or context that is passed from state to state. Actions could include: invoking a _Data Hub_ flow, transforming a document, applying metadata, manipulating or querying side-car documents, or invoking a non-DHF process. On premise, these actions can include calling out to another process via HTTP or posting to an event queue.

The _State Conductor_ requires a [Driver](#drivers) to process documents and move them through the installed state machines' states. The _State Conductor_ supports a [Data Services](https://github.com/aclavio/marklogic-state-conductor/tree/develop/state-conductor-dataservices) driver, and a [CoRB2](https://github.com/marklogic-community/corb2) driver.

---

The _State Conductor_ allows a division of labor among different personas, where business analysts or architects analyze and define the overall flow of data through the system, developers convert that to a state machine configuration, and MarkLogic experts define the DHF Steps or other processes to perform on each state transition. Conversely, architects can define state machines which are then consumed and discussed by less-technical experts with business knowledge.

MLSC uses a variant of Amazon States Language as inspiration for the state machine definition files, so it is familiar to some AWS users and is flexible in the same ways AWS States Language is flexible.

In addition to defining a flexible set of states and transitions via state machines, MLSC ensures that the state of every record is tracked and managed via state-oriented metadata in “execution documents.”

Should you use MLSC for your project? See [Applicability](#applicability)

---

1. [Quick Start Guide](https://github.com/aclavio/marklogic-state-conductor/wiki/QUICKSTART)
2. [Installation](#installation)
3. [Usage](#usage)
4. [State Machine Definitions](#state-machine-definitions)
5. [State Machine Scope](#state-machine-scope)
6. [State Machine Actions](#state-machine-actions)
7. [Execution Documents](#execution-documents)
8. [Provenance](#provenance)
9. [Services](#services)
10. [Executions Service](#executions-service)
11. [State Machines Service](#state-machines-service)
12. [Status Service](#status-service)
13. [Drivers](#drivers)
14. [Applicability](#applicability)
15. [Roadmap](#roadmap)

---

## Installation <a name="installation"></a>

Prerequisites:

> 1. MarkLogic 10.0-6+
> 2. [ml-gradle](https://github.com/marklogic-community/ml-gradle) 3.14.0+

The _State Conductor_ is distributed as an [mlBundle](https://github.com/marklogic-community/ml-gradle/wiki/Bundles) for `ml-gradle` projects. To add the State Conductor to your project, add the following dependency to your ml-gradle project:

```groovy
dependencies {
  mlBundle "com.marklogic:marklogic-state-conductor:1.2.2"                  // to use a published version
  mlBundle files("${projectDir}/lib/marklogic-state-conductor-1.2.2.jar")   // to include locally in your project
}
```

---

## Usage <a name="usage"></a>

Any documents created or modified having the `state-conductor-item` collection will trigger processing by the _State Conductor_. They will be evaluated against the context of all installed _State Machine Definitions_. For each matching _State Machine Definition_ an `Execution` document will be created corresponding to the matching state machine and triggering document. A property will be added to the triggering document's metadata indicating the `Execution` file's id:

```xml
<state-conductor-execution stateMachine-name="state-machine-name" execution-id="ec89d520-e7ec-4b6b-ba63-7ea3a85eff02" date="2019-11-08T17:34:28.529Z" />
```

> NOTE: Document modifications during, or after the competion of a State Machine will not cause that document to be reprocessed by that same state machine. To manually run a State Machine on a document that it has already been processed by requires manual invokation of the [`Jobs Service`](#executions-service).

### State Machine Definitions <a name="state-machine-definitions"></a>

State Machine definition files define the states that documents will transition through. States can perform actions (utilizing SJS modules in MarkLogic), performing branching logic, or terminate processing. State Machine definition files are json formatted documents within the application's content database; they should have the "state-conductor-state-machine" collection, and have the ".asl.json" file extension.

Example State Machine Definition File:

```json
{
  "Comment": "sets some property values",
  "mlDomain": {
    "context": [
      {
        "scope": "directory",
        "value": "/test/"
      },
      {
        "scope": "collection",
        "value": "test"
      }
    ]
  },
  "StartAt": "set-prop1",
  "States": {
    "set-prop1": {
      "Type": "Task",
      "Comment": "initial state of the flow",
      "Resource": "/state-conductor/actions/common/examples/set-prop1.sjs",
      "Parameters": {
        "foo": "bar"
      },
      "Next": "set-prop2"
    },
    "set-prop2": {
      "Type": "Task",
      "End": true,
      "Comment": "updates a property",
      "Resource": "/state-conductor/actions/common/examples/set-prop2.sjs"
    }
  }
}
```

#### State Machine Scope <a name="state-machine-scope"></a>

State Machine Definition files must define a context within an `mlDomain` property under the definition file's root. This context defines one or more scopes for which matching documents will have this state machine automatically applied.

Example:

```json
"mlDomain": {
  "context": [
    {
      "scope": "collection",
      "value": "my-collection"
    },
    {
      "scope": "directory",
      "value": "/my/directory/"
    },
    {
      "scope": "query",
      "value": "{\"andQuery\":{\"queries\":[{\"collectionQuery\":{\"uris\":[\"test\"]}}, {\"elementValueQuery\":{\"element\":[\"name\"], \"text\":[\"John Doe\"], \"options\":[\"lang=en\"]}}]}}"
    }
  ]
}
```

Valid scopes are `collection`, `directory`, and `query`. For scopes of type `query`, the value must be a string containing the JSON serialization of a cts query.

#### State Machine Actions <a name="state-machine-actions"></a>

State machine States of the type "Task" can define actions to perform on in-process documents. These actions take the form of Server-Side Javascript modules referenced by the "Resource" property. Action modules can perform custom activities such as updating the in-process document, performing a query, invoking an external service, etc. Action modules should export a "performAction" function with the following signature:

```javascript
'use strict';

function performAction(uri, parameters = {}, context = {}) {
  // do something
}

exports.performAction = performAction;
```

Where `uri` is the document being processed by the flow; `parameters` is a json object configured via this State's "Parameters" property; and `context` contains the current in-process State Machine's context. Any data returned by the performAction function will be stored as the in-process state machine's new context object.

### Execution Documents <a name="execution-documents"></a>

For every document processed by a _State Conductor_ state machine there is a corresponding `Execution` document. Execution documents are stored in the `state-conductor-executions` database, in the `/stateConductorExecution/` folder. These documents track the in-process document, and state machine status; they also store the state machine's context and provenance information.

### Provenance <a name="provenance"></a>

Every time a document starts, stops, or transitions from one state to another within a state machine, the Provenance information stored in the Execution document is updated.

---

## Services <a name="services"></a>

The _State Conductor_ includes MarkLogic REST service extensions for managing Flow files and State Conductor Jobs.

### Executions Service <a name="executions-service"></a>

Start one or more _State Conductor_ Executions:

```
PUT /v1/resources/state-conductor-executions?rs:uris=</my/documents/uri>&rs:name=<state-machine-name>
```

Get the execution id for the given document and state machine:

```
GET /v1/resources/state-conductor-executions?rs:uri=</my/documents/uri>&rs:name=<state-machine-name>
```

### State Machine Service <a name="state-machines-service"></a>

List the installed _State Conductor_ state machines:

```
GET /v1/resources/state-conductor-state-machines?rs:name=<state-machine-name>
```

Install a _State Conductor_ State Machine definition:

```
PUT /v1/resources/state-conductor-state-machines?rs:name=<state-machine-name>
```

Remove an installed _State Conductor_ State Machine definition:

```
DELETE /v1/resources/state-conductor-state-machines?rs:name=<state-machine-name>
```

### Status Service <a name="status-service"></a>

List the status of the given _State Conductor_ State Machine:

```
GET /v1/resources/state-conductor-status?rs:name=<state-machine-name>&rs:startDate=<xs.dateTime>&rs:endDate=<xs.dateTime>
```

New (optional) temporal parameters `startDate` and `endDate` in v0.3.0.

---

## Drivers

The _State Conductor_ utilizes a "Driver" to process documents; moving them through the installed state machines' states in the prescribed order.

It is simple to “drive” MLSC:

1. Get a set of execution document URIs that represent data not yet in a final state using the `getExecutions` data service.
2. For each of these documents, make a request to the `processExecution` data service, which takes one URI and advances that execution to the next State per the DHF Step or other process.
3. Repeat this forever.

For convenience, two drivers are included: one using corb, and one written in Java that executes the above data services. The responsiblity of the Driver in MLSC is only to determine which state machines to run and with how many threads. Which Steps are run in what order, when to retry, and other logic is the province of the state machine definition itself.

Note that MLSC does not use the DHF built-in libraries as drivers to run DHF Steps. Those libraries execute each Step’s sourceQuery, and MLSC does not use sourceQuery configurations to determine what steps to run. It uses state machines, defined declaratively as JSON files. This is a rather different paradigm, which offloads much of the logic from the callers, and is why the “drivers” for MLSC are extremely simple.

For more information see [Drivers](https://github.com/aclavio/marklogic-state-conductor/wiki/Drivers).

---

## Applicability <a name="applicability"></a>

When to use the MarkLogic State Conductor?

- An overall state machine paradigm is desirable. Stakeholders are familiar with state machines, or will be able to easily understand and discuss state machines – either in their native JSON format, or as diagrams for discussion purposes. (MLSC does not automatically convert state machine configurations to graphical views, however).
- Complex flows are needed, with conditional logic, event listeners, retries, and other MLSC features.
- Real-time data is flowing into the system, and it is not natural to process data as a set of batches with batch-ids.
- Eventual migration to Amazon Step Functions, which uses Amazon States Language, is possible in the future. MLSC uses a similar format so migration to AWS later may be easier.
- Data is being processed without Data Hub Framework, so it is necessary to sequence and monitor a set of processes that are not (or are not exclusively) DHF Steps

### Comparison and Usage Guidance vs Other Tools

- Pure Data Hub Framework Processing
  - Marklogic Data Hub Framework uses a sourceQuery on every Step to “find” data from prior steps that need to be processed. These queries can be parameterized by the flowRunner or other external caller into DHF. For simple flows this works well, and is fully supported in core MarkLogic DHF and DHS. However, for complex cases it requires a lot of information in scattered places to be brought together to understand and govern the overall flow of data. MLSC consolidates all this information in one place (one or more state machine definition JSON files) and allows complex operations to be supported naturally, such as branching, conditional logic, and events.
  - Specific situations not handled naturally in DHF that may require use of MLSC include:
    - Retry of errors
    - Branching and other more complex data flows
    - Conditional logic that is difficult to build into DHF sourceQuery and metadata tagging configurations
  - Note that DHF processing using supplied DHF Java drivers includes writing certain Jobs summary data for a “batch” and this is not written by State Conductor, which is not fundamentally batch oriented
- Third party external “orchestrators” such as AWS Glue, Azure Data Factory, AWS Step Functions, MuleSoft, NiFi and others.
  - These external tools may be ideal for your use case. A case-by-case analysis is needed to evaluate use of these tools.
  - External tools can coordinate the entire data processing pipeline, including operations outside MarkLogic. E.g. an external tool might convert a proprietary format, run NLP enrichment, or virus scan content before it reaches MarkLogic, or extract and move data after it is exported from MarkLogic.
  - That said, MLSC is conceptually compatible with these other tools, and has advantages over more complex approaches:
    - MLSC is built to be cloud-neutral. Despite leveraging insights and data formats from AWS States Language, it can run anywhere.
    - MLSC is intended to be simple and efficient, without a steep learning curve.
    - MLSC is open source and free (as in beer).
    - MLSC can work with any external tool if that tool can call a MarkLogic Data Service or REST endpoint. The external tool may take the place of the supplied Java drivers (Data Services or corb) and push data through the MLSC-defined state machine as part of the external tool’s workflow.

---

## Roadmap <a name="roadmap"></a>

See [Enhancements](https://github.com/aclavio/marklogic-state-conductor/labels/enhancement)
