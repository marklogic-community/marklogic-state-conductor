package com.marklogic.stateconductor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.StateConductorService;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.ext.ConfiguredDatabaseClientFactory;
import com.marklogic.client.ext.DefaultConfiguredDatabaseClientFactory;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import com.marklogic.stateconductor.exceptions.ProcessExecutionTaskException;
import com.marklogic.stateconductor.exceptions.RetryExecutionTaskException;
import com.marklogic.stateconductor.tasks.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class StateConductorDriver implements Runnable, Destroyable {

  private final static Logger logger = LoggerFactory.getLogger(StateConductorDriver.class);

  private StateConductorDriverConfig config;
  private DatabaseClient client;
  private DatabaseClient appServicesClient;
  private StateConductorService service;

  AtomicLong total = new AtomicLong(0);
  AtomicLong totalErrors = new AtomicLong(0);

  public StateConductorDriver(StateConductorDriverConfig config) {
    this.config = config;

    ConfiguredDatabaseClientFactory configuredDatabaseClientFactory = new DefaultConfiguredDatabaseClientFactory();
    client = configuredDatabaseClientFactory.newDatabaseClient(config.getDatabaseClientConfig());
    appServicesClient = configuredDatabaseClientFactory.newDatabaseClient(config.getAppServicesDatabaseClientConfig());

    service = StateConductorService.on(client);
  }

  @Override
  public void run() {
    logger.info("Starting StateConductorDriver...");

    // initializations
    boolean keepRunning = true;
    AtomicLong batchCount = new AtomicLong(1);
    List<String> urisBuffer = Collections.synchronizedList(new ArrayList<>());
    Map<String, LocalDateTime> inProgressMap = Collections.synchronizedMap(new HashMap<>(config.getQueueThreshold()));
    List<Future<JsonNode>> results = new ArrayList<>();
    List<Future<JsonNode>> completed = new ArrayList<>();
    List<Future<JsonNode>> errored = new ArrayList<>();

    List<String> batch = new ArrayList<>();
    List<ProcessExecutionTask> executionBuckets = new ArrayList<>();
    List<RetryExecutionTask> retryBuckets = new ArrayList<>();

    // set up the thread pool
    int initialThreads = config.getThreadsPerHost();
    if (config.useFixedThreadCount())
      initialThreads = config.getFixedThreadCount();
    ThreadPoolExecutor pool = new ThreadPoolExecutor(initialThreads, initialThreads, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue());

    // start the getConfig thread
    GetConfigTask configTask = new GetConfigTask(appServicesClient, config, pool, initialThreads);
    Thread configThread = new Thread(configTask);
    configThread.start();

    // start the metrics thread
    MetricsTask metricsTask = new MetricsTask(config, total, totalErrors, pool, inProgressMap);
    Thread metricsThread = new Thread(metricsTask);
    metricsThread.start();

    // start the thread for getting executions
    Thread getExecutionsTask = new Thread(new GetExecutionsTask(service, config, urisBuffer, inProgressMap));
    getExecutionsTask.start();

    while (keepRunning) {
      executionBuckets.clear();

      // create batches from any new buffered tasks
      synchronized (urisBuffer) {
        Iterator<String> uris = urisBuffer.iterator();

        while(uris.hasNext()) {
          String uri = uris.next();
          batch.add(uri);
          if (batch.size() >= config.getBatchSize()) {
            executionBuckets.add(new ProcessExecutionTask(batchCount.getAndIncrement(), service, batch));
            batch = new ArrayList<>();
          }
        }

        // cleanup batch
        if (batch.size() > 0) {
          executionBuckets.add(new ProcessExecutionTask(batchCount.getAndIncrement(), service, batch));
          batch = new ArrayList<>();
        }

        // clear the buffer
        urisBuffer.clear();
      }

      // submit any retry tasks to the executor pool
      for (RetryExecutionTask bucket : retryBuckets) {
        Future<JsonNode> future = pool.submit(bucket);
        results.add(future);
      }
      if (retryBuckets.size() > 0) {
        logger.info("Populated thread pool with {} retry tasks", retryBuckets.size());
      }
      retryBuckets.clear();

      // submit the batch tasks to the executor pool
      for (ProcessExecutionTask bucket : executionBuckets) {
        Future<JsonNode> future = pool.submit(bucket);
        results.add(future);
      }
      if (executionBuckets.size() > 0) {
        logger.info("Populated thread pool with {} batches", executionBuckets.size());
      }

      // process any results that have come in
      for (Future<JsonNode> jsonNodeFuture : results) {
        if (jsonNodeFuture.isDone()) {
          try {
            AtomicInteger errorCount = new AtomicInteger(0);
            ArrayNode arr = (ArrayNode) jsonNodeFuture.get();
            arr.forEach(jsonNode -> {
              if (logger.isDebugEnabled()) {
                logger.debug("execution result: {}", jsonNode.toPrettyString());
              }
              total.getAndIncrement();
              String executionUri = jsonNode.get("execution").asText();
              inProgressMap.remove(executionUri);
              JsonNode errorNode = jsonNode.get("error");
              if (errorNode != null) {
                errorCount.incrementAndGet();
                logger.warn("error processing execution {}: {}", executionUri, errorNode.toString());
              }
            });
            logger.info("batch result: {} executions complete - with {} errors", arr.size(), errorCount.get());
            totalErrors.addAndGet(errorCount.get());
            completed.add(jsonNodeFuture);
          } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof RetryExecutionTaskException) {
              RetryExecutionTaskException rex = (RetryExecutionTaskException)cause;
              logger.error("error processing retry execution: {} attempt {}", rex.getExecutionUri(), rex.getAttempts(), rex);
              if (rex.getAttempts() < config.getRetryCount()) {
                // if we have attempts left then retry
                retryBuckets.add(new RetryExecutionTask(service, rex.getExecutionUri(), rex.getAttempts()));
              } else {
                // otherwise remove from the in progress queue
                logger.info("no more attempts left for execution: {}", rex.getExecutionUri());
                inProgressMap.remove(rex.getExecutionUri());
              }
              totalErrors.incrementAndGet();
            } else if (cause instanceof ProcessExecutionTaskException) {
              ProcessExecutionTaskException pex = (ProcessExecutionTaskException)cause;
              logger.error("error processing batch execution: {} uris: {}", pex.getId(), pex.getExecutionUris(), pex);
              totalErrors.addAndGet(pex.getExecutionUris().size());
              // retry these errored executions
              for (String uri : pex.getExecutionUris()) {
                retryBuckets.add(new RetryExecutionTask(service, uri));
              }
            } else {
              logger.error("error retrieving batch results", e);
              totalErrors.incrementAndGet();
            }
            errored.add(jsonNodeFuture);
          }
        }
      }

      // remove any completed or errored futures
      completed.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));
      completed.clear();
      errored.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));

      logger.trace("errored: {}, in-progress: {}, tasks: {}", errored.size(), inProgressMap.size(), pool.getQueue().size());

      try {
        Thread.sleep(10L);
      } catch (InterruptedException e) {
        // initiate a thread shutdown
        pool.shutdown();
        // stop fetching tasks
        logger.info("Stopping GetExecutionsTask thread...");
        getExecutionsTask.interrupt();
        metricsThread.interrupt();
        configThread.interrupt();
        // stop main loop
        keepRunning = false;
      }
    }

    // terminate the processing pool
    try {
      logger.info("Awaiting Batch Completion...");
      if (pool.awaitTermination(Integer.MAX_VALUE, TimeUnit.MINUTES)) {
        logger.info("pool executor terminated.");
        results.clear();
      }
      // final metrics report
      metricsTask.generateReport();
    } catch (InterruptedException e) {
      logger.info("Stopping StateConductorDriver pool executor...");
      pool.shutdownNow();
      Thread.currentThread().interrupt();
    }
  }

  @Override
  public void destroy() throws DestroyFailedException {
    if (client != null) {
      client.release();
    }
    if (appServicesClient != null) {
      appServicesClient.release();
    }
  }
}
