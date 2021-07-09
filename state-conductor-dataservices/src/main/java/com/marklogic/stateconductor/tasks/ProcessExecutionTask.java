package com.marklogic.stateconductor.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.exceptions.ProcessExecutionTaskException;
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
  public JsonNode call() throws ProcessExecutionTaskException {
    logger.info("processing batch execution: {} [size: {}]", id, executionUris.size());
    if (logger.isDebugEnabled()) {
      logger.debug("uris: {}", executionUris.toString());
    }
    try {
      return service.processExecution(executionUris.stream());
    } catch (Exception ex) {
      throw new ProcessExecutionTaskException(id, executionUris, ex);
    }
  }

  public Long getId() {
    return id;
  }

  public List<String> getExecutionUris() {
    return executionUris;
  }
}
