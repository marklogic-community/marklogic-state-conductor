# MarkLogic State Conductor Data Services Project

Provides a [Data Services](http://docs.marklogic.com/guide/java/DataServices) driver for the _MarkLogic State Conductor_.

The `generateStateConductorProxy` gradle task is used to generate the Java service proxy for the State Conductor.

The proxy service provides the follow functions:
* `createJob` - creates a State Conductor Job
* `getJobs` - returns a list of Job documents to be processed
* `processJob` - invokes the State Conductor processing of a job

The `com.marklogic.StateConductorDriver` main class provides an implemenation of a Driver which can be run stand-alone, or integrated into an existing application.
