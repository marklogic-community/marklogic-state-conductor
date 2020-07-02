package com.marklogic.tasks;

import com.marklogic.StateConductorService;
import com.marklogic.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class GetJobsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(GetJobsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private List<String> urisBuffer;
  private Set<String> inProgressSet;

  public GetJobsTask(StateConductorService service, StateConductorDriverConfig config, List<String> urisBuffer, Set<String> inProgressSet) {
    this.service = service;
    this.config = config;
    this.urisBuffer = urisBuffer;
    this.inProgressSet = inProgressSet;
  }

  private Stream<String> FetchJobDocuments() {
    Stream<String> jobUris = null;
    Stream<String> flowStatus = null;

    if (config.getFlowStatus() != null) {
      String[] status = config.getFlowStatus().split(",");
      flowStatus = Arrays.stream(status);
    }

    try {
      logger.info("Fetching Jobs Batch...");
      jobUris = service.getJobs(config.getPollSize(), config.getFlowNames(), flowStatus, null);
    } catch (Exception ex) {
      logger.error("An error occurred fetching job documents: {}", ex.getMessage());
      ex.printStackTrace();
      jobUris = Stream.empty();
    }

    return jobUris;
  }

  @Override
  public void run() {
    AtomicLong total = new AtomicLong();

    while(true) {
      total.set(0);

      if (inProgressSet.size() < config.getQueueThreshold()) {
        // grab job documents if we're below the queue threshold
        Stream<String> jobUris = FetchJobDocuments();
        Iterator<String> jobs = jobUris.iterator();

        synchronized (urisBuffer) {
          while(jobs.hasNext()) {
            String jobUri = jobs.next();
            if (!inProgressSet.contains(jobUri)) {
              total.getAndIncrement();
              urisBuffer.add(jobUri);
              inProgressSet.add(jobUri);
            } else {
              logger.debug("got already in-progress job {}", jobUri);
            }
          }
        }

        logger.info("GetJobsTask got {} jobs", total.get());

      } else {
        logger.info("Queued jobs limit reached!");
      }

      try {
        // cooldown period
        if (total.get() < config.getPollSize()) {
          logger.debug("GetJobsTask cooldown...");
          Thread.sleep(config.getCooldownMillis());
        } else {
          Thread.sleep(config.getPollInterval());
        }
      } catch (InterruptedException e) {
        logger.info("Stopping GetJobsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
