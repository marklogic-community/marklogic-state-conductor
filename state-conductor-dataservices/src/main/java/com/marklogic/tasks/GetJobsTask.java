package com.marklogic.tasks;

import com.marklogic.StateConductorService;
import com.marklogic.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class GetJobsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(GetJobsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private List<String> urisBuffer;
  private AtomicLong enqueued;

  public GetJobsTask(StateConductorService service, StateConductorDriverConfig config, List<String> urisBuffer, AtomicLong enqueued) {
    this.service = service;
    this.config = config;
    this.urisBuffer = urisBuffer;
    this.enqueued = enqueued;
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

      if (enqueued.get() < config.getQueueThreshold()) {
        // grab job documents
        Stream<String> jobUris = FetchJobDocuments();
        Iterator<String> jobs = jobUris.iterator();

        synchronized (urisBuffer) {
          while(jobs.hasNext()) {
            total.getAndIncrement();
            urisBuffer.add(jobs.next());
          }
        }

        logger.info("GetJobsTask got {} jobs", total.get());

      } else {
        logger.info("Queued jobs limit reached!");
      }

      try {
        // cooldown period
        if (0 == total.get()) {
          logger.debug("GetJobsTask cooldown...");
          Thread.sleep(config.getCooldownMillis());
        } else {
          Thread.sleep(10L);
        }
      } catch (InterruptedException e) {
        logger.info("Stopping GetJobsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
