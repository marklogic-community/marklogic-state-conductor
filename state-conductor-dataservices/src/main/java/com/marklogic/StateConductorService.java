package com.marklogic;

// IMPORTANT: Do not edit. This file is generated.

import com.marklogic.client.io.Format;
import com.marklogic.client.io.marker.AbstractWriteHandle;
import java.util.stream.Stream;


import com.marklogic.client.DatabaseClient;

import com.marklogic.client.impl.BaseProxy;

/**
 * Provides a set of operations on the database server
 */
public interface StateConductorService {
    /**
     * Creates a StateConductorService object for executing operations on the database server.
     *
     * The DatabaseClientFactory class can create the DatabaseClient parameter. A single
     * client object can be used for any number of requests and in multiple threads.
     *
     * @param db	provides a client for communicating with the database server
     * @return	an object for session state
     */
    static StateConductorService on(DatabaseClient db) {
        final class StateConductorServiceImpl implements StateConductorService {
            private BaseProxy baseProxy;

            private StateConductorServiceImpl(DatabaseClient dbClient) {
                baseProxy = new BaseProxy(dbClient, "/state-conductor/dataservices/");
            }

            @Override
            public String createStateMachine(String name, com.fasterxml.jackson.databind.node.ObjectNode stateMachine) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("createStateMachine.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("name", false, BaseProxy.StringType.fromString(name)),
                    BaseProxy.documentParam("stateMachine", false, BaseProxy.ObjectType.fromObjectNode(stateMachine)))
                .withMethod("POST")
                .responseSingle(false, null)
                );
            }


