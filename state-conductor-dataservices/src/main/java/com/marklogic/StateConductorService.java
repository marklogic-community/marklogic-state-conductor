package com.marklogic;

// IMPORTANT: Do not edit. This file is generated.

import java.util.stream.Stream;
import com.marklogic.client.io.Format;
import com.marklogic.client.io.marker.AbstractWriteHandle;


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
            public Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus, Stream<String> forestIds) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("getJobs.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("flowNames", true, BaseProxy.StringType.fromString(flowNames)),
                    BaseProxy.atomicParam("flowStatus", true, BaseProxy.StringType.fromString(flowStatus)),
                    BaseProxy.atomicParam("forestIds", true, BaseProxy.StringType.fromString(forestIds)))
                .withMethod("POST")
                .responseMultiple(true, null)
                );
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
            public String createFlow(com.fasterxml.jackson.databind.node.ObjectNode input, String flowName) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("createFlow.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED)
                .withSession()
                .withParams(
                    BaseProxy.documentParam("input", false, BaseProxy.ObjectType.fromObjectNode(input)),
                    BaseProxy.atomicParam("flowName", false, BaseProxy.StringType.fromString(flowName)))
                .withMethod("POST")
                .responseSingle(false, null)
                );
            }

        }

        return new StateConductorServiceImpl(db);
    }

  /**
   * Returns a list of MarkLogic State Conductor Job document URIs
   *
   * @param count	The number of uris to return
   * @param flowNames	A list of flow names to filter the returned job documents
   * @param flowStatus	A list of flow status's to filter the returned job documents.  Defaults to 'new' and 'working'.
   * @param forestIds	The returned list of job documents will be limited to jobs found in this list of forests.
   * @return	as output
   */
    Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus, Stream<String> forestIds);

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
   * Creates a MarkLogic State Conductor flow document using a given input and flowName
   *
   * @param input	The input for the flow
   * @param flowName	The name of the State Conductor Flow
   * @return	The uri of the flow document created
   */
    String createFlow(com.fasterxml.jackson.databind.node.ObjectNode input, String flowName);

}
