package com.marklogic.stateconductor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.common.collect.Maps;
import com.marklogic.StateConductorService;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.ext.ConfiguredDatabaseClientFactory;
import com.marklogic.client.ext.DefaultConfiguredDatabaseClientFactory;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import com.marklogic.stateconductor.tasks.GetConfigTask;
import com.marklogic.stateconductor.tasks.GetExecutionsTask;
import com.marklogic.stateconductor.tasks.MetricsTask;
import com.marklogic.stateconductor.tasks.ProcessExecutionTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;
import java.io.FileInputStream;
import java.io.IOException;
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

  public StateConductorDriver(StateConductorDriverConfig config) {
    this.config = config;

    ConfiguredDatabaseClientFactory configuredDatabaseClientFactory = new DefaultConfiguredDatabaseClientFactory();
    client = configuredDatabaseClientFactory.newDatabaseClient(config.getDatabaseClientConfig());
    appServicesClient = configuredDatabaseClientFactory.newDatabaseClient(config.getAppServicesDatabaseClientConfig());

    service = StateConductorService.on(client);
  }

/*  public static void main(String[] args) throws DestroyFailedException, IOException {

    StateConductorDriverConfig config;

    if (args.length > 0) {
      // use the config file options
      Properties props = loadConfigProps(args[0]);
      config = StateConductorDriverConfig.newConfig(System.getenv(), Maps.fromProperties(System.getProperties()), Maps.fromProperties(props));
    } else {
      System.out.println("Usage: java -jar state-conductor-driver.jar [properties file]");
      System.out.println("missing required argument: properties file");
      return;
    }

    StateConductorDriver driver = new StateConductorDriver(config);
    Thread driverThread = new Thread(driver);
    driverThread.start();

    try {
      driverThread.join();
    } catch (InterruptedException e) {
      e.printStackTrace();
      driver.destroy();
    }
  }*/

  private static Properties loadConfigProps(String path) throws IOException {
    FileInputStream fis = new FileInputStream(path);
    Properties prop = new Properties();
    prop.load(fis);
    return prop;
  }

  @Override
  public void run() {
    logger.info("Starting StateConductorDriver...");

    // initializations
    boolean keepRunning = true;
    AtomicLong total = new AtomicLong(0);
    AtomicLong totalErrors = new AtomicLong(0);
    AtomicLong batchCount = new AtomicLong(1);
    List<String> urisBuffer = Collections.synchronizedList(new ArrayList<>());
    Set<String> inProgressSet = Collections.synchronizedSet(new HashSet<>(config.getQueueThreshold()));
    List<Future<JsonNode>> results = new ArrayList<>();
    List<Future<JsonNode>> completed = new ArrayList<>();
    List<Future<JsonNode>> errored = new ArrayList<>();

    List<String> batch = new ArrayList<>();
    List<ProcessExecutionTask> executionBuckets = new ArrayList<>();

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
    MetricsTask metricsTask = new MetricsTask(config, total, totalErrors);
    Thread metricsThread = new Thread(metricsTask);
    metricsThread.start();

    // start the thread for getting executions
    Thread getExecutionsTask = new Thread(new GetExecutionsTask(service, config, urisBuffer, inProgressSet));
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

      // submit the executions to the executor pool
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
              total.getAndIncrement();
              String executionUri = jsonNode.get("execution").asText();
              inProgressSet.remove(executionUri);
              boolean hasError = jsonNode.get("error") != null;
              if (hasError)
                errorCount.incrementAndGet();
            });
            logger.info("batch result: {} executions complete - with {} errors", arr.size(), errorCount.get());
            totalErrors.addAndGet(errorCount.get());
            completed.add(jsonNodeFuture);
          } catch (Exception e) {
            logger.error("error retrieving batch results", e);
            totalErrors.incrementAndGet();
            errored.add(jsonNodeFuture);
          }
        }
      }

      // remove any completed or errored futures
      completed.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));
      completed.clear();
      errored.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));

      logger.debug("errored: {}, in-progress: {}", errored.size(), inProgressSet.size());

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
