# MarkLogic State Conductor

The _MarkLogic State Conductor_ is an event-based orchestrator for manipulating MarkLogic database documents.
State Conductor flows are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html).  State actions are defined using server-side modules.  The included driver utilizes MarkLogic's CPF and Triggers to move documents through the defined State flows.

The _State Conductor_ can be used to perform an arbitrary number of contexted based, processing actions on a subset of documents.  Actions could include: invoking a [MarkLogic Data Hub](https://docs.marklogic.com/datahub/) flow, transforming a document, applying metadata, or calling an external process.  

## Installation

_TODO_

## Usage

Any documents created or modified having the `state-conductor-item` collection will trigger processing by the _State Conductor_.  They will be evaluated against the context of all installed _Flow Files_.  For each matching _Flow File_ a Job document will be created corresponding to the matching flow and triggering document.  A property will be added to the triggering document's metadata indicating the Job file's id:
```xml
<state-conductor-job flow-name="flow-name" job-id="ec89d520-e7ec-4b6b-ba63-7ea3a85eff02" date="2019-11-08T17:34:28.529Z" />
```

### Flow Files

Flow files define the states that documents will transition through.  States can perform actions (utilizing SJS modules in MarkLogic), and performing branching logic.

### Flow File Scope

Flow files must define a context within an `mlDomain` property under the flow file's root.  The context defines one or more scopes for which matching documents will have this State Conductor flow automatically applied.

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

Valid scopes are `collection`, `directory`, and `query`.  For scopes of type `query`, the value must be a string containing the JSON serialization of a cts query.

### Jobs

_TODO_

### Provenance

_TODO_

## Services

_TODO_

### Flows

_TODO_

### Jobs

_TODO_

### Status

_TODO_

## Roadmap

* ml-bundle distribution
* Isolate CPF driver code from State Conductor library
* Unit Tests
* Move Job document properties into the base Job document
* Batch support
* Rest Services
  * Document Status
  * Error Retries
* Increase ASL syntax support