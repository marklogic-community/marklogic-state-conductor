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

  private Stream<String> FetchJobDocuments(int start) {
    Stream<String> jobUris = null;
    Stream<String> flowStatus = null;

    if (config.getFlowStatus() != null) {
      String[] status = config.getFlowStatus().split(",");
      flowStatus = Arrays.stream(status);
    }

    try {
      logger.info("Fetching Jobs Batch...");
      jobUris = service.getJobs(start, config.getPollSize(), config.getFlowNames(), flowStatus, null, null, null);
    } catch (Exception ex) {
      logger.error("An error occurred fetching job documents: {}", ex.getMessage());
      ex.printStackTrace();
      jobUris = Stream.empty();
    }

    return jobUris;
  }

  @Override
  public void run() {
    int start = 1;
    long emptyCount = 0;
    AtomicLong totalNew = new AtomicLong();
    AtomicLong totalFetched = new AtomicLong();

    while(true) {
      totalNew.set(0);
      totalFetched.set(0);

      if (inProgressSet.size() < config.getQueueThreshold()) {
        // grab job documents if we're below the queue threshold
        Stream<String> jobUris = FetchJobDocuments(start);
        Iterator<String> jobs = jobUris.iterator();

        synchronized (urisBuffer) {
          while(jobs.hasNext()) {
            String jobUri = jobs.next();
            totalFetched.getAndIncrement();
            if (!inProgressSet.contains(jobUri)) {
              totalNew.getAndIncrement();
              urisBuffer.add(jobUri);
              inProgressSet.add(jobUri);
            } else {
              logger.trace("got already in-progress job {}", jobUri);
            }
          }
        }

        if (totalFetched.get() != totalNew.get()) {
          logger.info("GetJobsTask got {} new jobs, out of {} total", totalNew.get(), totalFetched.get());
        } else {
          logger.info("GetJobsTask got {} new jobs", totalNew.get());
        }

        if (logger.isDebugEnabled())
          logger.debug("in progress queue size: {}", inProgressSet.size());

      } else {
        logger.info("Queued jobs limit reached!");
      }

      try {
        if (totalFetched.get() == config.getPollSize()) {
          // request next page
          start += config.getPollSize();
          emptyCount = 0;
          logger.debug("GetJobsTask requesting next page...");
          Thread.sleep(10L);
        } else {
          start = 1;
          emptyCount = (totalNew.get() == 0) ? emptyCount + 1 : 0;

          if (emptyCount > 3) {
            logger.debug("GetJobsTask cooldown...");
            Thread.sleep(config.getCooldownMillis());
          } else {
            Thread.sleep(config.getPollInterval());
          }
        }
      } catch (InterruptedException e) {
        logger.info("Stopping GetJobsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
