package com.marklogic.stateconductor.tasks;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CreateExecutionsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(CreateExecutionsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private String stateMachine;
  private String database;
  private String modules;

  public CreateExecutionsTask(StateConductorService service, StateConductorDriverConfig config, String stateMachine, String database, String modules) {
    this.service = service;
    this.config = config;
    this.stateMachine = stateMachine;
    this.database = database;
    this.modules = modules;
  }

  @Override
  public void run() {
    int created = 0;

    while (true) {
      created = 0;

      try {
        ObjectNode resp = service.createStateMachineExecutions(stateMachine, config.getCreateExecutionsCount(), database, modules);
        created = resp.get("total").asInt();
        logger.info("Created {} executions for state-machine '{}' in database '{}'", created, stateMachine, database);
      } catch (Exception ex) {
        logger.error("An error occurred creating execution documents for state-machine '{}' in database '{}': {}", stateMachine, database, ex.getMessage());
        ex.printStackTrace();
      }

      // wait for next interval
      try {
        if (created > 0) {
          Thread.sleep(config.getCreateExecutionsInterval());
        } else {
          logger.debug("CreateExecutionsTask cooldown...");
          Thread.sleep(config.getCooldownMillis());
        }
      } catch (InterruptedException e) {
        logger.info("Stopping CreateExecutionsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
