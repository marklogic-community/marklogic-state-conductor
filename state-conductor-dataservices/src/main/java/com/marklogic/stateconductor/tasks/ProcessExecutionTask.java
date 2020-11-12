package com.marklogic.stateconductor.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.StateConductorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.Callable;

public class ProcessExecutionTask implements Callable<JsonNode> {

  Logger logger = LoggerFactory.getLogger(ProcessExecutionTask.class);

  private Long id;
  private StateConductorService service;
  private List<String> executionUris;

  public ProcessExecutionTask(Long id, StateConductorService service, List<String> executionUris) {
    this.id = id;
    this.service = service;
    this.executionUris = executionUris;
  }

  @Override
  public JsonNode call() throws Exception {
    logger.info("processing batch execution: {} [size: {}]", id, executionUris.size());
    if (logger.isDebugEnabled()) {
      logger.debug("uris: {}", executionUris.toString());
    }
    return service.processExecution(executionUris.stream());
  }
}
