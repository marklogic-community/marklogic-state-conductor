package com.marklogic.stateconductor.tasks;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.FailedRequestException;
import com.marklogic.client.eval.EvalResultIterator;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicInteger;

public class GetConfigTask implements Runnable {

  private static final Logger logger = LoggerFactory.getLogger(GetConfigTask.class);

  static final String HOSTS_QUERY = "xdmp.hosts()";
  static final String ACTIVE_HOSTS_QUERY = "xdmp.hosts().toArray().map(id => fn.head(xdmp.hostStatus(id))).filter(status => !status.error)";

  DatabaseClient client;
  StateConductorDriverConfig config;
  ThreadPoolExecutor pool;

  Integer currHosts;
  Integer maxPoolSize;


  public GetConfigTask(DatabaseClient client, StateConductorDriverConfig config, ThreadPoolExecutor pool, int initialThreads) {
    this.client = client;
    this.config = config;
    this.pool = pool;
    this.currHosts = 1;
    this.maxPoolSize = initialThreads;
  }

  protected void setMaximumPoolSize(int size) {
    synchronized (pool) {
      pool.setMaximumPoolSize(size);
    }
  }

  @Override
  public void run() {
    currHosts = 1;

    while (true) {

      try {
        EvalResultIterator result = client.newServerEval().javascript(ACTIVE_HOSTS_QUERY).eval();
        AtomicInteger hostCount = new AtomicInteger(0);

        result.forEach(evalResult -> {
          hostCount.incrementAndGet();
        });

        logger.info("DETECTED {} ACTIVE HOST(S)", hostCount.get());
        if (currHosts != hostCount.get()) {
          currHosts = hostCount.get();

          if (!config.useFixedThreadCount()) {
            maxPoolSize = Math.min(config.getProperties().getMaxThreadCount(), currHosts * config.getProperties().getThreadsPerHost());
            logger.info("Scaling to {} threads!", maxPoolSize);
            setMaximumPoolSize(maxPoolSize);
          }
        }
      } catch (FailedRequestException e) {
        logger.error("Error requesting host count.", e);
      }

      if (config.useFixedThreadCount()) {
        logger.info("FIXED THREAD POOL SIZE: {}", config.getProperties().getFixedThreadCount());
      } else {
        logger.info("THREAD POOL SIZE: {}", maxPoolSize);
      }

      try {
        Thread.sleep(60000);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
      }
    }
  }

}
