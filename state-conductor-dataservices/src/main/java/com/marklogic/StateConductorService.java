package com.marklogic;

// IMPORTANT: Do not edit. This file is generated.

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
            public Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus) {
              return BaseProxy.StringType.toString(
                baseProxy
                .request("getJobs.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_ATOMICS)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("count", true, BaseProxy.UnsignedIntegerType.fromInteger(count)),
                    BaseProxy.atomicParam("flowNames", true, BaseProxy.StringType.fromString(flowNames)),
                    BaseProxy.atomicParam("flowStatus", true, BaseProxy.StringType.fromString(flowStatus)))
                .withMethod("POST")
                .responseMultiple(false, null)
                );
            }


            @Override
            public Boolean processJob(String uri) {
              return BaseProxy.BooleanType.toBoolean(
                baseProxy
                .request("processJob.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC)
                .withSession()
                .withParams(
                    BaseProxy.atomicParam("uri", false, BaseProxy.StringType.fromString(uri)))
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
   * @return	as output
   */
    Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus);

  /**
   * Invokes the processing of a MarkLogic State Conductor Job
   *
   * @param uri	The uri of a State Conductor Job document to be processed
   * @return	as output
   */
    Boolean processJob(String uri);

}
