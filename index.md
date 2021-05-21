# MarkLogic State Conductor

The _MarkLogic State Conductor (MLSC)_ allows a developer or architect to define state machines which govern how data moves through a set of [MarkLogic Data Hub](https://docs.marklogic.com/datahub/) Steps, and optionally through other custom processing actions. MLSC state machines are defined using a subset of [Amazon States Language (ASL)](https://states-language.net/spec.html). Actions to run a DHF Step or Flow are included, and any other state actions can be defined using server-side modules.

The _State Conductor_ can be used to perform an arbitrary number of actions, in any order, and with branching or other logic based on document content, or context that is passed from state to state. Actions could include: invoking a _Data Hub_ flow, transforming a document, applying metadata, manipulating or querying side-car documents, or invoking a non-DHF process. On premise, these actions can include calling out to another process via HTTP or posting to an event queue.

The _State Conductor_ requires a [Driver](#drivers) to process documents and move them through the installed state machines' states. The _State Conductor_ supports a [Data Services](https://github.com/aclavio/marklogic-state-conductor/tree/develop/state-conductor-dataservices) driver, and a [CoRB2](https://github.com/marklogic-community/corb2) driver.
