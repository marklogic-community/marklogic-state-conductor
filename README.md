# MarkLogic State Conductor

The _MarkLogic State Conductor_ is an event-based orchestrator for manipulating MarkLogic database documents.
State flows are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html).  State actions are defined using server-side modules.  The included driver utilizes MarkLogic's CPF and Triggers to move documents through the defined State flows.

## Usage

### Flow Files

### Flow File Scope

### Provenance

## Roadmap

* Capture error message in properties on Catch
* ml-bundle distribution
* Isolate CPF driver code from State Conductor library
* Unit Tests
* Move Job document properties into the base Job document
* Pass Job document context into Action modules
* Allow updates to the Job document context from within Action modules
* Batch support
* Rest Services
  * Flow counts
  * Document Status
  * Error Retries
* Increase ASL syntax support