package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.common.collect.Maps;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.ext.ConfiguredDatabaseClientFactory;
import com.marklogic.client.ext.DefaultConfiguredDatabaseClientFactory;
import com.marklogic.config.StateConductorDriverConfig;
import com.marklogic.tasks.GetJobsTask;
import com.marklogic.tasks.ProcessJobTask;
import org.apache.commons.cli.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class StateConductorDriver implements Runnable, Destroyable {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriver.class);

  private StateConductorDriverConfig config;
  private DatabaseClient client;
  private StateConductorService service;

  public StateConductorDriver(DatabaseClient client, StateConductorDriverConfig config) {
    this.client = client;
    this.config = config;
    service = StateConductorService.on(this.client);
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
    Option jobsDb = new Option("db", "jobs-database", true, "Jobs Database Name");
    jobsDb.setOptionalArg(true);
    Option batch = new Option("b", "batch", true, "Batch Size");
    batch.setOptionalArg(true);
    Option config = new Option("c", "config", true, "Configuration File");
    config.setOptionalArg(true);

    opts.addOption(host);
    opts.addOption(port);
    opts.addOption(user);
    opts.addOption(pass);
    opts.addOption(num);
    opts.addOption(threads);
    opts.addOption(jobsDb);
    opts.addOption(batch);
    opts.addOption(config);

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

    if (cmd.hasOption("c")) {
      // use the config file options
      Properties props = loadConfigProps(cmd.getOptionValue("c"));
      config = StateConductorDriverConfig.newConfig(Maps.fromProperties(props));
    } else if (cmd.hasOption("h") && cmd.hasOption("p") && cmd.hasOption("u") && cmd.hasOption("x")) {
      // manually set options
      config = new StateConductorDriverConfig();
      config.setHost(cmd.getOptionValue("h"));
      config.setPort(Integer.parseInt(cmd.getOptionValue("p")));
      config.setUsername(cmd.getOptionValue("u"));
      config.setPassword(cmd.getOptionValue("x"));
      config.setJobsDatabase(cmd.getOptionValue("db"));
      if (cmd.hasOption("n")) config.setPollSize(Integer.parseInt(cmd.getOptionValue("n")));
      if (cmd.hasOption("t")) config.setThreadCount(Integer.parseInt(cmd.getOptionValue("t")));
      if (cmd.hasOption("b")) config.setBatchSize(Integer.parseInt(cmd.getOptionValue("b")));
    } else {
      // missing required args
      helpFormatter.printHelp(" ", opts);
      return;
    }

    ConfiguredDatabaseClientFactory configuredDatabaseClientFactory = new DefaultConfiguredDatabaseClientFactory();
    DatabaseClient client = configuredDatabaseClientFactory.newDatabaseClient(config.getDatabaseClientConfig());

    StateConductorDriver driver = new StateConductorDriver(client, config);
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

  private Stream<String> FetchJobDocuments() {
    Stream<String> jobUris = null;
    Stream<String> flowStatus = null;

    if (config.getFlowStatus() != null) {
      String[] status = config.getFlowStatus().split(",");
      flowStatus = Arrays.stream(status);
    }

    try {
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
    logger.info("Starting StateConductorDriver...");

    // initializations
    boolean keepRunning = true;
    List<Future<JsonNode>> results = new ArrayList<>();
    List<Future<JsonNode>> completed = new ArrayList<>();
    List<Future<JsonNode>> errored = new ArrayList<>();
    List<String> urisBuffer = Collections.synchronizedList(new ArrayList<String>());
    AtomicLong enqueued = new AtomicLong(0);
    AtomicLong total = new AtomicLong(0);
    AtomicLong batchCount = new AtomicLong(1);
    List<String> batch = new ArrayList<>();
    List<ProcessJobTask> jobBuckets = new ArrayList<>();

    // set up the thread pool
    ExecutorService pool = Executors.newFixedThreadPool(config.getThreadCount());

    // start the thread for getting jobs
    Thread getJobsTask = new Thread(new GetJobsTask(service, config, urisBuffer, enqueued));
    getJobsTask.start();

    while (keepRunning) {
      jobBuckets.clear();

      // create batches from any new buffered tasks
      synchronized (urisBuffer) {
        Iterator<String> uris = urisBuffer.iterator();

        while(uris.hasNext()) {
          String uri = uris.next();
          total.getAndIncrement();
          enqueued.getAndIncrement();
          batch.add(uri);
          if (batch.size() >= config.getBatchSize()) {
            jobBuckets.add(new ProcessJobTask(batchCount.getAndIncrement(), service, batch));
            batch = new ArrayList<>();
          }
        }

        // cleanup batch
        if (batch.size() > 0) {
          jobBuckets.add(new ProcessJobTask(batchCount.getAndIncrement(), service, batch));
          batch = new ArrayList<>();
        }

        // clear the buffer
        urisBuffer.clear();
      }

      // submit the jobs to the executor pool
      for (ProcessJobTask bucket : jobBuckets) {
        Future<JsonNode> future = pool.submit(bucket);
        results.add(future);
      }

      if (jobBuckets.size() > 0) {
        logger.info("Populated thread pool[{}] with {} batches", config.getThreadCount(), jobBuckets.size());
      }

      // process any results that have come in
      for (Future<JsonNode> jsonNodeFuture : results) {
        if (jsonNodeFuture.isDone()) {
          try {
            AtomicInteger errorCount = new AtomicInteger(0);
            ArrayNode arr = (ArrayNode) jsonNodeFuture.get();
            arr.forEach(jsonNode -> {
              enqueued.decrementAndGet();
              boolean hasError = jsonNode.get("error") != null;
              if (hasError)
                errorCount.incrementAndGet();
            });
            logger.info("batch result: {} jobs complete - with {} errors", arr.size(), errorCount.get());
            completed.add(jsonNodeFuture);
          } catch (Exception e) {
            logger.error("error retrieving batch results", e);
            errored.add(jsonNodeFuture);
          }
        }
      }

      // remove any completed or errored futures
      completed.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));
      completed.clear();
      errored.forEach(jsonNodeFuture -> results.remove(jsonNodeFuture));

      logger.debug("enqueued: {}, errored: {}", enqueued.get(), errored.size());

      try {
        Thread.sleep(10L);
      } catch (InterruptedException e) {
        // initiate a thread shutdown
        pool.shutdown();
        // stop fetching tasks
        logger.info("Stopping GetJobsTask thread...");
        getJobsTask.interrupt();
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
