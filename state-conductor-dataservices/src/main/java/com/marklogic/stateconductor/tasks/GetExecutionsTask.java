package com.marklogic.stateconductor.tasks;

import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class GetExecutionsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(GetExecutionsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private List<String> urisBuffer;
  private Map<String, LocalDateTime> inProgressMap;

  public GetExecutionsTask(StateConductorService service, StateConductorDriverConfig config, List<String> urisBuffer,
      Map<String, LocalDateTime> inProgressMap) {
    this.service = service;
    this.config = config;
    this.urisBuffer = urisBuffer;
    this.inProgressMap = inProgressMap;
  }

  private Stream<String> FetchExecutionDocuments(int start) {
    Stream<String> executionUris = null;
    Stream<String> status = null;

    if (config.getStatus() != null && config.getStatus().length() > 0) {
      String[] statusArray = config.getStatus().split(",");
      status = Arrays.stream(statusArray);
    }

    try {
      logger.info("Fetching Executions Batch...");
      executionUris = service.getExecutions(start, config.getPollSize(), config.getNames(), status, null, null, null);
    } catch (Exception ex) {
      logger.error("An error occurred fetching execution documents: {}", ex.getMessage());
      ex.printStackTrace();
      executionUris = Stream.empty();
    }

    return executionUris;
  }

  private void purgeExpiredExecutions() {
    List<String> oldExecutions = new ArrayList<>();
    synchronized (inProgressMap) {
      LocalDateTime oldDate = LocalDateTime.now().minusSeconds(config.getExpiredExecutionsSeconds());
      Iterator<String> keys = inProgressMap.keySet().iterator();
      while (keys.hasNext()) {
        String key = keys.next();
        LocalDateTime fetchedTime = inProgressMap.get(key);
        if (fetchedTime.isBefore(oldDate)) {
          oldExecutions.add(key);
          logger.info("GetExecutionsTask aged out old execution: {}", key);
        }
      }
      oldExecutions.forEach(uri -> inProgressMap.remove(uri));
      oldExecutions.clear();
    }
  }

  @Override
  public void run() {
    int start = 1;
    long emptyCount = 0;
    LocalDateTime now;
    AtomicLong totalNew = new AtomicLong();
    AtomicLong totalFetched = new AtomicLong();

    while(true) {
      totalNew.set(0);
      totalFetched.set(0);
      now = LocalDateTime.now();

      // age out any "old" in-progress executions - allows them to be retried
      purgeExpiredExecutions();

      if (inProgressMap.size() < config.getQueueThreshold()) {
        // grab execution documents if we're below the queue threshold
        Stream<String> executionUris = FetchExecutionDocuments(start);
        Iterator<String> executions = executionUris.iterator();

        synchronized (urisBuffer) {
          while(executions.hasNext()) {
            String executionUri = executions.next();
            totalFetched.getAndIncrement();
            if (!inProgressMap.containsKey(executionUri)) {
              totalNew.getAndIncrement();
              urisBuffer.add(executionUri);
              inProgressMap.put(executionUri, now);
            } else {
              logger.trace("got already in-progress execution {}", executionUri);
            }
          }
        }

        if (totalFetched.get() != totalNew.get()) {
          logger.info("GetExecutionsTask got {} new executions, out of {} total", totalNew.get(), totalFetched.get());
        } else {
          logger.info("GetExecutionsTask got {} new executions", totalNew.get());
        }

        if (logger.isDebugEnabled())
          logger.debug("in progress queue size: {}", inProgressMap.size());

      } else {
        logger.info("Queued executions limit reached!");
      }

      try {
        if (totalFetched.get() == config.getPollSize()) {
          // request next page
          start += config.getPollSize();
          emptyCount = 0;
          logger.debug("GetExecutionsTask requesting next page...");
          Thread.sleep(10L);
        } else {
          start = 1;
          emptyCount = (totalNew.get() == 0) ? emptyCount + 1 : 0;

          if (emptyCount > 3) {
            logger.debug("GetExecutionsTask cooldown...");
            Thread.sleep(config.getCooldownMillis());
          } else {
            Thread.sleep(config.getPollInterval());
          }
        }
      } catch (InterruptedException e) {
        logger.info("Stopping GetExecutionsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
