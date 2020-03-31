package com.marklogic;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.security.auth.DestroyFailedException;
import javax.security.auth.Destroyable;

public class StateConductorDriver implements Runnable, Destroyable {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriver.class);

  private DatabaseClient client;
  private StateConductorService service;

  public StateConductorDriver(DatabaseClient client) {
    this.client = client;
    service = StateConductorService.on(this.client);
  }

  public static void main(String[] args) {
    // TODO pull from args
    DatabaseClient client = DatabaseClientFactory.newClient("vm1", 8888, "state-conductor-jobs", new DatabaseClientFactory.DigestAuthContext("admin", "admin"));
    StateConductorDriver driver = new StateConductorDriver(client);
    driver.run();
    driver.destroy();
  }

  @Override
  public void run() {

  }

  @Override
  public void destroy() throws DestroyFailedException {
    if (client != null) {
      client.release();
    }
  }
}
