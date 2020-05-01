package com.marklogic;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.FailedRequestException;
import com.marklogic.client.eval.EvalResultIterator;
import org.apache.commons.cli.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class ForestSplitsStateConductorDriver implements Runnable, Destroyable {

  private static Logger logger = LoggerFactory.getLogger(ForestSplitsStateConductorDriver.class);

  private DatabaseClient client;
  private StateConductorService service;
  private Integer batchSize;
  private String forestId;

  public ForestSplitsStateConductorDriver(DatabaseClient client, Integer batchSize, String forestId) {
    this.client = client;
    this.batchSize = batchSize;
    this.forestId = forestId;
    service = StateConductorService.on(this.client);
  }

  public static Options getOptions() {
    Options opts = new Options();

    Option host = new Option("h", "host", true, "MarkLogic State Conductor Host");
    host.setRequired(true);
    Option port = new Option("p", "port", true, "MarkLogic State Conductor's Data Services Port");
    port.setRequired(true);
    Option user = new Option("u", "username", true, "Username");
    user.setRequired(true);
    Option pass = new Option("x", "password", true, "Password");
    pass.setRequired(true);
    Option num = new Option("n", "number", true, "Batch size");
    num.setOptionalArg(true);
    Option jobsDb = new Option("db", "jobs-database", true, "Jobs Database Name");

    opts.addOption(host);
    opts.addOption(port);
    opts.addOption(user);
    opts.addOption(pass);
    opts.addOption(num);
    opts.addOption(jobsDb);

    return opts;
  }

  public static String[] getForestIds(DatabaseClient client, String databaseName) {
   EvalResultIterator result = client.newServerEval().javascript("xdmp.databaseForests(xdmp.database(\"" + databaseName + "\"), false)").eval();
   List<String> ids = new ArrayList<>();
   while (result.hasNext()) {
     ids.add(result.next().getString());
   }
   return ids.stream().toArray(String[]::new);
  }

  public static void main(String[] args) throws DestroyFailedException {
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

    DatabaseClient client = DatabaseClientFactory.newClient(
      cmd.getOptionValue("h"),
      Integer.parseInt(cmd.getOptionValue("p")),
      new DatabaseClientFactory.DigestAuthContext(cmd.getOptionValue("u"), cmd.getOptionValue("x")));

    DatabaseClient appServicesClient = DatabaseClientFactory.newClient(
      cmd.getOptionValue("h"), 8000,
      new DatabaseClientFactory.DigestAuthContext(cmd.getOptionValue("u"), cmd.getOptionValue("x")));

    int batchSize = 100;
    if (cmd.hasOption("n")) {
      batchSize = Integer.parseInt(cmd.getOptionValue("n"));
    }

    String jobsDbName = "state-conductor-jobs";
    if (cmd.hasOption("db")) {
      jobsDbName = cmd.getOptionValue("db");
    }

    String[] forestIds = getForestIds(appServicesClient, jobsDbName);
    logger.info("Making splits for {} State Conductor Jobs forests", forestIds.length);
    logger.trace("Jobs forests: {}", String.join(",", forestIds));

    ExecutorService pool = Executors.newFixedThreadPool(forestIds.length);
    for (String id : forestIds) {
      pool.execute(new ForestSplitsStateConductorDriver(client, batchSize, id));
    }

    while (true) {
      try {
        if (pool.awaitTermination(Integer.MAX_VALUE, TimeUnit.MINUTES)) {
          break;
        }
      } catch (InterruptedException e) {
        logger.info("Stopping StateConductorDriver pool executor...");
        pool.shutdownNow();
        Thread.currentThread().interrupt();
        break;
      }
    }
  }

  @Override
  public void run() {
    logger.info("[Forest {}] Starting StateConductorDriver...", forestId);
    List<String> forestIds = new ArrayList<>();
    forestIds.add(forestId);

    while (true) {
      AtomicLong count = new AtomicLong();
      AtomicLong failed = new AtomicLong();

      // grab any "new" and "working" jobs
      Stream<String> jobUris = service.getJobs(batchSize, null, null, forestIds.stream());

      // process each of the jobs
      jobUris.forEach(uri -> {
        logger.info("processing job: {}", uri);
        count.getAndIncrement();
        try {
          service.processJob(Arrays.stream(new String[]{uri}));
        } catch (FailedRequestException ex) {
          failed.getAndIncrement();
          logger.error("error processing job:", ex);
        }
      });

      logger.info("[Forest {}] Processed {} Jobs, with {} Failures.", forestId, count.get(), failed.get());

      try {
        if (0 == count.get())
          Thread.sleep(5000L);
        else
          Thread.sleep(10L);
      } catch (InterruptedException e) {
        logger.info("[Forest {}] Stopping StateConductorDriver...", forestId);
        return;
      }
    }
  }

  @Override
  public void destroy() throws DestroyFailedException {
    if (client != null) {
      client.release();
    }
  }
}
