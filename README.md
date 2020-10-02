# MarkLogic State Conductor

The _MarkLogic State Conductor_ is an event-based orchestrator for manipulating MarkLogic database documents.
State Conductor state machines are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html). Actions are defined using server-side modules. There project includes drivers and Triggers to move documents through the defined State Machines.

The _State Conductor_ can be used to perform an arbitrary number of context-based processing actions on a subset of documents. Actions could include: invoking a [MarkLogic Data Hub](https://docs.marklogic.com/datahub/) flow or step, transforming a document, applying metadata, or calling an external process.

The _State Conductor_ requires a "Driver" to process documents and move them through the installed state machine states. The _State Conductor_ supports a [Data Services](https://github.com/aclavio/marklogic-state-conductor/tree/develop/state-conductor-dataservices) driver and a [CoRB2](https://github.com/marklogic-community/corb2) driver.

1. [Quick Start Guide](https://github.com/aclavio/marklogic-state-conductor/wiki/QUICKSTART)
2. [Installation](#installation)
3. [Usage](#usage)
4. [State Machines](#state-machines)
5. [State Machine Scope](#state-machine-scope)
6. [State Machine Actions](#state-machine-actions)
7. [Execution Documents](#execution-documents)
8. [Provenance](#provenance)
9. [Services](#services)
10. [Executions Service](#execution-service)
11. [State Service](#state-machine-service)
12. [Status Service](#status-service)
13. [Roadmap](#roadmap)

## Installation <a name="installation"></a>

Prerequisites:

> 1. MarkLogic 9+
> 2. [ml-gradle](https://github.com/marklogic-community/ml-gradle) 3.14.0+

The _State Conductor_ is distributed as an [mlBundle](https://github.com/marklogic-community/ml-gradle/wiki/Bundles) for `ml-gradle` projects. To add the State Conductor to your project, add the following dependency to your ml-gradle project:

```groovy
repositories {
  maven {
    url {"https://dl.bintray.com/aclavio/maven"}
  }
}
dependencies {
  mlBundle "com.marklogic:marklogic-state-conductor:0.7.0"
}
```

## Usage <a name="usage"></a>

Any documents created or modified having the `state-conductor-item` collection will trigger processing by the _State Conductor_. They will be evaluated against the context of all installed _State Machines_. For each matching _State Machine_ an `Execution` document will be created corresponding to the matching execution and triggering document. A property will be added to the triggering document's metadata indicating the `Execution` file's id:

```xml
<state-conductor-execution state-machine-name="state-machine-name" execution-id="ec89d520-e7ec-4b6b-ba63-7ea3a85eff02" date="2019-11-08T17:34:28.529Z" />
```

> NOTE: Document modifications during, or after the competion of a State Machine will not cause that document to be reprocessed by that same state machine. To run a State Machine on a document that it has already been processed by requires manual invokation of the [`Execution Service`](#execution-service).

### State Machines <a name="state-machines"></a>

State Machine files define the states that documents will transition through. States can perform actions (utilizing SJS modules in MarkLogic), performing branching logic, or terminate processing. State Machines are json formatted documents within the application's content database; they should have the "state-conductor" collection, and have the ".asl.json" file extension.

Example State Machine File:

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
      "Comment": "initial state",
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

State Machines must define a context within an `mlDomain` property under the state machine's root. The context defines one or more scopes for which matching documents will have this State Conductor state machine automatically applied.

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

State Machine States of the type "Task" can define actions to perform on in-process documents. These actions take the form of Server-Side Javascript modules referenced by the "Resource" property. Action modules can perform custom activities such as updating the in-process document, performing a query, invoking an external service, etc. Action modules should export a "performAction" function with the following signature:

```javascript
'use strict';

function performAction(uri, parameters = {}, context = {}) {
  // do something
}

exports.performAction = performAction;
```

Where `uri` is the document being processed by the state machine; `parameters` is a json object configured via this State's "Parameters" property; and `context` contains the current in-process state machine's context. Any data returned by the performAction function will be stored in the in-process context object.

### Execution Documents <a name="execution-documents"></a>

For every document processed by a _State Conductor_ state machine there is a corresponding `Execution` document. Execution documents are stored in the `state-conductor-executions` database, in the `/execution/` folder. These documents track the in-process document, and state machine; they also store the context and provenance information.

### Provenance <a name="provenance"></a>

Every time a document starts, stops, or transitions from one state to another within a State Machine, the Provenance information stored in the Excecution document is updated.

---

## Services <a name="services"></a>

The _State Conductor_ includes MarkLogic REST service extensions for managing State Machines and State Conductor Executions.

### Execution Service <a name="execution-service"></a>

Create one or more _State Conductor_ Executions:

```
PUT /v1/resources/state-conductor-executions?rs:uris=</my/documents/uri>&rs:name=<my-name>
```

Get the execution id for the given document and state machine:

```
GET /v1/resources/state-conductor-executions?rs:uri=</my/documents/uri>&rs:name=<my-name>
```

### State Machine Service <a name="state-machine-service"></a>

List the installed _State Conductor_ State Machines:

```
GET /v1/resources/state-conductor-state-machines?rs:name=<my-name>
```

Install a _State Conductor_ State Machine:

```
PUT /v1/resources/state-conductor-state-machines?rs:name=<my-name>
```

Remove an installed _State Conductor_ State Machine:

```
DELETE /v1/resources/state-conductor-state-machines?rs:name=<my-name>
```

### Status Service <a name="status-service"></a>

List the status of the given _State Conductor_ State Machine:

```
GET /v1/resources/state-conductor-state-machines?rs:name=<my-name>&rs:startDate=<xs.dateTime>&rs:endDate=<xs.dateTime>
```

New (optional) temporal parameters `startDate` and `endDate` in v0.3.0.

---

## Roadmap <a name="roadmap"></a>

See [Enhancements](https://github.com/aclavio/marklogic-state-conductor/labels/enhancement)
