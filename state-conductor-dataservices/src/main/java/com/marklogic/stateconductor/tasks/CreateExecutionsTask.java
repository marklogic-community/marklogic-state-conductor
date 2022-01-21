package com.marklogic.stateconductor.tasks;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.exceptions.CreateExecutionsTaskException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.Callable;

public class CreateExecutionsTask implements Callable<List> {

  private static Logger logger = LoggerFactory.getLogger(CreateExecutionsTask.class);
  private StateConductorService service;
  private String stateMachine;
  private String database;
  private String modules;
  private List<String> targetUris;

  public CreateExecutionsTask(StateConductorService service, String stateMachine, String database, String modules, List<String> targetUris) {
    this.service = service;
    this.stateMachine = stateMachine;
    this.database = database;
    this.modules = modules;
    this.targetUris = targetUris;
  }

  @Override
  public List<String> call() throws CreateExecutionsTaskException {
    logger.info("creating batch executions for state-machine: {} [count: {}]", stateMachine, targetUris.size());
    if (logger.isDebugEnabled()) {
      logger.debug("uris: {}", targetUris.toString());
    }

    try {
      ArrayNode resp = service.createExecutions(targetUris.stream(), stateMachine, database, modules);
      // TODO we could immediately schedule these for processing
      logger.debug("CreateExecutionsTask resp: {}", resp.toPrettyString());
    } catch (Exception ex) {
      throw new CreateExecutionsTaskException(targetUris, ex);
    }

    return targetUris;
  }
}
