# MarkLogic State Conductor Data Services Project

Provides a [Data Services](http://docs.marklogic.com/guide/java/DataServices) based driver for the _MarkLogic State Conductor_.

## Getting the Driver
Download the driver jar from the latest [Release](https://github.com/aclavio/marklogic-state-conductor/releases), or build the jar from source, or pull a prebuilt container from DockerHub:
```
docker pull aclavio/state-conductor-driver:latest
```

## Running the Driver
Create a `properties` file containing the required [configuration](#configuration) fields.
The `com.marklogic.StateConductorDriver` main class provides an implementation of a Driver which can be run stand-alone, or integrated into an existing application.

Run the stand-alone jar file:

```
java -jar state-conductor-dataservices-1.0.0.jar --config driver.properties
```

## Generating the Driver Jar

From the root of the State Conductor project, execute the `jar` task.

```
./gradlew state-conductor-dataservices:jar
```

## Generating the Proxy

The `generateStateConductorProxy` gradle task is used to generate the Java service proxy for the State Conductor.

The proxy service provides the follow functions:

- `createExecution` - creates a State Conductor Execution
- `getExecution` - returns a list of Execution documents to be processed
- `processExecution` - invokes the State Conductor processing of a exection

## Testing

From the root of the State Conductor project, execute the `mlDeploy` and `test` gradle tasks.

```
./gradlew state-conductor-dataservices:mlDeploy
./gradlew state-conductor-dataservices:test
```

## Configuring the Driver <a name="configuration"></a>
Configuration values can be provided via a `properties` file, or by utilizing Environment variables.

| Property            | Default                    | Description                                                                                                                                                                                                                                          |
| ------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mlHost              | localhost                  | A MarkLogic host to connect to. The connector uses the Data Movement SDK, and thus it will connect to each of the hosts in a cluster.                                                                                                                |
| mlPort              | 8000                       | The port of a REST API server to connect to.                                                                                                                                                                                                         |
| username            | (empty)                    | MarkLogic username                                                                                                                                                                                                                                   |
| password            | (empty)                    | MarkLogic password                                                                                                                                                                                                                                   |
| securityContextType | BASIC                      | Either DIGEST, BASIC, CERTIFICATE, KERBEROS, or NONE                                                                                                                                                                                                 |
| connectionType      | DIRECT                     | Either DIRECT, or GATEWAY                                                                                                                                                                                                                            |
| simpleSsl           | false                      | Set to "true" for a "simple" SSL strategy that uses the JVM's default SslContext and X509TrustManager and a "trust everything" HostnameVerifier.                                                                                                     |
| externalName        | (empty)                    | The external name to use to connect to MarkLogic                                                                                                                                                                                                     |
| certFile            | (empty)                    | The external name to use to connect to MarkLogic                                                                                                                                                                                                     |
| certPassword        | (empty)                    | The external name to use to connect to MarkLogic                                                                                                                                                                                                     |
| executionDatabase   | state-conductor-executions | The database where State Conductor jobs are stored                                                                                                                                                                                                   |
| names               | (empty)                    | A list of state machine names for which to process State Conductor jobs. Leave empty to process jobs from all installed flows.                                                                                                                       |
| status              | (empty)                    | A list of state machine statuses for which to process State Conductor jobs. If left empty, new jobs, working jobs, and waiting jobs will be processed.                                                                                               |
| pollSize            | 1000                       | How many jobs to fetch per poll                                                                                                                                                                                                                      |
| pollInterval        | 1000                       | (Milliseconds) How often to poll for new jobs                                                                                                                                                                                                        |
| cooldownMillis      | 5000                       | (Milliseconds) If no valid jobs are found for processing, poll using this interval.                                                                                                                                                                  |
| queueThreshold      | 20000                      | The upper limit for how many jobs the driver will cache for processing. After this limit is reached, polling for new jobs will fall back to the cooldownMillis interval, and jobs will not be added until the queue size falls below this threshold. |
| batchSize           | 5                          | How many jobs will be submitted for processing simultaneously                                                                                                                                                                                        |
| metricsInterval     | 5000                       | (Milliseconds) How often metrics should be logged                                                                                                                                                                                                    |
| fixedThreadCount    | -1                         | Use a fixed number of executor threads to process jobs on the queue if set. Overrides "threadsPerHost" and "maxThreadCount" when set.                                                                                                                |
| threadsPerHost      | 16                         | The number of executor threads used to process jobs on the queue. Scales based on the number of available MarkLogic hosts. Capped by "maxThreadCount".                                                                                               |
| maxThreadCount      | 128                        | The maximum total number of executor threads to use when processing jobs. The number of threads used will be MIN(maxThreadCount, threadsPerHost x host count).                                                                                       |
