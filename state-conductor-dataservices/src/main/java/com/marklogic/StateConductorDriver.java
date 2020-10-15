package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.common.collect.Maps;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.ext.ConfiguredDatabaseClientFactory;
import com.marklogic.client.ext.DefaultConfiguredDatabaseClientFactory;
import com.marklogic.config.StateConductorDriverConfig;
import com.marklogic.tasks.GetConfigTask;
import com.marklogic.tasks.GetExecutionsTask;
import com.marklogic.tasks.MetricsTask;
import com.marklogic.tasks.ProcessExecutionTask;
import org.apache.commons.cli.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

  public static Options getOptions() {
    Options opts = new Options();

    Option host = new Option("h", "host", true, "MarkLogic State Conductor Host");
    host.setOptionalArg(true);
    Option port = new Option("p", "port", true, "MarkLogic State Conductor's Data Services Port");
    port.setOptionalArg(true);
    Option user = new Option("u", "username", true, "Username");
    user.setOptionalArg(true);
    Option pass = new Option("x", "password", true, "Password");
    pass.setOptionalArg(true);
    Option num = new Option("n", "number", true, "Batch size");
    num.setOptionalArg(true);
    Option threads = new Option("t", "threads", true, "Thread count");
    threads.setOptionalArg(true);
    Option executionsDb = new Option("db", "executions-database", true, "Executions Database Name");
    executionsDb.setOptionalArg(true);
    Option batch = new Option("b", "batch", true, "Batch Size");
    batch.setOptionalArg(true);
    Option config = new Option("c", "config", true, "Configuration File");
    config.setOptionalArg(true);
    Option help = new Option("?", "help", false, "Display Help");

    opts.addOption(host);
    opts.addOption(port);
    opts.addOption(user);
    opts.addOption(pass);
    opts.addOption(num);
    opts.addOption(threads);
    opts.addOption(executionsDb);
    opts.addOption(batch);
    opts.addOption(config);
    opts.addOption(help);

    return opts;
  }

  public static void main(String[] args) throws DestroyFailedException, IOException {
    CommandLineParser parser = new DefaultParser();
    HelpFormatter helpFormatter = new HelpFormatter();
    Options opts = getOptions();
    CommandLine cmd;

    try {
      cmd = parser.parse(opts, args);
    } catch (ParseException e) {
      System.out.println(e.getMessage());
      helpFormatter.printHelp(" ", opts);
      return;
    }

    StateConductorDriverConfig config;

    if (cmd.hasOption("?")) {
      helpFormatter.printHelp(" ", opts);
      return;
    } else if (cmd.hasOption("c")) {
      // use the config file options
      Properties props = loadConfigProps(cmd.getOptionValue("c"));
      config = StateConductorDriverConfig.newConfig(System.getenv(), Maps.fromProperties(System.getProperties()), Maps.fromProperties(props));
    } else {
      // manually set options
      Map<String, String> props = new HashMap<>();
      if (cmd.hasOption("h")) props.put("mlHost", cmd.getOptionValue("h"));
      if (cmd.hasOption("p")) props.put("mlPort", cmd.getOptionValue("p"));
      if (cmd.hasOption("u")) props.put("username", cmd.getOptionValue("u"));
      if (cmd.hasOption("x")) props.put("password", cmd.getOptionValue("x"));
      if (cmd.hasOption("db")) props.put("executionsDatabase", cmd.getOptionValue("db"));
      if (cmd.hasOption("n")) props.put("pollSize", cmd.getOptionValue("n"));
      if (cmd.hasOption("t")) props.put("threadCount", cmd.getOptionValue("t"));
      if (cmd.hasOption("b")) props.put("batchSize", cmd.getOptionValue("b"));
      config = StateConductorDriverConfig.newConfig(System.getenv(), Maps.fromProperties(System.getProperties()), props);
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
  }

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
  }
}
