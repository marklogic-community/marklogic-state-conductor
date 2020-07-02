package com.marklogic.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.StateConductorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.Callable;

public class ProcessJobTask implements Callable<JsonNode> {

  Logger logger = LoggerFactory.getLogger(ProcessJobTask.class);

  private Long id;
  private StateConductorService service;
  private List<String> jobUris;

  public ProcessJobTask(Long id, StateConductorService service, List<String> jobUris) {
    this.id = id;
    this.service = service;
    this.jobUris = jobUris;
  }

  @Override
  public JsonNode call() throws Exception {
    logger.info("processing batch job: {} [size: {}]", id, jobUris.size());
    if (logger.isDebugEnabled()) {
      logger.debug("uris: {}", jobUris.toString());
    }
    return service.processJob(jobUris.stream());
  }
}
