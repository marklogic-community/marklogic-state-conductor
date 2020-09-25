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

public class GetExecutionsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(GetExecutionsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private List<String> urisBuffer;
  private Set<String> inProgressSet;

  public GetExecutionsTask(StateConductorService service, StateConductorDriverConfig config, List<String> urisBuffer,
      Set<String> inProgressSet) {
    this.service = service;
    this.config = config;
    this.urisBuffer = urisBuffer;
    this.inProgressSet = inProgressSet;
  }

  private Stream<String> FetchExecutionDocuments(int start) {
    Stream<String> executionUris = null;
    Stream<String> status = null;

    if (config.getStateMachineStatus() != null) {
      String[] statusArray = config.getStateMachineStatus().split(",");
      status = Arrays.stream(statusArray);
    }

    try {
      logger.info("Fetching Executions Batch...");
      executionUris = service.getExecutions(start, config.getPollSize(), config.getStateMachineNames(), status, null, null, null);
    } catch (Exception ex) {
      logger.error("An error occurred fetching execution documents: {}", ex.getMessage());
      ex.printStackTrace();
      executionUris = Stream.empty();
    }

    return executionUris;
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
        // grab execution documents if we're below the queue threshold
        Stream<String> executionUris = FetchExecutionDocuments(start);
        Iterator<String> executions = executionUris.iterator();

        synchronized (urisBuffer) {
          while(executions.hasNext()) {
            String executionUri = executions.next();
            totalFetched.getAndIncrement();
            if (!inProgressSet.contains(executionUri)) {
              totalNew.getAndIncrement();
              urisBuffer.add(executionUri);
              inProgressSet.add(executionUri);
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
          logger.debug("in progress queue size: {}", inProgressSet.size());

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
