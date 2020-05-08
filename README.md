# MarkLogic State Conductor

The _MarkLogic State Conductor_ is an event-based orchestrator for manipulating MarkLogic database documents.
State Conductor flows are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html). State actions are defined using server-side modules. The included driver utilizes MarkLogic's CPF and Triggers to move documents through the defined State flows.

The _State Conductor_ can be used to perform an arbitrary number of context-based processing actions on a subset of documents. Actions could include: invoking a [MarkLogic Data Hub](https://docs.marklogic.com/datahub/) flow, transforming a document, applying metadata, or calling an external process.

The _State Conductor_ requires a "Driver" to process documents and move them through the installed Flows' states. The _State Conductor_ currently (release 0.4.0) supports a [CoRB2](https://github.com/marklogic-community/corb2) driver, and [CPF](https://docs.marklogic.com/guide/cpf) driver.

1. [Installation](#installation)
2. [Usage](#usage)
3. [Flow Files](#flow-files)
4. [Flow File Scope](#flow-file-scope)
5. [Flow File Actions](#flow-file-actions)
6. [Job Documents](#job-documents)
7. [Provenance](#provenance)
8. [Services](#services)
9. [Jobs Service](#jobs-service)
10. [Flows Service](#flows-service)
11. [Status Service](#status-service)
12. [Roadmap](#roadmap)

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
  mlBundle "com.marklogic:marklogic-state-conductor:0.5.1"
  mlBundle "com.marklogic:marklogic-state-conductor-cpf:0.5.1" // if using the cpf driver
}
```

The _State Conductor_ utilizes MarkLogic's Content Processing Framework. Add the following to your gradle project's properties file to ensure that the CPF configurations are installed in the required location:

```
mlCpfDatabaseName=state-conductor-triggers
```

---

## Usage <a name="usage"></a>

Any documents created or modified having the `state-conductor-item` collection will trigger processing by the _State Conductor_. They will be evaluated against the context of all installed _Flow Files_. For each matching _Flow File_ a `Job` document will be created corresponding to the matching flow and triggering document. A property will be added to the triggering document's metadata indicating the `Job` file's id:

```xml
<state-conductor-job flow-name="flow-name" job-id="ec89d520-e7ec-4b6b-ba63-7ea3a85eff02" date="2019-11-08T17:34:28.529Z" />
```

> NOTE: Document modifications during, or after the competion of a Flow will not cause that document to be reprocessed by that same flow. To run a Flow on a document that it has already been processed by requires manual invokation of the [`Jobs Service`](#jobs-service).

### Flow Files <a name="flow-files"></a>

Flow files define the states that documents will transition through. States can perform actions (utilizing SJS modules in MarkLogic), performing branching logic, or terminate processing. Flow files are json formatted documents within the application's content database; they should have the "state-conductor-flow" collection, and have the ".asl.json" file extension.

Example Flow File:

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

#### Flow File Scope <a name="flow-file-scope"></a>

Flow files must define a context within an `mlDomain` property under the flow file's root. The context defines one or more scopes for which matching documents will have this State Conductor flow automatically applied.

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

#### Flow File Actions <a name="flow-file-actions"></a>

Flow File States of the type "Task" can define actions to perform on in-process documents. These actions take the form of Server-Side Javascript modules referenced by the "Resource" property. Action modules can perform custom activities such as updating the in-process document, performing a query, invoking an external service, etc. Action modules should export a "performAction" function with the following signature:

```javascript
'use strict';

function performAction(uri, parameters = {}, context = {}) {
  // do something
}

exports.performAction = performAction;
```

Where `uri` is the document being processed by the flow; `parameters` is a json object configured via this State's Flow File "Parameters" property; and `context` contains the current in-process Flow's context. Any data returned by the performAction function will be stored in the in-process flow's context object.

### Job Documents <a name="job-documents"></a>

For every document processed by a _State Conductor_ flow there is a corresponding `Job` document. Job documents are stored in the `state-conductor-jobs` database (new in v0.3.0), in the `/stateConductorJob/` folder. These documents track the in-process document, and flow; they also store the flow's context and provenance information.

### Provenance <a name="provenance"></a>

Every time a document starts, stops, or transitions from one state to another within a Flow, the Provenance information stored in the Job document is updated.

---

## Services <a name="services"></a>

The _State Conductor_ includes MarkLogic REST service extensions for managing Flow files and State Conductor Jobs.

### Jobs Service <a name="jobs-service"></a>

Create one or more _State Conductor_ Jobs:

```
PUT /v1/resources/state-conductor-jobs?rs:uris=</my/documents/uri>&rs:flowName=<my-flow-name>
```

Get the job id for the given document and flow:

```
GET /v1/resources/state-conductor-jobs?rs:uri=</my/documents/uri>&rs:flowName=<my-flow-name>
```

### Flows Service <a name="flows-service"></a>

List the installed _State Conductor_ Flows:

```
GET /v1/resources/state-conductor-flows?rs:flowName=<my-flow-name>
```

Install a _State Conductor_ Flow:

```
PUT /v1/resources/state-conductor-flows?rs:flowName=<my-flow-name>
```

Remove an installed _State Conductor_ Flow:

```
DELETE /v1/resources/state-conductor-flows?rs:flowName=<my-flow-name>
```

### Status Service <a name="status-service"></a>

List the status of the given _State Conductor_ Flow:

```
GET /v1/resources/state-conductor-status?rs:flowName=<my-flow-name>&rs:startDate=<xs.dateTime>&rs:endDate=<xs.dateTime>
```

New (optional) temporal parameters `startDate` and `endDate` in v0.3.0.

---

## Roadmap <a name="roadmap"></a>

- 0.6.0
  - DHS support
  - Full support for Choice Rules
  - Event based flow context
  - Batch support
  - Retention Policy for job documents
  - Flush out the validator and validate flow files on deployment
  - Support for Parallel and Map states
