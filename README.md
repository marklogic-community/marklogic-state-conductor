# MarkLogic State Conductor

The _MarkLogic State Conductor_ is an event-based orchestrator for manipulating MarkLogic database documents.
State Conductor flows are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html).  State actions are defined using server-side modules.  The included driver utilizes MarkLogic's CPF and Triggers to move documents through the defined State flows.

## Usage

Any documents created or modified having the `state-conductor-item` collection will be evaluated against the context of all installed _Flow Files_.  For each matching _Flow File_ a Job document will be created corresponding to the matching flow and triggering document.  A property will be added to the triggering document's metadata indicating the Job file's id:
```xml
<state-conductor-job flow-name="flow-name" job-id="ec89d520-e7ec-4b6b-ba63-7ea3a85eff02" date="2019-11-08T17:34:28.529Z" />
```

### Flow Files

Flow files define the states that documents will transition through.  States can perform actions (utilizing SJS modules in MarkLogic), and performing branching logic.

### Flow File Scope

### Provenance

## Services

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