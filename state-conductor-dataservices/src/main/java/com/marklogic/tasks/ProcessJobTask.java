package com.marklogic.tasks;

import com.marklogic.StateConductorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Callable;

public class ProcessJobTask implements Callable<Boolean> {

  Logger logger = LoggerFactory.getLogger(ProcessJobTask.class);

  private StateConductorService service;
  private String jobUri;

  public ProcessJobTask(StateConductorService service, String jobUri) {
    this.service = service;
    this.jobUri = jobUri;
  }

  @Override
  public Boolean call() throws Exception {
    logger.info("processing job: {}", jobUri);
    return service.processJob(jobUri);
  }
}
