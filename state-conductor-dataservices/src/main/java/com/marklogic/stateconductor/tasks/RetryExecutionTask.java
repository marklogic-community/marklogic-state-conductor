package com.marklogic.stateconductor.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.exceptions.RetryExecutionTaskException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.concurrent.Callable;

public class RetryExecutionTask implements Callable<JsonNode> {

  Logger logger = LoggerFactory.getLogger(RetryExecutionTask.class);

  private Integer attempts;
  private StateConductorService service;
  private String executionUri;

  public RetryExecutionTask(StateConductorService service, String executionUri) {
    this(service, executionUri, 0);
  }

  public RetryExecutionTask(StateConductorService service, String executionUri, Integer attempts) {
    this.attempts = attempts;
    this.service = service;
    this.executionUri = executionUri;
  }

  @Override
  public JsonNode call() throws RetryExecutionTaskException {
    attempts = attempts + 1;
    logger.info("retrying execution: {} [attempt: {}]", executionUri, attempts);
    try {
      return service.processExecution(Arrays.stream(new String[] { executionUri }));
    } catch (Exception ex) {
      throw new RetryExecutionTaskException(executionUri, attempts, ex);
    }
  }

  public Integer getAttempts() {
    return attempts;
  }

  public String getExecutionUri() {
    return executionUri;
  }
}
