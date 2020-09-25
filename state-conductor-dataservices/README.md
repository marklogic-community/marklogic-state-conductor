# MarkLogic State Conductor Data Services Project

Provides a [Data Services](http://docs.marklogic.com/guide/java/DataServices) based driver for the _MarkLogic State Conductor_.

## Running the Driver
Download the driver jar from the latest [Release](https://github.com/aclavio/marklogic-state-conductor/releases), or build the jar from source.  Create a `properties` file containing the required [configuration](#configuration) fields.

The `com.marklogic.StateConductorDriver` main class provides an implementation of a Driver which can be run stand-alone, or integrated into an existing application.

Run the stand-alone jar file:
```
java -jar state-conductor-dataservices-0.6.1.jar --config driver.properties
```

## Generating the Driver Jar

From the root of the State Conductor project, execute the `jar` task.

```
./gradlew state-conductor-dataservices:jar
```

## Generating the Proxy
The `generateStateConductorProxy` gradle task is used to generate the Java service proxy for the State Conductor.

The proxy service provides the follow functions:
* `createExecution` - creates a State Conductor Execution
* `getExecution` - returns a list of Execution documents to be processed
* `processExecution` - invokes the State Conductor processing of a exection

## Testing
From the root of the State Conductor project, execute the `mlDeploy` and `test` gradle tasks.

```
./gradlew state-conductor-dataservices:mlDeploy
./gradlew state-conductor-dataservices:test
```

## Configuring the Driver <a name="configuration"></a>

| Property | Default | Description |
| --- | --- | --- |
| mlHost | localhost | A MarkLogic host to connect to. The connector uses the Data Movement SDK, and thus it will connect to each of the hosts in a cluster. |
| mlPort | 8000 | The port of a REST API server to connect to. |
| username | (empty) | MarkLogic username |
| password | (empty) | MarkLogic password |
| securityContextType | BASIC | Either DIGEST, BASIC, CERTIFICATE, KERBEROS, or NONE |
| connectionType | DIRECT | Either DIRECT, or GATEWAY |
| simpleSsl | false | Set to "true" for a "simple" SSL strategy that uses the JVM's default SslContext and X509TrustManager and a "trust everything" HostnameVerifier. |
| externalName | (empty) | The external name to use to connect to MarkLogic |
| certFile | (empty) | The external name to use to connect to MarkLogic |
| certPassword | (empty) | The external name to use to connect to MarkLogic |
| executionDatabase | state-conductor-executions | The database where State Conductor executions are stored |
| names | (empty) | A list of state machine names for which to process State Conductor executions.  Leave empty to process executions from all installed state machines. |
| status | (empty) | A list of state machine statuses for which to process State Conductor executions.  If left empty, new executions, working executions, and waiting executions will be processed. |
| pollSize | 1000 | How many executions to fetch per poll |
| pollInterval | 1000 | (Milliseconds) How often to poll for new executions |
| cooldownMillis | 5000 | (Milliseconds) If no valid executions are found for processing, poll using this interval. |
| queueThreshold | 20000 | The upper limit for how many executions the driver will cache for processing.  After this limit is reached, polling for new executions will fall back to the cooldownMillis interval, and executions will not be added until the queue size falls below this threshold.  |
| batchSize | 5 | How many executions will be submitted for processing simultaneously |
| threadCount | 10 | The number of executor threads used to process executions on the queue.  Scale based on the number of available App Server threads for optimal performance. |
| metricsInterval | 5000 | (Milliseconds) How often metrics should be logged |