            @Override
            public void deleteStateMachine(String name) {
              baseProxy
                .request("deleteStateMachine.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("name", false, BaseProxy.StringType.fromString(name)))
                .withMethod("POST")
                .responseNone();
            }


            @Override
            public Stream<String> getExecutions(Integer start, Integer count, String names, Stream<String> status, Stream<String> forestIds, String startDate, String endDate) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("getExecutions.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("start", true, BaseProxy.UnsignedIntegerType.fromInteger(start)),
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("names", true, BaseProxy.StringType.fromString(names)),
                    BaseProxy.atomicParam("status", true, BaseProxy.StringType.fromString(status)),
                    BaseProxy.atomicParam("forestIds", true, BaseProxy.StringType.fromString(forestIds)),
                    BaseProxy.atomicParam("startDate", true, BaseProxy.DateTimeType.fromString(startDate)),
                    BaseProxy.atomicParam("endDate", true, BaseProxy.DateTimeType.fromString(endDate)))
                .withMethod("POST")
                .responseMultiple(true, null)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ObjectNode getStateMachine(String name) {
              return BaseProxy.ObjectType.toObjectNode(
                baseProxy
                .request("getStateMachine.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("name", true, BaseProxy.StringType.fromString(name)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ArrayNode processExecution(Stream<String> uri) {
              return BaseProxy.ArrayType.toArrayNode(
                baseProxy
                .request("processExecution.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("uri", false, BaseProxy.StringType.fromString(uri)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ObjectNode createStateMachineExecutions(String name, Integer count, String databaseName, String modulesDatabase) {
              return BaseProxy.ObjectType.toObjectNode(
                baseProxy
                .request("createStateMachineExecutions.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("name", false, BaseProxy.StringType.fromString(name)),
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("databaseName", true, BaseProxy.StringType.fromString(databaseName)),
                    BaseProxy.atomicParam("modulesDatabase", true, BaseProxy.StringType.fromString(modulesDatabase)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ObjectNode getStateMachineStatus(Stream<String> names, String startDate, String endDate, Boolean detailed) {
              return BaseProxy.ObjectType.toObjectNode(
                baseProxy
                .request("getStateMachineStatus.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("names", true, BaseProxy.StringType.fromString(names)),
                    BaseProxy.atomicParam("startDate", true, BaseProxy.DateTimeType.fromString(startDate)),
                    BaseProxy.atomicParam("endDate", true, BaseProxy.DateTimeType.fromString(endDate)),
                    BaseProxy.atomicParam("detailed", true, BaseProxy.BooleanType.fromBoolean(detailed)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public String createExecution(String uri, String name) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("createExecution.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("uri", false, BaseProxy.StringType.fromString(uri)),
                    BaseProxy.atomicParam("name", false, BaseProxy.StringType.fromString(name)))
                .withMethod("POST")
                .responseSingle(false, null)
                );
            }


            @Override
            public Stream<String> findStateMachineTargets(String name, Integer count, String databaseName) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("findStateMachineTargets.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("name", false, BaseProxy.StringType.fromString(name)),
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("databaseName", true, BaseProxy.StringType.fromString(databaseName)))
                .withMethod("POST")
                .responseMultiple(true, null)
                );
            }

        }

        return new StateConductorServiceImpl(db);
    }

  /**
   * Creates or updates a MarkLogic State Conductor state machine definition.
   *
   * @param name	The name of the state machine to be created or updated.
   * @param stateMachine	The State Machine definition.
   * @return	The uri of the created or updated State Machine.
   */
    String createStateMachine(String name, com.fasterxml.jackson.databind.node.ObjectNode stateMachine);

  /**
   * Deletes a single state machine.
   *
   * @param name	The name of the state machine to be deleted.
   * 
   */
    void deleteStateMachine(String name);

  /**
   * Returns a list of MarkLogic State Conductor Execution document URIs
   *
   * @param start	Return records starting from this position.
   * @param count	The number of uris to return
   * @param names	A list of state machine names to filter the returned execution documents
   * @param status	A list of state machine status's to filter the returned execution documents.  Defaults to 'new' and 'working'.
   * @param forestIds	The returned list of execution documents will be limited to executions found in this list of forests.
   * @param startDate	Filter on executions created after this date and time.
   * @param endDate	Filter on executions created prior to this date and time.
   * @return	as output
   */
    Stream<String> getExecutions(Integer start, Integer count, String names, Stream<String> status, Stream<String> forestIds, String startDate, String endDate);

  /**
   * Returns a single stateMachine if name is specified or all stateMachines otherwise.
   *
   * @param name	The name of the stateMachine to return. Pass null to return all.
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ObjectNode getStateMachine(String name);

  /**
   * Invokes the processing of a MarkLogic State Conductor Execution
   *
   * @param uri	The uri of a State Conductor Execution document to be processed
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ArrayNode processExecution(Stream<String> uri);

  /**
   * Given a state machine, find and create executions for documents matching its context.
   *
   * @param name	The name of the State Machine
   * @param count	The number of executions to create
   * @param databaseName	The database of the named State Machine
   * @param modulesDatabase	The modules database that contains the named State Machine's modules
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ObjectNode createStateMachineExecutions(String name, Integer count, String databaseName, String modulesDatabase);

  /**
   * Returns the status and states of one or more State Conductor state machines.
   *
   * @param names	The state machine names for which to report status.
   * @param startDate	Filter on executions created after this date and time.
   * @param endDate	Filter on executions created prior to this date and time.
   * @param detailed	Include detailed breakdown of executions per state per status?
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ObjectNode getStateMachineStatus(Stream<String> names, String startDate, String endDate, Boolean detailed);

  /**
   * Creates a MarkLogic State Conductor Execution document for the given uri and state machine name.
   *
   * @param uri	The uri of a document to be processed by the state machine
   * @param name	The name of the State Machine
   * @return	The Execution ID of the State Conductor Execution document
   */
    String createExecution(String uri, String name);

  /**
   * Finds target documents for the given state machine.
   *
   * @param name	The name of the State Machine
   * @param count	The number of uris to return
   * @param databaseName	The database of the named State Machine
   * @return	as output
   */
    Stream<String> findStateMachineTargets(String name, Integer count, String databaseName);

}
