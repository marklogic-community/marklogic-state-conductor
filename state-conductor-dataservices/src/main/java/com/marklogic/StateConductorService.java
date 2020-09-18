package com.marklogic;

// IMPORTANT: Do not edit. This file is generated.

import java.util.stream.Stream;
import com.marklogic.client.io.Format;
import com.marklogic.client.io.marker.AbstractWriteHandle;
import java.io.Reader;


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
            public Stream<String> getJobs(Integer start, Integer count, String flowNames, Stream<String> flowStatus, Stream<String> forestIds, String startDate, String endDate) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("getJobs.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("start", true, BaseProxy.UnsignedIntegerType.fromInteger(start)),
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("flowNames", true, BaseProxy.StringType.fromString(flowNames)),
                    BaseProxy.atomicParam("flowStatus", true, BaseProxy.StringType.fromString(flowStatus)),
                    BaseProxy.atomicParam("forestIds", true, BaseProxy.StringType.fromString(forestIds)),
                    BaseProxy.atomicParam("startDate", true, BaseProxy.DateTimeType.fromString(startDate)),
                    BaseProxy.atomicParam("endDate", true, BaseProxy.DateTimeType.fromString(endDate)))
                .withMethod("POST")
                .responseMultiple(true, null)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ObjectNode getFlow(String flowName) {
              return BaseProxy.ObjectType.toObjectNode(
                baseProxy
                .request("getFlow.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("flowName", true, BaseProxy.StringType.fromString(flowName)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public void deleteFlow(String flowName) {
              baseProxy
                .request("deleteFlow.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("flowName", false, BaseProxy.StringType.fromString(flowName)))
                .withMethod("POST")
                .responseNone();
            }


            @Override
            public String createJob(String uri, String flowName) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("createJob.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("uri", false, BaseProxy.StringType.fromString(uri)),
                    BaseProxy.atomicParam("flowName", false, BaseProxy.StringType.fromString(flowName)))
                .withMethod("POST")
                .responseSingle(false, null)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ArrayNode processJob(Stream<String> uri) {
              return BaseProxy.ArrayType.toArrayNode(
                baseProxy
                .request("processJob.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("uri", false, BaseProxy.StringType.fromString(uri)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public com.fasterxml.jackson.databind.node.ObjectNode getFlowStatus(Stream<String> flowNames, String startDate, String endDate, Boolean detailed) {
              return BaseProxy.ObjectType.toObjectNode(
                baseProxy
                .request("getFlowStatus.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("flowNames", true, BaseProxy.StringType.fromString(flowNames)),
                    BaseProxy.atomicParam("startDate", true, BaseProxy.DateTimeType.fromString(startDate)),
                    BaseProxy.atomicParam("endDate", true, BaseProxy.DateTimeType.fromString(endDate)),
                    BaseProxy.atomicParam("detailed", true, BaseProxy.BooleanType.fromBoolean(detailed)))
                .withMethod("POST")
                .responseSingle(false, Format.JSON)
                );
            }


            @Override
            public void insertFlow(String flowName, Reader flow) {
              baseProxy
                .request("insertFlow.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("flowName", false, BaseProxy.StringType.fromString(flowName)),
                    BaseProxy.documentParam("flow", false, BaseProxy.ObjectType.fromReader(flow)))
                .withMethod("POST")
                .responseNone();
            }

        }

        return new StateConductorServiceImpl(db);
    }

  /**
   * Returns a list of MarkLogic State Conductor Job document URIs
   *
   * @param start	Return records starting from this position.
   * @param count	The number of uris to return
   * @param flowNames	A list of flow names to filter the returned job documents
   * @param flowStatus	A list of flow status's to filter the returned job documents.  Defaults to 'new' and 'working'.
   * @param forestIds	The returned list of job documents will be limited to jobs found in this list of forests.
   * @param startDate	Filter on jobs created after this date and time.
   * @param endDate	Filter on jobs created prior to this date and time.
   * @return	as output
   */
    Stream<String> getJobs(Integer start, Integer count, String flowNames, Stream<String> flowStatus, Stream<String> forestIds, String startDate, String endDate);

  /**
   * Returns a single flow if flowName is specified or all flows otherwise.
   *
   * @param flowName	The name of the flow to return. Pass null to return all.
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ObjectNode getFlow(String flowName);

  /**
   * Deletes a single flow.
   *
   * @param flowName	The name of the flow to be created or updated.
   * 
   */
    void deleteFlow(String flowName);

  /**
   * Creates a MarkLogic State Conductor Job document for the given uri and flow.
   *
   * @param uri	The uri of a document to be processed by the flow
   * @param flowName	The name of the State Conductor Flow
   * @return	The Job ID of the State Conductor Job document
   */
    String createJob(String uri, String flowName);

  /**
   * Invokes the processing of a MarkLogic State Conductor Job
   *
   * @param uri	The uri of a State Conductor Job document to be processed
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ArrayNode processJob(Stream<String> uri);

  /**
   * Returns the status and states of one or more State Conductor flows.
   *
   * @param flowNames	The flow names for which to report status.
   * @param startDate	Filter on jobs created after this date and time.
   * @param endDate	Filter on jobs created prior to this date and time.
   * @param detailed	Include detailed breakdown of jobs per state per status?
   * @return	as output
   */
    com.fasterxml.jackson.databind.node.ObjectNode getFlowStatus(Stream<String> flowNames, String startDate, String endDate, Boolean detailed);

  /**
   * Creates or updates a single flow.
   *
   * @param flowName	The name of the flow to be created or updated.
   * @param flow	The flow to be created or updated.
   * 
   */
    void insertFlow(String flowName, Reader flow);

}
