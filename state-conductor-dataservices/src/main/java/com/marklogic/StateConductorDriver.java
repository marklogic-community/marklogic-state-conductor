package com.marklogic;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.FailedRequestException;
import org.apache.commons.cli.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class StateConductorDriver implements Runnable, Destroyable {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriver.class);

  private DatabaseClient client;
  private StateConductorService service;
  private Integer batchSize;

  public StateConductorDriver(DatabaseClient client, Integer batchSize) {
    this.client = client;
    this.batchSize = batchSize;
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

    opts.addOption(host);
    opts.addOption(port);
    opts.addOption(user);
    opts.addOption(pass);
    opts.addOption(num);

    return opts;
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

    int batchSize = 100;
    if (cmd.hasOption("n")) {
      batchSize = Integer.parseInt(cmd.getOptionValue("n"));
    }

    StateConductorDriver driver = new StateConductorDriver(client, batchSize);

    Thread thread = new Thread(driver);

    try {
      thread.start();
      thread.join();
    } catch (InterruptedException e) {
      e.printStackTrace();
    } finally {
      driver.destroy();
    }
  }

  @Override
  public void run() {
    logger.info("Starting StateConductorDriver...");

    while (true) {
      AtomicLong count = new AtomicLong();
      AtomicLong failed = new AtomicLong();

      // grab any "new" and "working" jobs
      Stream<String> jobUris = service.getJobs(batchSize, null, null);

      // process each of the jobs
      jobUris.forEach(uri -> {
        logger.info("processing job: {}", uri);
        count.getAndIncrement();
        try {
          service.processJob(uri);
        } catch (FailedRequestException ex) {
          failed.getAndIncrement();
          logger.error("error processing job:", ex);
        }
      });

      logger.info("Processed {} Jobs, with {} Failures.", count.get(), failed.get());

      try {
        if (0 == count.get())
          Thread.sleep(5000L);
        else
          Thread.sleep(10L);
      } catch (InterruptedException e) {
        logger.info("Stopping StateConductorDriver...");
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
